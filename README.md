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

---

# 视频场景编辑器 (Video Scene Editor - 中文文档)

基于 FFmpeg 智能检测视频场景切换并自动剪辑。

## 功能特性

- **场景检测**: 基于帧间差异自动检测场景切换点
- **视频分割**: 按场景将视频分割为独立片段
- **智能合并**: 过滤短片段，合并有效内容
- **自动编辑**: 全流程自动化 - 检测、分割、过滤、合并

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
