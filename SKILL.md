# Video Scene Editor

Auto-detect scene changes in videos and edit them intelligently using FFmpeg.

## Overview

This skill provides automatic video scene detection and intelligent editing capabilities. It can detect scene changes based on frame differences, split videos into separate clips, merge scenes with duration filtering, and perform full auto-edit workflows.

## Capabilities

### detectScenes
Detect scene changes in a video file.

**Parameters:**
- `videoPath` (string): Path to the video file
- `threshold` (number): Scene detection threshold 0.1-0.5 (default: 0.3)

**Returns:** Array of scene change timestamps in seconds

### splitByScenes
Split video into separate clips based on detected scenes.

**Parameters:**
- `videoPath` (string): Path to the video file
- `timestamps` (array): Array of scene change timestamps
- `outputDir` (string): Output directory (default: "scenes")

**Returns:** Array of output file paths

### mergeScenes
Merge video scenes with filtering for minimum duration.

**Parameters:**
- `videoPath` (string): Path to the video file
- `timestamps` (array): Array of scene change timestamps
- `minDuration` (number): Minimum scene duration to keep (default: 2.0)
- `outputFile` (string): Output filename (default: "merged_scenes.mp4")

**Returns:** Path to merged output file

### autoEdit
Full auto-edit workflow: detect scenes, filter, and merge.

**Parameters:**
- `videoPath` (string): Path to the video file
- `minDuration` (number): Minimum scene duration (default: 3.0)
- `threshold` (number): Scene detection threshold (default: 0.3)

**Returns:** Object with scenes detected, clips created, and final merged file

## Requirements

- FFmpeg installed and in PATH
- Node.js 14+

## Usage Examples

```bash
# Auto edit a video
node index.js auto myvideo.mp4 3.0 0.3

# Detect scenes only
node index.js detect myvideo.mp4 0.3

# Split into separate scenes
node index.js split myvideo.mp4 scenes 0.3

# Merge with filtering
node index.js merge myvideo.mp4 2.0 output.mp4 0.3
```

## Installation

```bash
npx skills add gentmjt-lang/video-scene-editor
```

## Author

gentmjt-lang

## License

MIT
