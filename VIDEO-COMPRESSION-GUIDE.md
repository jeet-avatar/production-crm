# Video Compression Guide for Email Templates

## Overview
This guide provides tools to compress videos to under 100MB for email template uploads, avoiding the "413 Payload Too Large" error.

## Requirements

### FFmpeg Installation

#### macOS:
```bash
brew install ffmpeg
```

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install ffmpeg
```

#### Windows:
1. Download from https://ffmpeg.org/download.html
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to PATH

### Verify Installation:
```bash
ffmpeg -version
```

## Usage

### Option 1: Python Script (Recommended - Cross-platform)

#### Basic Usage:
```bash
python3 compress-video.py input_video.mp4
```

This will create `input_video_compressed.mp4` in the same directory.

#### Custom Output Name:
```bash
python3 compress-video.py input_video.mp4 output.mp4
```

#### Custom Target Size (in MB):
```bash
python3 compress-video.py input_video.mp4 output.mp4 50
```

This compresses the video to approximately 50MB.

### Option 2: Bash Script (macOS/Linux)

#### Basic Usage:
```bash
./compress-video.sh input_video.mp4
```

#### Custom Output Name:
```bash
./compress-video.sh input_video.mp4 output.mp4
```

#### Custom Target Size:
```bash
./compress-video.sh input_video.mp4 output.mp4 50
```

## Examples

### Example 1: Compress 500MB video to under 100MB
```bash
python3 compress-video.py large_video.mp4
# Output: large_video_compressed.mp4 (~95MB)
```

### Example 2: Compress to 50MB for faster uploads
```bash
python3 compress-video.py video.mp4 small_video.mp4 50
# Output: small_video.mp4 (~50MB)
```

### Example 3: Aggressive compression to 25MB
```bash
python3 compress-video.py video.mp4 tiny_video.mp4 25
# Output: tiny_video.mp4 (~25MB)
```

## How It Works

The compression script:

1. **Checks video size** - If already under target, just copies the file
2. **Calculates optimal bitrate** - Based on video duration and target size
3. **Compresses using FFmpeg** with these settings:
   - **Codec**: H.264 (libx264) for maximum compatibility
   - **Quality**: CRF 23 (good balance between quality and size)
   - **Resolution**: Max 1920x1080 (maintains aspect ratio)
   - **Audio**: AAC 128kbps
   - **Optimization**: Web streaming ready (faststart)

## Quality vs. Size Trade-offs

| Target Size | Quality | Use Case |
|-------------|---------|----------|
| 95MB | Excellent | High-quality videos, minimal compression |
| 50MB | Very Good | Balance of quality and upload speed |
| 25MB | Good | Faster uploads, acceptable quality |
| 10MB | Fair | Quick uploads, lower quality |

## Troubleshooting

### Issue: "FFmpeg not found"
**Solution**: Install FFmpeg (see Requirements section above)

### Issue: Output file still too large
**Solution**: Run again with lower target size:
```bash
python3 compress-video.py input.mp4 output.mp4 50
```

### Issue: Video quality is poor
**Solution**: Increase target size or edit the CRF value:
- CRF 18 = Very high quality (larger file)
- CRF 23 = Good quality (default)
- CRF 28 = Lower quality (smaller file)

To use custom CRF, edit the script and change `-crf 23` to `-crf 18`

### Issue: Compression takes too long
**Solution**: The script uses "medium" preset. For faster compression (lower quality), change `-preset medium` to `-preset fast` in the script.

## Advanced Options

### Custom FFmpeg Settings

You can modify the script to use custom FFmpeg settings. Here are some useful options:

#### Higher Quality (Larger File):
```python
'-crf', '18',  # Change from 23 to 18
```

#### Faster Compression:
```python
'-preset', 'fast',  # Change from 'medium' to 'fast'
```

#### Smaller Resolution (Smaller File):
```python
'-vf', "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease"
```

#### Lower Audio Quality (Smaller File):
```python
'-b:a', '96k',  # Change from '128k' to '96k'
```

## File Size Limits

| Platform | Limit | Recommendation |
|----------|-------|----------------|
| Email Template Upload | 100MB | Compress to 95MB |
| Email Attachments | 25MB | Compress to 20MB |
| Quick Web Streaming | 50MB | Compress to 45MB |

## Tips for Best Results

1. **Start with 95MB target** - Gives you margin under the 100MB limit
2. **Test upload first** - Try uploading the compressed video before making multiple versions
3. **Keep original file** - Always keep your original high-quality video as backup
4. **Batch processing** - Use a loop to compress multiple videos:

```bash
for video in *.mp4; do
    python3 compress-video.py "$video"
done
```

## Quick Reference

### Most Common Commands:

```bash
# Compress to ~95MB (default)
python3 compress-video.py myvideo.mp4

# Compress to ~50MB
python3 compress-video.py myvideo.mp4 output.mp4 50

# Compress all MP4 files in current directory
for f in *.mp4; do python3 compress-video.py "$f"; done
```

## Integration with Email Template Editor

After compressing your video:

1. Go to Email Templates → Edit Template
2. Click "Upload Video" in the Video section
3. Select your compressed video file
4. The video will upload and appear in the template preview

## Support

If you encounter issues:
1. Check FFmpeg is installed: `ffmpeg -version`
2. Verify input file exists and is a valid video
3. Try with a smaller target size
4. Check console output for error messages

For additional help, refer to:
- FFmpeg documentation: https://ffmpeg.org/documentation.html
- Video compression best practices: https://trac.ffmpeg.org/wiki/Encode/H.264
