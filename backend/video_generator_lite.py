#!/usr/bin/env python3
"""
Lightweight Video Generator for BrandMonkz CRM
Uses ElevenLabs for TTS and MoviePy for video editing
No Whisper dependency - uses simple text overlays instead
"""

import os
import sys
import json
import argparse
import tempfile
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    from moviepy.editor import (
        VideoFileClip, AudioFileClip, ImageClip,
        TextClip, CompositeVideoClip, concatenate_videoclips
    )
    from PIL import Image
    import requests
    import boto3
except ImportError as e:
    logger.error(f"Missing dependency: {e}")
    logger.error("Install with: pip install moviepy pillow requests boto3")
    sys.exit(1)

# Load environment variables
load_dotenv()


class VideoGeneratorLite:
    """Lightweight video generator without ML dependencies"""

    def __init__(self):
        self.elevenlabs_api_key = os.getenv('ELEVENLABS_API_KEY')
        self.aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
        self.aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        self.aws_region = os.getenv('AWS_REGION', 'us-east-1')
        self.s3_bucket = os.getenv('S3_BUCKET_NAME', 'brandmonkz-video-campaigns')

        # Initialize S3 client
        if self.aws_access_key and self.aws_secret_key:
            self.s3_client = boto3.client(
                's3',
                region_name=self.aws_region,
                aws_access_key_id=self.aws_access_key,
                aws_secret_access_key=self.aws_secret_key
            )
        else:
            self.s3_client = None
            logger.warning("AWS credentials not found - S3 upload disabled")

        self.temp_files = []

    def cleanup(self):
        """Clean up temporary files"""
        for file_path in self.temp_files:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                logger.warning(f"Failed to clean up {file_path}: {e}")

    def generate_audio_elevenlabs(self, text: str, output_path: str) -> bool:
        """Generate audio using ElevenLabs API"""
        if not self.elevenlabs_api_key:
            logger.error("ElevenLabs API key not configured")
            return False

        try:
            from elevenlabs import generate, save

            logger.info("Generating audio with ElevenLabs...")
            audio = generate(
                text=text,
                voice="Adam",  # Professional male voice
                model="eleven_monolingual_v1"
            )

            save(audio, output_path)
            logger.info(f"Audio saved to {output_path}")
            return True

        except Exception as e:
            logger.error(f"ElevenLabs generation failed: {e}")
            return False

    def generate_audio_gtts(self, text: str, output_path: str) -> bool:
        """Fallback: Generate audio using gTTS (free, no API key needed)"""
        try:
            from gtts import gTTS

            logger.info("Generating audio with gTTS (fallback)...")
            tts = gTTS(text=text, lang='en', slow=False)
            tts.save(output_path)
            logger.info(f"Audio saved to {output_path}")
            return True

        except ImportError:
            logger.error("gTTS not installed. Install with: pip install gtts")
            return False
        except Exception as e:
            logger.error(f"gTTS generation failed: {e}")
            return False

    def download_file(self, url: str, output_path: str) -> bool:
        """Download file from URL"""
        try:
            logger.info(f"Downloading {url}...")
            response = requests.get(url, stream=True, timeout=60)
            response.raise_for_status()

            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            logger.info(f"Downloaded to {output_path}")
            return True

        except Exception as e:
            logger.error(f"Download failed: {e}")
            return False

    def resize_logo(self, logo_path: str, max_height: int = 100) -> str:
        """Resize logo to fit video"""
        try:
            img = Image.open(logo_path)
            aspect_ratio = img.width / img.height
            new_height = max_height
            new_width = int(new_height * aspect_ratio)

            img_resized = img.resize((new_width, new_height), Image.LANCZOS)

            resized_path = logo_path.replace('.', '_resized.')
            img_resized.save(resized_path)
            self.temp_files.append(resized_path)

            return resized_path

        except Exception as e:
            logger.error(f"Logo resize failed: {e}")
            return logo_path

    def create_simple_text_overlay(self, text: str, video_size: tuple, duration: float) -> TextClip:
        """Create a simple text overlay"""
        try:
            txt_clip = TextClip(
                text,
                fontsize=40,
                color='white',
                font='Arial-Bold',
                stroke_color='black',
                stroke_width=2
            )
            txt_clip = txt_clip.set_position('center').set_duration(duration)
            return txt_clip
        except Exception as e:
            logger.warning(f"Text overlay creation failed: {e}")
            return None

    def generate_video(
        self,
        script: str,
        template_url: Optional[str] = None,
        client_logo_url: Optional[str] = None,
        user_logo_url: Optional[str] = None,
        output_filename: str = "output.mp4"
    ) -> str:
        """Generate video with narration and overlays"""

        try:
            # Create temp directory
            temp_dir = tempfile.mkdtemp()
            logger.info(f"Working directory: {temp_dir}")

            # Step 1: Generate audio
            audio_path = os.path.join(temp_dir, "narration.mp3")
            self.temp_files.append(audio_path)

            audio_generated = False
            if self.elevenlabs_api_key:
                audio_generated = self.generate_audio_elevenlabs(script, audio_path)

            if not audio_generated:
                # Fallback to gTTS
                audio_generated = self.generate_audio_gtts(script, audio_path)

            if not audio_generated:
                raise Exception("Failed to generate audio")

            # Load audio to get duration
            audio_clip = AudioFileClip(audio_path)
            video_duration = audio_clip.duration
            logger.info(f"Audio duration: {video_duration:.2f} seconds")

            # Step 2: Get or create video clip
            if template_url:
                # Download template
                template_path = os.path.join(temp_dir, "template.mp4")
                self.temp_files.append(template_path)

                if self.download_file(template_url, template_path):
                    video_clip = VideoFileClip(template_path)

                    # Loop video if shorter than audio
                    if video_clip.duration < video_duration:
                        repeats = int(video_duration / video_clip.duration) + 1
                        video_clip = concatenate_videoclips([video_clip] * repeats)

                    # Trim to match audio duration
                    video_clip = video_clip.subclip(0, video_duration)
                else:
                    # Fallback to colored background
                    video_clip = ColorClip(size=(1920, 1080), color=(20, 20, 40), duration=video_duration)
            else:
                # Create colored background
                from moviepy.editor import ColorClip
                video_clip = ColorClip(size=(1920, 1080), color=(20, 20, 40), duration=video_duration)

            # Step 3: Add audio
            video_clip = video_clip.set_audio(audio_clip)

            # Step 4: Add logos
            clips = [video_clip]

            if client_logo_url and not client_logo_url.startswith('blob:'):
                logo_path = os.path.join(temp_dir, "client_logo.png")
                self.temp_files.append(logo_path)

                if self.download_file(client_logo_url, logo_path):
                    resized_logo = self.resize_logo(logo_path, max_height=80)
                    logo_clip = ImageClip(resized_logo).set_duration(video_duration)
                    logo_clip = logo_clip.set_position(('right', 'top')).margin(right=20, top=20, opacity=0)
                    clips.append(logo_clip)

            if user_logo_url and user_logo_url != 'w' and not user_logo_url.startswith('blob:'):
                logo_path = os.path.join(temp_dir, "user_logo.png")
                self.temp_files.append(logo_path)

                if self.download_file(user_logo_url, logo_path):
                    resized_logo = self.resize_logo(logo_path, max_height=80)
                    logo_clip = ImageClip(resized_logo).set_duration(video_duration)
                    logo_clip = logo_clip.set_position(('left', 'top')).margin(left=20, top=20, opacity=0)
                    clips.append(logo_clip)

            # Step 5: Composite video
            final_clip = CompositeVideoClip(clips)

            # Step 6: Write output
            output_path = os.path.join(temp_dir, output_filename)
            logger.info(f"Rendering video to {output_path}...")

            final_clip.write_videofile(
                output_path,
                fps=24,
                codec='libx264',
                audio_codec='aac',
                temp_audiofile=os.path.join(temp_dir, 'temp-audio.m4a'),
                remove_temp=True,
                logger=None  # Suppress moviepy progress bars
            )

            # Close clips
            final_clip.close()
            audio_clip.close()

            logger.info("Video generation complete!")

            # Step 7: Upload to S3
            if self.s3_client:
                s3_key = f"generated-videos/{output_filename}"
                logger.info(f"Uploading to S3: {self.s3_bucket}/{s3_key}")

                self.s3_client.upload_file(
                    output_path,
                    self.s3_bucket,
                    s3_key,
                    ExtraArgs={'ContentType': 'video/mp4'}
                )

                s3_url = f"https://{self.s3_bucket}.s3.{self.aws_region}.amazonaws.com/{s3_key}"
                logger.info(f"Video uploaded: {s3_url}")

                return s3_url
            else:
                logger.warning("S3 client not configured - video saved locally only")
                return output_path

        except Exception as e:
            logger.error(f"Video generation failed: {e}", exc_info=True)
            raise
        finally:
            self.cleanup()


def main():
    parser = argparse.ArgumentParser(description='Generate marketing videos')
    parser.add_argument('--script', required=True, help='Narration script')
    parser.add_argument('--template', help='Template video URL')
    parser.add_argument('--client-logo', help='Client logo URL')
    parser.add_argument('--user-logo', help='User logo URL')
    parser.add_argument('--output', default='output.mp4', help='Output filename')
    parser.add_argument('--campaign-id', help='Campaign ID for status updates')

    args = parser.parse_args()

    generator = VideoGeneratorLite()

    try:
        video_url = generator.generate_video(
            script=args.script,
            template_url=args.template,
            client_logo_url=args.client_logo,
            user_logo_url=args.user_logo,
            output_filename=args.output
        )

        print(json.dumps({
            'success': True,
            'video_url': video_url,
            'message': 'Video generated successfully'
        }))

        return 0

    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
