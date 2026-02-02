---
name: video-scene-editor
description: Auto-detect scene changes in videos and edit them intelligently using FFmpeg. This skill can detect scene changes, split videos into clips, merge scenes with duration filtering, and perform full auto-edit workflows.
---

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

### findBestThumbnailFrame

Intelligently find the best frame for video thumbnail based on brightness, scene changes, and avoiding black/white frames.

**Parameters:**

- `videoPath` (string): Path to the video file
- `candidates` (number): Number of candidate frames to analyze (default: 10)

**Returns:** Timestamp in seconds of the best frame

### generateThumbnail

Generate a thumbnail image from a specific time or auto-selected best frame.

**Parameters:**

- `videoPath` (string): Path to the video file
- `outputFile` (string): Output image path
- `timestamp` (number): Time in seconds (null for auto-selection)
- `width` (number): Output width in pixels (default: 1280)
- `quality` (number): JPEG quality 1-31 (default: 2)

**Returns:** Path to generated thumbnail

### generateStoryboard

Create a grid storyboard image (3x3) showing key moments from the video.

**Parameters:**

- `videoPath` (string): Path to the video file
- `outputFile` (string): Output image path
- `rows` (number): Number of rows (default: 3)
- `cols` (number): Number of columns (default: 3)

**Returns:** Path to generated storyboard

### generateGIFPreview

Generate an animated GIF preview of a video segment.

**Parameters:**

- `videoPath` (string): Path to the video file
- `outputFile` (string): Output GIF path
- `startTime` (number): Start time in seconds (null for middle)
- `duration` (number): GIF duration in seconds (default: 3)
- `width` (number): GIF width (default: 480)
- `fps` (number): Frames per second (default: 10)

**Returns:** Path to generated GIF

### generateAllThumbnails

Batch generate all thumbnail types: HD covers, storyboards, GIFs, and timeline images.

**Parameters:**

- `videoPath` (string): Path to the video file
- `outputDir` (string): Output directory (default: "thumbnails")

**Returns:** Object with paths to all generated files

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

# Generate all thumbnails
node index.js thumbnail myvideo.mp4 all ./thumbnails

# Find best thumbnail frame
node index.js thumbnail myvideo.mp4 best

# Generate single thumbnail at specific time
node index.js thumbnail myvideo.mp4 single 10.5 thumb.jpg

# Generate storyboard
node index.js thumbnail myvideo.mp4 storyboard

# Generate GIF preview
node index.js thumbnail myvideo.mp4 gif 15 preview.gif
```

## Installation

```bash
npx skills add gentmjt-lang/video-scene-editor
```

## Author

gentmjt-lang

## License

MIT
