#!/usr/bin/env node
/**
 * Video Scene Editor Skill
 * Auto-detect scene changes and edit videos intelligently
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Configuration
let FFMPEG_PATH = "ffmpeg";
let FFPROBE_PATH = "ffprobe";

// Try to find FFmpeg in common locations
function findFFmpeg() {
  const possiblePaths = [
    "D:\\WorkSpace\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
  ];

  const possibleProbes = [
    "D:\\WorkSpace\\ffmpeg\\bin\\ffprobe.exe",
    "C:\\ffmpeg\\bin\\ffprobe.exe",
    "C:\\Program Files\\ffmpeg\\bin\\ffprobe.exe",
  ];

  for (let i = 0; i < possiblePaths.length; i++) {
    if (fs.existsSync(possiblePaths[i])) {
      FFMPEG_PATH = possiblePaths[i];
      FFPROBE_PATH = possibleProbes[i];
      return true;
    }
  }

  // Try system PATH
  try {
    execSync("ffmpeg -version", { stdio: "pipe" });
    return true;
  } catch (e) {
    return false;
  }
}

// Execute command and return output
function exec(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: "pipe", ...options });
  } catch (e) {
    throw new Error(`Command failed: ${cmd}\n${e.message}`);
  }
}

// Detect scene changes in video
function detectScenes(videoPath, threshold = 0.3) {
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  const cmd = `${FFMPEG_PATH} -i "${videoPath}" -filter:v "select='gt(scene,${threshold})',showinfo" -f null - 2>&1`;
  const output = exec(cmd);

  const timestamps = [];
  const pattern = /pts_time:([\d.]+)/g;
  let match;

  while ((match = pattern.exec(output)) !== null) {
    timestamps.push(parseFloat(match[1]));
  }

  return timestamps;
}

// Get video duration
function getDuration(videoPath) {
  const cmd = `${FFPROBE_PATH} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
  const output = exec(cmd).trim();
  return parseFloat(output);
}

// Get video info
function getVideoInfo(videoPath) {
  const cmd = `${FFPROBE_PATH} -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -of default=noprint_wrappers=1 "${videoPath}"`;
  const output = exec(cmd);

  const info = {};
  output.split("\n").forEach((line) => {
    if (line.includes("=")) {
      const [key, value] = line.split("=");
      info[key] = value;
    }
  });

  return info;
}

// Split video into scenes
function splitByScenes(videoPath, timestamps, outputDir = "scenes") {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const duration = getDuration(videoPath);
  const allTimestamps = [0, ...timestamps, duration];
  const baseName = path.parse(videoPath).name;
  const outputs = [];

  for (let i = 0; i < allTimestamps.length - 1; i++) {
    const start = allTimestamps[i];
    const end = allTimestamps[i + 1];
    const segDuration = end - start;
    const outputFile = path.join(
      outputDir,
      `${baseName}_scene_${String(i + 1).padStart(3, "0")}.mp4`,
    );

    const cmd = `${FFMPEG_PATH} -y -ss ${start} -i "${videoPath}" -t ${segDuration} -c copy -avoid_negative_ts make_zero "${outputFile}"`;
    exec(cmd);
    outputs.push(outputFile);
  }

  return outputs;
}

// Merge scenes with filtering
function mergeScenes(
  videoPath,
  timestamps,
  minDuration = 2.0,
  outputFile = "merged_scenes.mp4",
) {
  const duration = getDuration(videoPath);
  const allTimestamps = [0, ...timestamps, duration];

  // Filter valid segments
  const validSegments = [];
  for (let i = 0; i < allTimestamps.length - 1; i++) {
    const start = allTimestamps[i];
    const end = allTimestamps[i + 1];
    const segDuration = end - start;

    if (segDuration >= minDuration) {
      validSegments.push({ start, end, duration: segDuration });
    }
  }

  if (validSegments.length === 0) {
    throw new Error("No valid segments found after filtering");
  }

  // Extract segments
  const tempFiles = [];
  validSegments.forEach((seg, i) => {
    const tempFile = `temp_scene_${i}.mp4`;
    const cmd = `${FFMPEG_PATH} -y -ss ${seg.start} -i "${videoPath}" -t ${seg.duration} -c copy -avoid_negative_ts make_zero "${tempFile}"`;
    exec(cmd);
    tempFiles.push(tempFile);
  });

  // Create merge list
  const listContent = tempFiles.map((f) => `file '${f}'`).join("\n");
  fs.writeFileSync("merge_list.txt", listContent);

  // Merge
  const cmd = `${FFMPEG_PATH} -y -f concat -safe 0 -i merge_list.txt -c copy "${outputFile}"`;
  exec(cmd);

  // Cleanup
  tempFiles.forEach((f) => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
  if (fs.existsSync("merge_list.txt")) fs.unlinkSync("merge_list.txt");

  return outputFile;
}

// Full auto-edit workflow
function autoEdit(videoPath, minDuration = 3.0, threshold = 0.3) {
  console.log(`Processing: ${videoPath}`);

  const duration = getDuration(videoPath);
  console.log(`Duration: ${duration.toFixed(2)}s`);

  // Detect scenes
  console.log(`Detecting scenes (threshold: ${threshold})...`);
  let timestamps = detectScenes(videoPath, threshold);

  if (timestamps.length === 0) {
    console.log("No scenes detected, trying lower threshold...");
    timestamps = detectScenes(videoPath, 0.15);
  }

  console.log(`Found ${timestamps.length} scene changes`);

  // Split video
  const outputDir = "auto_scenes";
  const clips = splitByScenes(videoPath, timestamps, outputDir);
  console.log(`Created ${clips.length} scene clips`);

  // Merge with filtering
  const mergedFile = "auto_merged.mp4";
  const finalFile = mergeScenes(videoPath, timestamps, minDuration, mergedFile);
  console.log(`Merged to: ${finalFile}`);

  return {
    originalDuration: duration,
    scenesDetected: timestamps.length,
    clipsCreated: clips.length,
    clipsPath: outputDir,
    mergedFile: finalFile,
    sceneTimestamps: timestamps,
  };
}

// Main handler for skill calls
async function main() {
  // Check FFmpeg
  if (!findFFmpeg()) {
    console.error(
      "Error: FFmpeg not found. Please install FFmpeg and add to PATH.",
    );
    console.error("Windows: https://www.gyan.dev/ffmpeg/builds/");
    process.exit(1);
  }

  // Parse arguments
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log("Video Scene Editor Skill");
    console.log("");
    console.log("Usage:");
    console.log("  node index.js detect <videoPath> [threshold]");
    console.log("  node index.js split <videoPath> [outputDir] [threshold]");
    console.log(
      "  node index.js merge <videoPath> [minDuration] [outputFile] [threshold]",
    );
    console.log("  node index.js auto <videoPath> [minDuration] [threshold]");
    console.log("  node index.js thumbnail <videoPath> <subCommand> [args...]");
    console.log("");
    console.log("Examples:");
    console.log("  node index.js detect video.mp4 0.3");
    console.log("  node index.js split video.mp4 scenes 0.3");
    console.log("  node index.js merge video.mp4 2.0 merged.mp4 0.3");
    console.log("  node index.js auto video.mp4 3.0 0.3");
    console.log("  node index.js thumbnail video.mp4 all ./covers");
    console.log("  node index.js thumbnail video.mp4 best");
    console.log("  node index.js thumbnail video.mp4 gif 10 preview.gif");
    process.exit(0);
  }

  const videoPath = args[1];

  if (!videoPath) {
    console.error("Error: Video path required");
    process.exit(1);
  }

  try {
    switch (command) {
      case "detect": {
        const threshold = parseFloat(args[2]) || 0.3;
        const timestamps = detectScenes(videoPath, threshold);
        console.log(JSON.stringify({ scenes: timestamps }, null, 2));
        break;
      }

      case "split": {
        const outputDir = args[2] || "scenes";
        const threshold = parseFloat(args[3]) || 0.3;
        const timestamps = detectScenes(videoPath, threshold);
        const outputs = splitByScenes(videoPath, timestamps, outputDir);
        console.log(JSON.stringify({ clips: outputs }, null, 2));
        break;
      }

      case "merge": {
        const minDuration = parseFloat(args[2]) || 2.0;
        const outputFile = args[3] || "merged_scenes.mp4";
        const threshold = parseFloat(args[4]) || 0.3;
        const timestamps = detectScenes(videoPath, threshold);
        const result = mergeScenes(
          videoPath,
          timestamps,
          minDuration,
          outputFile,
        );
        console.log(JSON.stringify({ mergedFile: result }, null, 2));
        break;
      }

      case "auto": {
        const minDuration = parseFloat(args[2]) || 3.0;
        const threshold = parseFloat(args[3]) || 0.3;
        const result = autoEdit(videoPath, minDuration, threshold);
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case "thumbnail": {
        // Import thumbnail generator
        const thumbnailGen = require("./thumbnail_generator");
        const subCommand = args[2] || "all";
        const outputArg = args[3];

        switch (subCommand) {
          case "best": {
            const time = thumbnailGen.findBestThumbnailFrame(videoPath);
            console.log(JSON.stringify({ bestFrame: time }, null, 2));
            break;
          }
          case "single": {
            const time = args[3] ? parseFloat(args[3]) : null;
            const output =
              args[4] ||
              `thumb_${require("path").basename(videoPath, ".mp4")}.jpg`;
            thumbnailGen.generateThumbnail(videoPath, output, time);
            console.log(JSON.stringify({ thumbnail: output }, null, 2));
            break;
          }
          case "storyboard": {
            const output =
              outputArg ||
              `storyboard_${require("path").basename(videoPath, ".mp4")}.jpg`;
            thumbnailGen.generateStoryboard(videoPath, output);
            console.log(JSON.stringify({ storyboard: output }, null, 2));
            break;
          }
          case "timeline": {
            const output =
              outputArg ||
              `timeline_${require("path").basename(videoPath, ".mp4")}.jpg`;
            thumbnailGen.generateTimestampedStoryboard(videoPath, output);
            console.log(JSON.stringify({ timeline: output }, null, 2));
            break;
          }
          case "gif": {
            const start = outputArg ? parseFloat(outputArg) : null;
            const output =
              args[4] ||
              `preview_${require("path").basename(videoPath, ".mp4")}.gif`;
            thumbnailGen.generateGIFPreview(videoPath, output, start);
            console.log(JSON.stringify({ gif: output }, null, 2));
            break;
          }
          case "all": {
            const outputDir = outputArg || "thumbnails";
            const result = thumbnailGen.generateAllThumbnails(
              videoPath,
              outputDir,
            );
            console.log(JSON.stringify(result, null, 2));
            break;
          }
          default: {
            console.log("Thumbnail sub-commands:");
            console.log("  best     - Find best frame time");
            console.log(
              "  single   - Generate single thumbnail [time] [output]",
            );
            console.log("  storyboard - Generate storyboard [output]");
            console.log(
              "  timeline - Generate timestamped storyboard [output]",
            );
            console.log(
              "  gif      - Generate GIF preview [start_time] [output]",
            );
            console.log("  all      - Generate all thumbnails [output_dir]");
          }
        }
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Export functions for skill system
module.exports = {
  detectScenes,
  splitByScenes,
  mergeScenes,
  autoEdit,
  getDuration,
  getVideoInfo,
};

// Run if called directly
if (require.main === module) {
  main();
}
