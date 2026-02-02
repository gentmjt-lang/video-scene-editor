// silence_detector.js - 音频静音检测模块
/**
 * 智能静音检测和剪辑
 * 自动识别视频中的静音段落并删除
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const FFMPEG =
  process.platform === "win32"
    ? "D:\\WorkSpace\\ffmpeg\\bin\\ffmpeg.exe"
    : "ffmpeg";

/**
 * 检测视频中的静音段落
 * @param {string} videoPath - 视频文件路径
 * @param {number} noiseThreshold - 噪音阈值 (dB), 默认 -30
 * @param {number} minDuration - 最短静音时长 (秒), 默认 0.5
 * @returns {Array} 静音时间段数组 [{start, end, duration}]
 */
function detectSilence(videoPath, noiseThreshold = -30, minDuration = 0.5) {
  console.log(
    `[Detecting] Silence segments (threshold: ${noiseThreshold}dB, min: ${minDuration}s)...`,
  );

  const cmd = `${FFMPEG} -i "${videoPath}" -af "silencedetect=noise=${noiseThreshold}dB:d=${minDuration}" -f null - 2>&1`;
  const output = execSync(cmd, { encoding: "utf-8", stdio: "pipe" });

  const silenceStarts = [];
  const silenceEnds = [];

  // 解析 silencedetect 输出
  const startMatches = output.matchAll(/silence_start: ([\d.]+)/g);
  const endMatches = output.matchAll(/silence_end: ([\d.]+)/g);

  for (const match of startMatches) {
    silenceStarts.push(parseFloat(match[1]));
  }

  for (const match of endMatches) {
    silenceEnds.push(parseFloat(match[1]));
  }

  // 合并为时间段
  const segments = [];
  for (let i = 0; i < silenceStarts.length; i++) {
    const start = silenceStarts[i];
    const end = silenceEnds[i] || null; // 可能视频在静音中结束
    const duration = end ? end - start : null;

    segments.push({
      start,
      end,
      duration,
      type: "silence",
    });
  }

  console.log(`[OK] Found ${segments.length} silence segments`);
  return segments;
}

/**
 * 删除静音段落，只保留有声部分
 * @param {string} videoPath - 输入视频
 * @param {string} outputFile - 输出文件
 * @param {number} noiseThreshold - 噪音阈值
 * @param {number} minDuration - 最短静音时长
 * @param {number} padding - 保留静音前后的缓冲时间 (秒)
 */
function removeSilence(
  videoPath,
  outputFile,
  noiseThreshold = -30,
  minDuration = 0.5,
  padding = 0.1,
) {
  console.log(
    `\n[Processing] Removing silence from ${path.basename(videoPath)}...`,
  );

  // 1. 检测静音
  const silenceSegments = detectSilence(videoPath, noiseThreshold, minDuration);

  if (silenceSegments.length === 0) {
    console.log("[INFO] No silence detected, copying original file");
    fs.copyFileSync(videoPath, outputFile);
    return outputFile;
  }

  // 2. 获取视频时长
  const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
  const totalDuration = parseFloat(
    execSync(durationCmd, { encoding: "utf-8" }).trim(),
  );

  // 3. 计算有声段落（静音的补集）
  const audioSegments = [];
  let currentTime = 0;

  for (const silence of silenceSegments) {
    if (silence.start > currentTime) {
      // 添加有声段落（加上padding避免截断）
      audioSegments.push({
        start: currentTime,
        end: Math.min(silence.start + padding, silence.end),
        duration: silence.start - currentTime + padding,
      });
    }
    currentTime = Math.max(silence.end - padding, silence.start);
  }

  // 添加最后一段（如果有）
  if (currentTime < totalDuration) {
    audioSegments.push({
      start: currentTime,
      end: totalDuration,
      duration: totalDuration - currentTime,
    });
  }

  console.log(`[OK] Will keep ${audioSegments.length} audio segments`);

  // 4. 提取并合并有声段落
  const tempFiles = [];

  audioSegments.forEach((seg, i) => {
    const tempFile = `temp_audio_${i}.mp4`;
    tempFiles.push(tempFile);

    const cmd = `${FFMPEG} -y -ss ${seg.start} -i "${videoPath}" -t ${seg.duration} -c copy -avoid_negative_ts make_zero "${tempFile}"`;
    execSync(cmd, { stdio: "pipe" });
    console.log(
      `  Extracted segment ${i + 1}: ${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s`,
    );
  });

  // 5. 合并所有段落
  const listContent = tempFiles.map((f) => `file '${f}'`).join("\n");
  fs.writeFileSync("audio_merge_list.txt", listContent);

  const mergeCmd = `${FFMPEG} -y -f concat -safe 0 -i audio_merge_list.txt -c copy "${outputFile}"`;
  execSync(mergeCmd, { stdio: "pipe" });

  // 6. 清理临时文件
  tempFiles.forEach((f) => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
  if (fs.existsSync("audio_merge_list.txt"))
    fs.unlinkSync("audio_merge_list.txt");

  const originalDuration = totalDuration;
  const newDuration = audioSegments.reduce((sum, seg) => sum + seg.duration, 0);
  const savedTime = originalDuration - newDuration;
  const compressionRatio = ((savedTime / originalDuration) * 100).toFixed(1);

  console.log(`\n[OK] Silence removal complete!`);
  console.log(`  Original: ${originalDuration.toFixed(2)}s`);
  console.log(`  New: ${newDuration.toFixed(2)}s`);
  console.log(`  Saved: ${savedTime.toFixed(2)}s (${compressionRatio}%)`);
  console.log(`  Output: ${outputFile}`);

  return outputFile;
}

/**
 * 可视化静音段落（生成带标记的视频）
 * @param {string} videoPath - 输入视频
 * @param {string} outputFile - 输出文件
 */
function visualizeSilence(videoPath, outputFile) {
  const silenceSegments = detectSilence(videoPath);

  // 使用 FFmpeg drawbox 滤镜标记静音段落
  let filterComplex = "";

  silenceSegments.forEach((seg, i) => {
    // 在静音时间段添加红色半透明遮罩
    filterComplex += `drawbox=x=0:y=0:w=iw:h=ih:color=red@0.3:t=${seg.start}-${seg.end}:enable='between(t,${seg.start},${seg.end})'`;
    if (i < silenceSegments.length - 1) {
      filterComplex += ",";
    }
  });

  const cmd = `${FFMPEG} -y -i "${videoPath}" -vf "${filterComplex}" -c:a copy "${outputFile}"`;
  execSync(cmd, { stdio: "pipe" });

  console.log(`[OK] Visualization saved: ${outputFile}`);
  return outputFile;
}

// 导出模块
module.exports = {
  detectSilence,
  removeSilence,
  visualizeSilence,
};

// 命令行使用
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const videoPath = args[1];

  if (!command || !videoPath) {
    console.log("Usage:");
    console.log(
      "  node silence_detector.js detect <video.mp4> [threshold] [minDuration]",
    );
    console.log(
      "  node silence_detector.js remove <video.mp4> [output.mp4] [threshold]",
    );
    console.log(
      "  node silence_detector.js visualize <video.mp4> [output.mp4]",
    );
    process.exit(1);
  }

  switch (command) {
    case "detect": {
      const threshold = parseFloat(args[2]) || -30;
      const minDur = parseFloat(args[3]) || 0.5;
      const segments = detectSilence(videoPath, threshold, minDur);
      console.log("\nSilence segments:");
      segments.forEach((seg, i) => {
        console.log(
          `  ${i + 1}. ${seg.start.toFixed(2)}s - ${seg.end ? seg.end.toFixed(2) + "s" : "end"} (${seg.duration ? seg.duration.toFixed(2) + "s" : "unknown"})`,
        );
      });
      break;
    }
    case "remove": {
      const output = args[2] || "no_silence_" + path.basename(videoPath);
      const threshold = parseFloat(args[3]) || -30;
      removeSilence(videoPath, output, threshold);
      break;
    }
    case "visualize": {
      const output = args[2] || "silence_marked_" + path.basename(videoPath);
      visualizeSilence(videoPath, output);
      break;
    }
    default:
      console.log("Unknown command:", command);
  }
}
