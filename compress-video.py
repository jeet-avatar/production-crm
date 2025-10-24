#!/usr/bin/env python3
"""
Video Compression Script for Email Template Uploads
Compresses videos to under 100MB while maintaining good quality
Uses FFmpeg for video compression
"""

import subprocess
import sys
import os
import json
from pathlib import Path

# ANSI color codes
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

def print_header():
    print(f"{Colors.BLUE}========================================{Colors.NC}")
    print(f"{Colors.BLUE}   Video Compression Tool{Colors.NC}")
    print(f"{Colors.BLUE}   Target: < 100MB for Email Templates{Colors.NC}")
    print(f"{Colors.BLUE}========================================{Colors.NC}")
    print()

def check_ffmpeg():
    """Check if FFmpeg is installed"""
    try:
        subprocess.run(['ffmpeg', '-version'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def get_file_size_mb(filepath):
    """Get file size in MB"""
    return os.path.getsize(filepath) / (1024 * 1024)

def get_video_duration(filepath):
    """Get video duration in seconds using ffprobe"""
    try:
        cmd = [
            'ffprobe',
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'json',
            filepath
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        data = json.loads(result.stdout)
        duration = float(data['format']['duration'])
        return int(duration)
    except Exception as e:
        print(f"{Colors.RED}❌ Error getting video duration: {e}{Colors.NC}")
        return None

def compress_video(input_file, output_file, target_size_mb=95):
    """
    Compress video to target size

    Args:
        input_file: Path to input video
        output_file: Path to output video
        target_size_mb: Target file size in MB (default 95MB)
    """
    print_header()

    # Check FFmpeg
    if not check_ffmpeg():
        print(f"{Colors.RED}❌ Error: FFmpeg is not installed{Colors.NC}")
        print()
        print("To install FFmpeg:")
        print("  macOS:   brew install ffmpeg")
        print("  Ubuntu:  sudo apt install ffmpeg")
        print("  Windows: Download from https://ffmpeg.org/download.html")
        print()
        return False

    # Check input file
    if not os.path.exists(input_file):
        print(f"{Colors.RED}❌ Error: Input file '{input_file}' not found{Colors.NC}")
        return False

    # Get input file info
    input_size_mb = get_file_size_mb(input_file)
    print(f"{Colors.BLUE}📹 Input file:{Colors.NC} {input_file}")
    print(f"{Colors.BLUE}📊 Input size:{Colors.NC} {input_size_mb:.2f}MB")
    print(f"{Colors.BLUE}🎯 Target size:{Colors.NC} {target_size_mb}MB")
    print()

    # If file is already under target size
    if input_size_mb < target_size_mb:
        print(f"{Colors.GREEN}✅ File is already under {target_size_mb}MB!{Colors.NC}")
        print(f"{Colors.YELLOW}💡 Copying to output file without compression...{Colors.NC}")

        # Copy file
        import shutil
        shutil.copy2(input_file, output_file)

        print(f"{Colors.GREEN}✅ Done: {output_file}{Colors.NC}")
        return True

    # Get video duration
    duration = get_video_duration(input_file)
    if not duration:
        print(f"{Colors.RED}❌ Error: Could not determine video duration{Colors.NC}")
        return False

    # Calculate target bitrate
    # Formula: (target_size_mb * 8192) / duration_seconds - 128 (for audio)
    target_bitrate = int((target_size_mb * 8192 / duration) - 128)

    print(f"{Colors.BLUE}⏱️  Duration:{Colors.NC} {duration}s")
    print(f"{Colors.BLUE}🎬 Target video bitrate:{Colors.NC} {target_bitrate}k")
    print()
    print(f"{Colors.YELLOW}🔄 Compressing video... This may take a few minutes.{Colors.NC}")
    print()

    # FFmpeg compression command
    cmd = [
        'ffmpeg',
        '-i', input_file,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-b:v', f'{target_bitrate}k',
        '-maxrate', f'{int(target_bitrate * 1.5)}k',
        '-bufsize', f'{int(target_bitrate * 2)}k',
        '-vf', "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        output_file
    ]

    try:
        # Run FFmpeg
        subprocess.run(cmd, check=True)

        # Get output size
        output_size_mb = get_file_size_mb(output_file)
        reduction = int(100 - (output_size_mb * 100 / input_size_mb))

        print()
        print(f"{Colors.GREEN}========================================{Colors.NC}")
        print(f"{Colors.GREEN}✅ Compression Complete!{Colors.NC}")
        print(f"{Colors.GREEN}========================================{Colors.NC}")
        print(f"{Colors.BLUE}📁 Output file:{Colors.NC} {output_file}")
        print(f"{Colors.BLUE}📊 Output size:{Colors.NC} {output_size_mb:.2f}MB")
        print(f"{Colors.BLUE}📉 Reduction:{Colors.NC} {reduction}%")
        print()

        if output_size_mb > target_size_mb:
            print(f"{Colors.YELLOW}⚠️  Warning: Output is still {output_size_mb:.2f}MB (target was {target_size_mb}MB){Colors.NC}")
            print(f"{Colors.YELLOW}💡 Try running again with a lower target size:{Colors.NC}")
            print(f"   python3 compress-video.py \"{input_file}\" \"{output_file}\" {int(target_size_mb - 20)}")
        else:
            print(f"{Colors.GREEN}✅ File is ready for upload!{Colors.NC}")

        return True

    except subprocess.CalledProcessError as e:
        print()
        print(f"{Colors.RED}❌ Compression failed!{Colors.NC}")
        print(f"{Colors.RED}Error: {e}{Colors.NC}")
        return False

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print(f"{Colors.RED}❌ Error: No input file specified{Colors.NC}")
        print()
        print("Usage: python3 compress-video.py <input_video> [output_video] [target_size_mb]")
        print()
        print("Examples:")
        print("  python3 compress-video.py myvideo.mp4")
        print("  python3 compress-video.py myvideo.mp4 compressed.mp4")
        print("  python3 compress-video.py myvideo.mp4 compressed.mp4 50")
        print()
        sys.exit(1)

    input_file = sys.argv[1]

    # Generate output filename if not provided
    if len(sys.argv) >= 3:
        output_file = sys.argv[2]
    else:
        input_path = Path(input_file)
        output_file = str(input_path.parent / f"{input_path.stem}_compressed{input_path.suffix}")

    # Get target size
    target_size_mb = int(sys.argv[3]) if len(sys.argv) >= 4 else 95

    # Compress video
    success = compress_video(input_file, output_file, target_size_mb)

    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
