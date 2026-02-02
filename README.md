# Video Scene Editor Skill

Auto-detect scene changes in videos and edit them intelligently using FFmpeg.

## Features

- **Scene Detection**: Automatically detect scene changes based on frame differences
- **Video Splitting**: Split video into separate scene clips
- **Smart Merging**: Filter short scenes and merge the rest
- **Auto Edit**: Full workflow - detect, split, filter, and merge
- **Intelligent Thumbnails**: Auto-select best frame, generate storyboards, GIF previews, and multi-size covers

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

### 5. Intelligent Thumbnail Generation

```bash
node index.js thumbnail <video.mp4> <subCommand> [args...]
```

Generate all thumbnails at once (recommended):

```bash
node index.js thumbnail myvideo.mp4 all ./thumbnails
```

Find the best thumbnail frame automatically:

```bash
node index.js thumbnail myvideo.mp4 best
```

Generate single thumbnail at specific time:

```bash
node index.js thumbnail myvideo.mp4 single 10.5 thumb.jpg
```

Generate storyboard (3x3 grid):

```bash
node index.js thumbnail myvideo.mp4 storyboard
```

Generate GIF preview:

```bash
node index.js thumbnail myvideo.mp4 gif 15 preview.gif
```

**Thumbnail Types Generated:**

- `thumb_1920.jpg` - HD cover (1920px width)
- `thumb_1280.jpg` - Standard cover (1280px width)
- `thumb_640.jpg` - Thumbnail (640px width)
- `storyboard.jpg` - 3x3 grid storyboard
- `timeline.jpg` - Timestamped storyboard
- `preview_start.gif` - GIF from video start
- `preview_middle.gif` - GIF from video middle
- `preview_end.gif` - GIF from video end
- `first.jpg` - First frame capture
- `last.jpg` - Last frame capture

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

### findBestThumbnailFrame(videoPath, candidates)

Intelligently finds the best frame for video thumbnail based on brightness, scene changes, and avoiding black/white frames.

**Parameters:**

- `videoPath` (string): Path to the video file
- `candidates` (number): Number of candidate frames to analyze (default: 10)

**Returns:** Timestamp in seconds of the best frame

### generateThumbnail(videoPath, outputFile, timestamp, width, quality)

Generate a thumbnail image from a specific time or auto-selected best frame.

**Parameters:**

- `videoPath` (string): Path to the video file
- `outputFile` (string): Output image path
- `timestamp` (number): Time in seconds (null for auto-selection)
- `width` (number): Output width in pixels (default: 1280)
- `quality` (number): JPEG quality 1-31 (default: 2)

**Returns:** Path to generated thumbnail

### generateStoryboard(videoPath, outputFile, rows, cols)

Create a grid storyboard image showing key moments from the video.

**Parameters:**

- `videoPath` (string): Path to the video file
- `outputFile` (string): Output image path
- `rows` (number): Number of rows (default: 3)
- `cols` (number): Number of columns (default: 3)

**Returns:** Path to generated storyboard

### generateGIFPreview(videoPath, outputFile, startTime, duration, width, fps)

Generate an animated GIF preview of a video segment.

**Parameters:**

- `videoPath` (string): Path to the video file
- `outputFile` (string): Output GIF path
- `startTime` (number): Start time in seconds (null for middle)
- `duration` (number): GIF duration in seconds (default: 3)
- `width` (number): GIF width (default: 480)
- `fps` (number): Frames per second (default: 10)

**Returns:** Path to generated GIF

### generateAllThumbnails(videoPath, outputDir)

Batch generate all thumbnail types: HD covers, storyboards, GIFs, and timeline images.

**Parameters:**

- `videoPath` (string): Path to the video file
- `outputDir` (string): Output directory (default: "thumbnails")

**Returns:** Object with paths to all generated files

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

---

# 视频场景编辑器 (Video Scene Editor - 中文文档)

基于 FFmpeg 智能检测视频场景切换并自动剪辑。

## 功能特性

- **场景检测**: 基于帧间差异自动检测场景切换点
- **视频分割**: 按场景将视频分割为独立片段
- **智能合并**: 过滤短片段，合并有效内容
- **自动编辑**: 全流程自动化 - 检测、分割、过滤、合并
- **智能封面生成**: 自动选择最佳帧、生成缩略图、故事板、GIF预览

## 安装

```bash
npx skills add gentmjt-lang/video-scene-editor
```

## 环境要求

- FFmpeg 已安装并添加到 PATH
- Node.js 14+

## 使用方法

### 1. 检测场景切换点

```bash
node index.js detect <视频文件.mp4> [检测阈值]
```

示例:

```bash
node index.js detect 我的视频.mp4 0.3
```

输出:

```json
{
  "scenes": [5.2, 12.8, 25.1]
}
```

### 2. 按场景分割视频

```bash
node index.js split <视频文件.mp4> [输出目录] [检测阈值]
```

示例:

```bash
node index.js split 我的视频.mp4 场景片段 0.3
```

生成文件: `场景片段/我的视频_scene_001.mp4`, `场景片段/我的视频_scene_002.mp4` 等

### 3. 合并场景 (带过滤)

```bash
node index.js merge <视频文件.mp4> [最小时长] [输出文件] [检测阈值]
```

示例:

```bash
node index.js merge 我的视频.mp4 2.0 合并结果.mp4 0.3
```

合并所有 >= 2 秒的场景到 `合并结果.mp4`

### 4. 自动编辑 (完整流程)

```bash
node index.js auto <视频文件.mp4> [最小时长] [检测阈值]
```

示例:

```bash
node index.js auto 我的视频.mp4 3.0 0.3
```

输出:

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

### 5. 智能封面生成

```bash
node index.js thumbnail <视频文件.mp4> <子命令> [参数...]
```

一键生成全套封面（推荐）:

```bash
node index.js thumbnail 我的视频.mp4 all ./封面
```

自动寻找最佳封面帧:

```bash
node index.js thumbnail 我的视频.mp4 best
```

在指定时间生成单张缩略图:

```bash
node index.js thumbnail 我的视频.mp4 single 10.5 缩略图.jpg
```

生成九宫格故事板:

```bash
node index.js thumbnail 我的视频.mp4 storyboard
```

生成带时间戳的故事板:

```bash
node index.js thumbnail 我的视频.mp4 timeline
```

生成 GIF 预览:

```bash
node index.js thumbnail 我的视频.mp4 gif 15 预览.gif
```

**生成的封面类型:**

- `thumb_1920.jpg` - 高清封面 (1920px 宽度)
- `thumb_1280.jpg` - 标准封面 (1280px 宽度)
- `thumb_640.jpg` - 缩略图 (640px 宽度)
- `storyboard.jpg` - 3x3 网格故事板
- `timeline.jpg` - 带时间戳的故事板
- `preview_start.gif` - 视频开头 GIF
- `preview_middle.gif` - 视频中间 GIF
- `preview_end.gif` - 视频结尾 GIF
- `first.jpg` - 首帧截图
- `last.jpg` - 尾帧截图

## 参数说明

### 检测阈值 (0.1 - 0.5)

- **0.1-0.2**: 检测细微变化 (场景更多)
- **0.3**: 平衡模式 (推荐)
- **0.4-0.5**: 仅检测大幅场景切换 (场景更少)

### 最小时长

过滤掉短于此值的场景 (单位: 秒)。适用于删除:

- 短暂转场
- 闪烁镜头
- 不需要的片段

## 作为模块使用

```javascript
const videoEditor = require("./index.js");

// 检测场景
const timestamps = videoEditor.detectScenes("视频.mp4", 0.3);

// 分割视频
const clips = videoEditor.splitByScenes("视频.mp4", timestamps, "输出");

// 自动编辑
const result = videoEditor.autoEdit("视频.mp4", 3.0, 0.3);
```

## API 参考

### detectScenes(视频路径, 阈值)

返回场景切换点时间戳数组 (单位: 秒)

### splitByScenes(视频路径, 时间戳数组, 输出目录)

将视频分割为场景片段。返回输出文件路径数组

### mergeScenes(视频路径, 时间戳数组, 最小时长, 输出文件)

合并 >= 最小时长 的场景。返回输出文件路径

### autoEdit(视频路径, 最小时长, 阈值)

完整工作流程。返回处理结果对象

### findBestThumbnailFrame(视频路径, 候选数量)

智能分析视频的亮度、场景变化，自动找到最佳封面帧。

**参数:**

- `视频路径` (string): 视频文件路径
- `候选数量` (number): 分析的候选帧数量 (默认: 10)

**返回:** 最佳帧的时间戳 (秒)

### generateThumbnail(视频路径, 输出文件, 时间戳, 宽度, 质量)

从指定时间或自动选择的最佳帧生成缩略图。

**参数:**

- `视频路径` (string): 视频文件路径
- `输出文件` (string): 输出图片路径
- `时间戳` (number): 时间点（秒），null 则自动选择
- `宽度` (number): 输出宽度像素 (默认: 1280)
- `质量` (number): JPEG 质量 1-31 (默认: 2)

**返回:** 生成的缩略图路径

### generateStoryboard(视频路径, 输出文件, 行数, 列数)

创建网格故事板图片，展示视频关键帧。

**参数:**

- `视频路径` (string): 视频文件路径
- `输出文件` (string): 输出图片路径
- `行数` (number): 行数 (默认: 3)
- `列数` (number): 列数 (默认: 3)

**返回:** 生成的故事板路径

### generateGIFPreview(视频路径, 输出文件, 开始时间, 时长, 宽度, 帧率)

生成视频片段的动画 GIF 预览。

**参数:**

- `视频路径` (string): 视频文件路径
- `输出文件` (string): 输出 GIF 路径
- `开始时间` (number): 开始时间（秒），null 则取中间
- `时长` (number): GIF 时长秒数 (默认: 3)
- `宽度` (number): GIF 宽度 (默认: 480)
- `帧率` (number): 每秒帧数 (默认: 10)

**返回:** 生成的 GIF 路径

### generateAllThumbnails(视频路径, 输出目录)

批量生成所有封面类型：高清封面、故事板、GIF、时间轴图片。

**参数:**

- `视频路径` (string): 视频文件路径
- `输出目录` (string): 输出目录 (默认: "thumbnails")

**返回:** 包含所有生成文件路径的对象

## 使用示例

### 教程视频 (删除片头片尾)

```bash
node index.js auto 教程视频.mp4 5.0 0.3
```

### 音乐视频 (提取主歌/副歌)

```bash
node index.js split 音乐视频.mp4 片段 0.25
```

### 演示文稿 (删除短转场)

```bash
node index.js merge 幻灯片.mp4 1.5 清理版.mp4 0.3
```
