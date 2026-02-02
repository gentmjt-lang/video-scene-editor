# Video Scene Editor Skill

Auto-detect scene changes in videos and edit them intelligently using FFmpeg.

## Features

- **Scene Detection**: Automatically detect scene changes based on frame differences
- **Video Splitting**: Split video into separate scene clips
- **Smart Merging**: Filter short scenes and merge the rest
- **Auto Edit**: Full workflow - detect, split, filter, and merge

## Installation

```bash
npx skills add video-scene-editor
```

## Requirements

- FFmpeg installed and in PATH
- Node.js 14+

## Usage

### 1. Detect Scene Changes

```bash
node index.js detect <video.mp4> [threshold]
```

Example:

```bash
node index.js detect myvideo.mp4 0.3
```

Output:

```json
{
  "scenes": [5.2, 12.8, 25.1]
}
```

### 2. Split Video by Scenes

```bash
node index.js split <video.mp4> [outputDir] [threshold]
```

Example:

```bash
node index.js split myvideo.mp4 scenes 0.3
```

Creates: `scenes/myvideo_scene_001.mp4`, `scenes/myvideo_scene_002.mp4`, etc.

### 3. Merge Scenes (with filtering)

```bash
node index.js merge <video.mp4> [minDuration] [outputFile] [threshold]
```

Example:

```bash
node index.js merge myvideo.mp4 2.0 merged.mp4 0.3
```

Merges all scenes >= 2 seconds into `merged.mp4`

### 4. Auto Edit (Full Workflow)

```bash
node index.js auto <video.mp4> [minDuration] [threshold]
```

Example:

```bash
node index.js auto myvideo.mp4 3.0 0.3
```

Output:

```json
{
  "originalDuration": 35.05,
  "scenesDetected": 2,
  "clipsCreated": 3,
  "clipsPath": "auto_scenes",
  "mergedFile": "auto_merged.mp4",
  "sceneTimestamps": [15.2, 30.0]
}
```

## Parameters

### Threshold (0.1 - 0.5)

- **0.1-0.2**: Detect subtle changes (more scenes)
- **0.3**: Balanced (recommended)
- **0.4-0.5**: Detect only major scene cuts (fewer scenes)

### Min Duration

Filter out scenes shorter than this value (seconds). Good for removing:

- Brief transitions
- Flash cuts
- Unintended segments

## Using as a Module

```javascript
const videoEditor = require("./index.js");

// Detect scenes
const timestamps = videoEditor.detectScenes("video.mp4", 0.3);

// Split video
const clips = videoEditor.splitByScenes("video.mp4", timestamps, "output");

// Auto edit
const result = videoEditor.autoEdit("video.mp4", 3.0, 0.3);
```

## API Reference

### detectScenes(videoPath, threshold)

Returns array of scene change timestamps in seconds.

### splitByScenes(videoPath, timestamps, outputDir)

Splits video into scene clips. Returns array of output file paths.

### mergeScenes(videoPath, timestamps, minDuration, outputFile)

Merges scenes >= minDuration. Returns output file path.

### autoEdit(videoPath, minDuration, threshold)

Full workflow. Returns object with processing results.

## Examples

### Tutorial Video (Remove intro/outro)

```bash
node index.js auto tutorial.mp4 5.0 0.3
```

### Music Video (Extract verse/chorus)

```bash
node index.js split musicvideo.mp4 verses 0.25
```

### Presentation (Remove short transitions)

```bash
node index.js merge slides.mp4 1.5 clean.mp4 0.3
```
