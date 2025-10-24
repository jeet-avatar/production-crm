#!/bin/bash

# Video Compression Script for Email Template Uploads
# Compresses videos to under 100MB while maintaining good quality
# Uses FFmpeg for video compression

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Video Compression Tool${NC}"
echo -e "${BLUE}   Target: < 100MB for Email Templates${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}❌ Error: FFmpeg is not installed${NC}"
    echo ""
    echo "To install FFmpeg:"
    echo "  macOS:   brew install ffmpeg"
    echo "  Ubuntu:  sudo apt install ffmpeg"
    echo "  Windows: Download from https://ffmpeg.org/download.html"
    echo ""
    exit 1
fi

# Check if input file is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: No input file specified${NC}"
    echo ""
    echo "Usage: ./compress-video.sh <input_video> [output_video] [target_size_mb]"
    echo ""
    echo "Examples:"
    echo "  ./compress-video.sh myvideo.mp4"
    echo "  ./compress-video.sh myvideo.mp4 compressed.mp4"
    echo "  ./compress-video.sh myvideo.mp4 compressed.mp4 50"
    echo ""
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_FILE="${2:-${INPUT_FILE%.*}_compressed.mp4}"
TARGET_SIZE_MB="${3:-95}"  # Default to 95MB to leave margin under 100MB limit

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}❌ Error: Input file '$INPUT_FILE' not found${NC}"
    exit 1
fi

# Get input file size
INPUT_SIZE=$(du -m "$INPUT_FILE" | cut -f1)
echo -e "${BLUE}📹 Input file:${NC} $INPUT_FILE"
echo -e "${BLUE}📊 Input size:${NC} ${INPUT_SIZE}MB"
echo -e "${BLUE}🎯 Target size:${NC} ${TARGET_SIZE_MB}MB"
echo ""

# If file is already under target size
if [ "$INPUT_SIZE" -lt "$TARGET_SIZE_MB" ]; then
    echo -e "${GREEN}✅ File is already under ${TARGET_SIZE_MB}MB!${NC}"
    echo -e "${YELLOW}💡 Copying to output file without compression...${NC}"
    cp "$INPUT_FILE" "$OUTPUT_FILE"
    echo -e "${GREEN}✅ Done: $OUTPUT_FILE${NC}"
    exit 0
fi

# Get video duration in seconds
DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$INPUT_FILE")
DURATION_INT=${DURATION%.*}

# Calculate target bitrate
# Formula: (target_size_mb * 8192) / duration_seconds = bitrate in kbps
# We use 8192 instead of 8000 to convert MB to Kilobits (1MB = 8192 Kbits)
# Subtract 128 kbps for audio
TARGET_BITRATE=$(echo "scale=0; ($TARGET_SIZE_MB * 8192 / $DURATION_INT) - 128" | bc)

echo -e "${BLUE}⏱️  Duration:${NC} ${DURATION_INT}s"
echo -e "${BLUE}🎬 Target video bitrate:${NC} ${TARGET_BITRATE}k"
echo ""
echo -e "${YELLOW}🔄 Compressing video... This may take a few minutes.${NC}"
echo ""

# Compress video with FFmpeg
# -c:v libx264: Use H.264 codec (best compatibility)
# -preset medium: Balance between speed and compression
# -crf 23: Constant Rate Factor (18-28 range, lower = better quality)
# -b:v: Target video bitrate
# -maxrate: Maximum bitrate (1.5x target)
# -bufsize: Buffer size (2x target)
# -c:a aac: Use AAC audio codec
# -b:a 128k: Audio bitrate 128 kbps
# -movflags +faststart: Optimize for web streaming
# -y: Overwrite output file if exists

ffmpeg -i "$INPUT_FILE" \
  -c:v libx264 \
  -preset medium \
  -crf 23 \
  -b:v ${TARGET_BITRATE}k \
  -maxrate $((TARGET_BITRATE * 3 / 2))k \
  -bufsize $((TARGET_BITRATE * 2))k \
  -vf "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease" \
  -c:a aac \
  -b:a 128k \
  -movflags +faststart \
  -y \
  "$OUTPUT_FILE"

# Check if compression was successful
if [ $? -eq 0 ]; then
    OUTPUT_SIZE=$(du -m "$OUTPUT_FILE" | cut -f1)
    REDUCTION=$((100 - (OUTPUT_SIZE * 100 / INPUT_SIZE)))

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ Compression Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${BLUE}📁 Output file:${NC} $OUTPUT_FILE"
    echo -e "${BLUE}📊 Output size:${NC} ${OUTPUT_SIZE}MB"
    echo -e "${BLUE}📉 Reduction:${NC} ${REDUCTION}%"
    echo ""

    if [ "$OUTPUT_SIZE" -gt "$TARGET_SIZE_MB" ]; then
        echo -e "${YELLOW}⚠️  Warning: Output is still ${OUTPUT_SIZE}MB (target was ${TARGET_SIZE_MB}MB)${NC}"
        echo -e "${YELLOW}💡 Try running again with a lower target size:${NC}"
        echo -e "   ./compress-video.sh \"$INPUT_FILE\" \"$OUTPUT_FILE\" $((TARGET_SIZE_MB - 20))"
    else
        echo -e "${GREEN}✅ File is ready for upload!${NC}"
    fi
else
    echo ""
    echo -e "${RED}❌ Compression failed!${NC}"
    echo -e "${RED}Check the error messages above.${NC}"
    exit 1
fi
