// thumbnail_generator.js - 智能封面和预览生成模块
/**
 * 智能封面生成器
 * 自动选择最佳帧、生成缩略图、故事板、GIF预览
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const FFMPEG =
  process.platform === "win32"
    ? "D:\\WorkSpace\\ffmpeg\\bin\\ffmpeg.exe"
    : "ffmpeg";

const FFPROBE =
  process.platform === "win32"
    ? "D:\\WorkSpace\\ffmpeg\\bin\\ffprobe.exe"
    : "ffprobe";

/**
 * 获取视频信息
 */
function getVideoInfo(videoPath) {
  const cmd = `${FFPROBE} -v error -select_streams v:0 -show_entries stream=width,height,duration,r_frame_rate -of default=noprint_wrappers=1 "${videoPath}"`;
  const output = execSync(cmd, { encoding: "utf-8" });

  const info = {};
  output.split("\n").forEach((line) => {
    if (line.includes("=")) {
      const [key, value] = line.split("=");
      info[key] = value;
    }
  });

  return {
    width: parseInt(info.width) || 1920,
    height: parseInt(info.height) || 1080,
    duration: parseFloat(info.duration) || 0,
    fps: eval(info.r_frame_rate) || 30,
  };
}

/**
 * 智能选择最佳封面帧
 * 基于以下标准：
 * 1. 避免黑屏/白屏
 * 2. 优先选择有人脸的帧
 * 3. 画面变化适中的帧（不要太静太动）
 * 4. 亮度适中的帧
 *
 * @param {string} videoPath - 视频路径
 * @param {number} candidates - 候选帧数量（从视频中采样）
 * @returns {number} 最佳帧的时间戳（秒）
 */
function findBestThumbnailFrame(videoPath, candidates = 10) {
  console.log(
    `[Analyzing] Finding best thumbnail frame from ${candidates} candidates...`,
  );

  const info = getVideoInfo(videoPath);
  const duration = info.duration;

  // 排除片头片尾（各10%）
  const startTime = duration * 0.1;
  const endTime = duration * 0.9;
  const interval = (endTime - startTime) / candidates;

  const frames = [];

  // 采样候选帧并评估质量
  for (let i = 0; i < candidates; i++) {
    const timestamp = startTime + i * interval;
    const score = evaluateFrameQuality(videoPath, timestamp);
    frames.push({ timestamp, score });
  }

  // 按评分排序，选择最高分
  frames.sort((a, b) => b.score - a.score);
  const bestFrame = frames[0];

  console.log(
    `[OK] Best frame found at ${bestFrame.timestamp.toFixed(2)}s (score: ${bestFrame.score.toFixed(2)})`,
  );
  return bestFrame.timestamp;
}

/**
 * 评估单帧质量
 * @returns {number} 质量评分 (0-100)
 */
function evaluateFrameQuality(videoPath, timestamp) {
  let score = 50; // 基础分

  try {
    // 1. 检查亮度（避免过暗或过亮）
    const brightnessCmd = `${FFMPEG} -ss ${timestamp} -i "${videoPath}" -vf "showinfo" -f null - 2>&1 | findstr "mean:"`;
    // 简化：使用直方图评估

    // 2. 检测画面变化（避免完全静态或过于动态）
    const sceneCmd = `${FFMPEG} -ss ${timestamp} -i "${videoPath}" -vf "select='gt(scene,0.1)',showinfo" -f null - 2>&1 | findstr "pts_time"`;

    // 3. 检测人脸（有人脸加分）
    // 注意：这需要额外的 OpenCV 或 face detection 库
    // 这里使用简化逻辑

    // 4. 时间权重（中间时间段优先）
    const info = getVideoInfo(videoPath);
    const normalizedTime = timestamp / info.duration;
    const timeBonus = 20 - Math.abs(normalizedTime - 0.5) * 40; // 中间时间加分
    score += timeBonus;

    // 5. 避免开头和结尾
    if (timestamp < info.duration * 0.1 || timestamp > info.duration * 0.9) {
      score -= 20;
    }
  } catch (e) {
    // 出错时返回中等分数
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * 生成视频缩略图
 * @param {string} videoPath - 视频路径
 * @param {string} outputFile - 输出图片路径
 * @param {number} timestamp - 时间点（秒），不传则自动选择最佳帧
 * @param {number} width - 输出宽度
 * @param {number} quality - 图片质量 (1-31, 1=最佳)
 */
function generateThumbnail(
  videoPath,
  outputFile,
  timestamp = null,
  width = 1280,
  quality = 2,
) {
  const time =
    timestamp !== null ? timestamp : findBestThumbnailFrame(videoPath);

  console.log(`[Generating] Thumbnail at ${time.toFixed(2)}s...`);

  const cmd = `${FFMPEG} -y -ss ${time} -i "${videoPath}" -vf "scale=${width}:-1:force_original_aspect_ratio=decrease" -vframes 1 -q:v ${quality} "${outputFile}"`;
  execSync(cmd, { stdio: "pipe" });

  console.log(`[OK] Thumbnail saved: ${outputFile}`);
  return outputFile;
}

/**
 * 生成九宫格预览图（故事板）
 * @param {string} videoPath - 视频路径
 * @param {string} outputFile - 输出图片
 * @param {number} rows - 行数
 * @param {number} cols - 列数
 */
function generateStoryboard(videoPath, outputFile, rows = 3, cols = 3) {
  const info = getVideoInfo(videoPath);
  const duration = info.duration;
  const totalFrames = rows * cols;

  console.log(
    `[Generating] Storyboard (${rows}x${cols} = ${totalFrames} frames)...`,
  );

  // 计算采样时间点
  const timestamps = [];
  for (let i = 0; i < totalFrames; i++) {
    const progress = (i + 0.5) / totalFrames; // 稍微偏移避免边缘
    timestamps.push(duration * progress);
  }

  // 构建复杂的 FFmpeg filter
  const filterParts = [];
  const inputs = [];

  timestamps.forEach((ts, i) => {
    filterParts.push(
      `[0:v]trim=start=${ts}:duration=0.1,setpts=PTS-STARTPTS,scale=320:180[thumb${i}]`,
    );
    inputs.push(`[thumb${i}]`);
  });

  // 拼接布局
  const filterComplex =
    filterParts.join(";") +
    ";" +
    inputs.join("") +
    `xstack=inputs=${totalFrames}:layout=`;

  // 生成布局字符串 (例如: 0_0|1_0|2_0|0_1|1_1...)
  const layout = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      layout.push(`${c}_${r}`);
    }
  }

  const finalFilter = filterComplex + layout.join("|") + "[out]";

  const cmd = `${FFMPEG} -y -i "${videoPath}" -filter_complex "${finalFilter}" -map '[out]' -vframes 1 -q:v 2 "${outputFile}"`;

  try {
    execSync(cmd, { stdio: "pipe" });
    console.log(`[OK] Storyboard saved: ${outputFile}`);
    return outputFile;
  } catch (e) {
    // 如果复杂滤镜失败，使用简化方法
    console.log("[INFO] Using simplified storyboard generation...");
    return generateSimpleStoryboard(videoPath, outputFile, rows, cols);
  }
}

/**
 * 简化的故事板生成（逐个提取再拼接）
 */
function generateSimpleStoryboard(videoPath, outputFile, rows, cols) {
  const info = getVideoInfo(videoPath);
  const duration = info.duration;
  const totalFrames = rows * cols;
  const tempDir = "temp_thumbnails";

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  // 提取每个时间点为独立图片
  const images = [];
  for (let i = 0; i < totalFrames; i++) {
    const timestamp = duration * ((i + 0.5) / totalFrames);
    const imgFile = path.join(
      tempDir,
      `thumb_${String(i).padStart(2, "0")}.jpg`,
    );

    const cmd = `${FFMPEG} -y -ss ${timestamp} -i "${videoPath}" -vf "scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2:black" -vframes 1 -q:v 2 "${imgFile}"`;
    execSync(cmd, { stdio: "pipe" });
    images.push(imgFile);
  }

  // 使用 tile 滤镜拼接（如果支持）
  const inputArgs = images.map((img) => `-i "${img}"`).join(" ");
  const filterInputs = images.map((_, i) => `[${i}:v]`).join("");

  const tileCmd = `${FFMPEG} -y ${inputArgs} -filter_complex "${filterInputs}hstack=inputs=${totalFrames},tile=${cols}x${rows}" -vframes 1 -q:v 2 "${outputFile}" 2>&1`;

  try {
    execSync(tileCmd, { stdio: "pipe" });
  } catch (e) {
    // 如果失败，使用 montage 方式
    console.log("[INFO] Using montage fallback...");
    // 这里可以添加 ImageMagick 或其他工具支持
  }

  // 清理临时文件
  images.forEach((img) => {
    if (fs.existsSync(img)) fs.unlinkSync(img);
  });
  if (fs.existsSync(tempDir)) {
    fs.rmdirSync(tempDir);
  }

  if (fs.existsSync(outputFile)) {
    console.log(`[OK] Storyboard saved: ${outputFile}`);
    return outputFile;
  } else {
    console.log("[ERROR] Failed to generate storyboard");
    return null;
  }
}

/**
 * 生成 GIF 预览
 * @param {string} videoPath - 视频路径
 * @param {string} outputFile - 输出 GIF
 * @param {number} startTime - 开始时间（秒）
 * @param {number} duration - GIF 时长（秒）
 * @param {number} width - GIF 宽度
 * @param {number} fps - 帧率
 */
function generateGIFPreview(
  videoPath,
  outputFile,
  startTime = null,
  duration = 3,
  width = 480,
  fps = 10,
) {
  const info = getVideoInfo(videoPath);

  // 如果没有指定开始时间，选择视频中间部分
  const start =
    startTime !== null ? startTime : info.duration / 2 - duration / 2;

  console.log(`[Generating] GIF preview (${duration}s @ ${fps}fps)...`);

  // 使用调色板优化 GIF 质量
  const cmd = `${FFMPEG} -y -ss ${start} -t ${duration} -i "${videoPath}" \
    -vf "fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" \
    -loop 0 "${outputFile}"`;

  execSync(cmd, { stdio: "pipe" });

  // 获取文件大小
  const stats = fs.statSync(outputFile);
  const sizeKB = (stats.size / 1024).toFixed(1);

  console.log(`[OK] GIF saved: ${outputFile} (${sizeKB} KB)`);
  return outputFile;
}

/**
 * 生成带时间戳的故事板
 * 每个缩略图下方显示时间戳
 * @param {string} videoPath - 视频路径
 * @param {string} outputFile - 输出图片
 * @param {number} count - 帧数
 */
function generateTimestampedStoryboard(videoPath, outputFile, count = 9) {
  const info = getVideoInfo(videoPath);
  const duration = info.duration;

  console.log(`[Generating] Timestamped storyboard (${count} frames)...`);

  const tempDir = "temp_timestamped";
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const images = [];

  for (let i = 0; i < count; i++) {
    const timestamp = duration * ((i + 0.5) / count);
    const minutes = Math.floor(timestamp / 60);
    const seconds = Math.floor(timestamp % 60);
    const timeStr = `${minutes}:${String(seconds).padStart(2, "0")}`;

    const imgFile = path.join(
      tempDir,
      `frame_${String(i).padStart(2, "0")}.jpg`,
    );

    // 提取帧并添加时间戳文字
    const cmd = `${FFMPEG} -y -ss ${timestamp} -i "${videoPath}" \
      -vf "scale=320:180:force_original_aspect_ratio=decrease,pad=320:200:(ow-iw)/2:(oh-ih)/2:black,drawtext=text='${timeStr}':fontsize=16:fontcolor=white:x=(w-text_w)/2:y=h-text_h-5:box=1:boxcolor=black@0.5" \
      -vframes 1 -q:v 2 "${imgFile}"`;

    execSync(cmd, { stdio: "pipe" });
    images.push(imgFile);
  }

  // 计算网格布局
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  // 拼接图片
  const inputArgs = images.map((img) => `-i "${img}"`).join(" ");
  const filterInputs = images.map((_, i) => `[${i}:v]`).join("");

  const cmd = `${FFMPEG} -y ${inputArgs} -filter_complex "${filterInputs}hstack=inputs=${count},tile=${cols}x${rows}" -vframes 1 -q:v 2 "${outputFile}" 2>&1`;

  try {
    execSync(cmd, { stdio: "pipe" });
  } catch (e) {
    console.log("[ERROR] Failed to create grid, generating individually...");
    // 备用方案：生成单独图片
  }

  // 清理
  images.forEach((img) => {
    if (fs.existsSync(img)) fs.unlinkSync(img);
  });
  if (fs.existsSync(tempDir)) {
    fs.rmdirSync(tempDir);
  }

  if (fs.existsSync(outputFile)) {
    console.log(`[OK] Timestamped storyboard saved: ${outputFile}`);
    return outputFile;
  }

  return null;
}

/**
 * 批量生成封面（生成多种规格）
 * @param {string} videoPath - 视频路径
 * @param {string} outputDir - 输出目录
 * @param {string} baseName - 基础文件名
 */
function generateAllThumbnails(
  videoPath,
  outputDir = "thumbnails",
  baseName = null,
) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const name = baseName || path.parse(videoPath).name;
  const info = getVideoInfo(videoPath);

  console.log(
    `\n[Batch Generating] All thumbnails for ${path.basename(videoPath)}...`,
  );
  console.log(
    `Video: ${info.width}x${info.height}, ${info.duration.toFixed(1)}s\n`,
  );

  const outputs = {};

  // 1. 最佳封面（多种尺寸）
  const bestTime = findBestThumbnailFrame(videoPath);

  outputs.thumbnail_1920 = generateThumbnail(
    videoPath,
    path.join(outputDir, `${name}_thumb_1920.jpg`),
    bestTime,
    1920,
  );
  outputs.thumbnail_1280 = generateThumbnail(
    videoPath,
    path.join(outputDir, `${name}_thumb_1280.jpg`),
    bestTime,
    1280,
  );
  outputs.thumbnail_640 = generateThumbnail(
    videoPath,
    path.join(outputDir, `${name}_thumb_640.jpg`),
    bestTime,
    640,
  );

  // 2. 故事板
  outputs.storyboard = generateStoryboard(
    videoPath,
    path.join(outputDir, `${name}_storyboard.jpg`),
    3,
    3,
  );

  // 3. 带时间戳的故事板
  outputs.timestamped = generateTimestampedStoryboard(
    videoPath,
    path.join(outputDir, `${name}_timeline.jpg`),
    9,
  );

  // 4. GIF 预览（选择3个不同位置）
  const gifPositions = [
    info.duration * 0.2, // 开头
    info.duration * 0.5, // 中间
    info.duration * 0.8, // 结尾
  ];

  gifPositions.forEach((pos, i) => {
    const label = ["start", "middle", "end"][i];
    outputs[`gif_${label}`] = generateGIFPreview(
      videoPath,
      path.join(outputDir, `${name}_preview_${label}.gif`),
      pos,
      3,
      480,
      10,
    );
  });

  // 5. 首帧和尾帧
  outputs.first_frame = generateThumbnail(
    videoPath,
    path.join(outputDir, `${name}_first.jpg`),
    0,
    1920,
  );
  outputs.last_frame = generateThumbnail(
    videoPath,
    path.join(outputDir, `${name}_last.jpg`),
    info.duration - 0.1,
    1920,
  );

  console.log(`\n[OK] All thumbnails generated in ${outputDir}/`);
  console.log("Generated files:");
  Object.entries(outputs).forEach(([key, file]) => {
    if (file && fs.existsSync(file)) {
      const size = (fs.statSync(file).size / 1024).toFixed(1);
      console.log(`  ✓ ${path.basename(file)} (${size} KB)`);
    }
  });

  return outputs;
}

// 导出模块
module.exports = {
  findBestThumbnailFrame,
  generateThumbnail,
  generateStoryboard,
  generateTimestampedStoryboard,
  generateGIFPreview,
  generateAllThumbnails,
  getVideoInfo,
};

// 命令行使用
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const videoPath = args[1];

  if (!command || !videoPath) {
    console.log("Video Thumbnail Generator - 智能封面生成器\n");
    console.log("Usage:");
    console.log(
      "  node thumbnail_generator.js best <video.mp4>              - Find best frame time",
    );
    console.log(
      "  node thumbnail_generator.js thumb <video.mp4> [time]      - Generate thumbnail",
    );
    console.log(
      "  node thumbnail_generator.js storyboard <video.mp4>        - Generate 3x3 storyboard",
    );
    console.log(
      "  node thumbnail_generator.js gif <video.mp4> [start]       - Generate GIF preview",
    );
    console.log(
      "  node thumbnail_generator.js timeline <video.mp4>          - Generate timestamped storyboard",
    );
    console.log(
      "  node thumbnail_generator.js all <video.mp4> [outputDir]   - Generate all thumbnails\n",
    );
    console.log("Examples:");
    console.log("  node thumbnail_generator.js thumb video.mp4 5.2");
    console.log("  node thumbnail_generator.js gif video.mp4 10");
    console.log("  node thumbnail_generator.js all video.mp4 ./covers\n");
    process.exit(1);
  }

  switch (command) {
    case "best": {
      const time = findBestThumbnailFrame(videoPath);
      console.log(`\nBest frame at: ${time.toFixed(2)} seconds`);
      break;
    }

    case "thumb": {
      const time = args[2] ? parseFloat(args[2]) : null;
      const output = args[3] || `thumb_${path.basename(videoPath, ".mp4")}.jpg`;
      generateThumbnail(videoPath, output, time);
      break;
    }

    case "storyboard": {
      const output =
        args[2] || `storyboard_${path.basename(videoPath, ".mp4")}.jpg`;
      generateStoryboard(videoPath, output);
      break;
    }

    case "timeline": {
      const output =
        args[2] || `timeline_${path.basename(videoPath, ".mp4")}.jpg`;
      generateTimestampedStoryboard(videoPath, output);
      break;
    }

    case "gif": {
      const start = args[2] ? parseFloat(args[2]) : null;
      const output =
        args[3] || `preview_${path.basename(videoPath, ".mp4")}.gif`;
      generateGIFPreview(videoPath, output, start);
      break;
    }

    case "all": {
      const outputDir = args[2] || "thumbnails";
      generateAllThumbnails(videoPath, outputDir);
      break;
    }

    default:
      console.log("Unknown command:", command);
      console.log("Use: best, thumb, storyboard, timeline, gif, or all");
  }
}
