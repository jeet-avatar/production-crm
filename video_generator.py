"""
Video Generation Service
Creates personalized marketing videos with AI voiceover, subtitles, and company logos.

Security: All sensitive credentials must be set via environment variables.
"""

import os
import tempfile
import warnings
import time
from typing import Optional, List, Dict, Any
from io import BytesIO
from pathlib import Path

import requests
import numpy as np
import boto3
from botocore.exceptions import ClientError
from PIL import Image
from dotenv import load_dotenv
# Voice synthesis handled by backend API (supports ElevenLabs + custom voice cloning)
from moviepy.editor import (
    VideoFileClip,
    AudioFileClip,
    TextClip,
    CompositeVideoClip,
    CompositeAudioClip,
    ImageClip,
    ColorClip,
    concatenate_videoclips
)

# Load environment variables
load_dotenv()

# Configure ImageMagick for MoviePy
imagemagick_binary = os.getenv('IMAGEMAGICK_BINARY', '/opt/homebrew/bin/convert')
if os.path.exists(imagemagick_binary):
    from moviepy.config import change_settings
    change_settings({"IMAGEMAGICK_BINARY": imagemagick_binary})


class VideoGeneratorConfig:
    """Configuration for video generation service"""

    def __init__(self):
        # AWS S3 Configuration
        self.aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID')
        self.aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        self.aws_region = os.getenv('AWS_REGION', 'us-east-1')
        self.s3_bucket_name = os.getenv('S3_BUCKET_NAME', 'suiteflow-demo')
        self.cloudfront_domain = os.getenv('CLOUDFRONT_DOMAIN', 'd19p5y1qdvfz0x.cloudfront.net')

        # Default Assets
        self.default_template_video = os.getenv(
            'DEFAULT_TEMPLATE_VIDEO',
            'https://d19p5y1qdvfz0x.cloudfront.net/redbg.mp4'
        )
        self.default_bgm = os.getenv(
            'DEFAULT_BGM',
            'https://d19p5y1qdvfz0x.cloudfront.net/bgm.mp3'
        )
        self.default_disclaimer_video = os.getenv(
            'DEFAULT_DISCLAIMER_VIDEO',
            'https://d19p5y1qdvfz0x.cloudfront.net/disclamer.mp4'
        )

        # Video Settings
        self.output_directory = os.getenv('VIDEO_OUTPUT_DIR', 'static')
        self.video_width = int(os.getenv('VIDEO_WIDTH', '1920'))
        self.video_height = int(os.getenv('VIDEO_HEIGHT', '1080'))
        self.video_fps = int(os.getenv('VIDEO_FPS', '24'))
        self.default_font = os.getenv('DEFAULT_FONT', 'Avenir')

        self.validate()

    def validate(self):
        """Validate required configuration"""
        if not self.aws_access_key_id or not self.aws_secret_access_key:
            print("⚠️ Warning: AWS credentials not set. S3 upload may fail.")


class VideoGenerator:
    """Handles video generation with AI voiceover and subtitles"""

    def __init__(self, config: Optional[VideoGeneratorConfig] = None):
        self.config = config or VideoGeneratorConfig()
        self.temp_files: List[str] = []

        # Initialize S3 client
        if self.config.aws_access_key_id and self.config.aws_secret_access_key:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=self.config.aws_access_key_id,
                aws_secret_access_key=self.config.aws_secret_access_key,
                region_name=self.config.aws_region
            )
        else:
            # Use default credentials (IAM role, environment, etc.)
            self.s3_client = boto3.client('s3', region_name=self.config.aws_region)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup()

    def cleanup(self):
        """Clean up temporary files"""
        for temp_file in self.temp_files:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
                    print(f"🗑️ Cleaned up: {temp_file}")
            except Exception as e:
                print(f"⚠️ Failed to clean up {temp_file}: {e}")
        self.temp_files.clear()

    def fetch_if_url(self, path_or_url: str, file_ext: str = "mp4") -> str:
        """Download file if given a URL, otherwise return local path."""
        if not path_or_url:
            raise ValueError("path_or_url cannot be empty")

        if path_or_url.startswith("http"):
            try:
                r = requests.get(path_or_url, stream=True, timeout=30)
                r.raise_for_status()

                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}")
                for chunk in r.iter_content(chunk_size=8192):
                    temp_file.write(chunk)
                temp_file.close()

                self.temp_files.append(temp_file.name)
                print(f"⬇️ Downloaded: {path_or_url} -> {temp_file.name}")
                return temp_file.name
            except requests.RequestException as e:
                raise RuntimeError(f"Failed to download {path_or_url}: {e}")

        if not os.path.exists(path_or_url):
            raise FileNotFoundError(f"Local file not found: {path_or_url}")

        return path_or_url

    def download_logo(self, url: str) -> BytesIO:
        """Download and process logo with background removal"""
        try:
            r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
            r.raise_for_status()

            img = Image.open(BytesIO(r.content)).convert("RGBA")

            # Remove white background
            datas = img.getdata()
            newData = []
            for item in datas:
                # If pixel is mostly white, make it transparent
                if item[0] > 200 and item[1] > 200 and item[2] > 200:
                    newData.append((255, 255, 255, 0))
                else:
                    newData.append(item)

            img.putdata(newData)

            buffer = BytesIO()
            img.save(buffer, format="PNG")
            buffer.seek(0)

            print(f"✅ Logo processed: {url}")
            return buffer
        except Exception as e:
            raise RuntimeError(f"Failed to download/process logo {url}: {e}")

    def imageclip_from_buffer(self, buffer: BytesIO) -> ImageClip:
        """Create ImageClip from BytesIO buffer"""
        buffer.seek(0)
        img = Image.open(buffer).convert("RGBA")
        return ImageClip(np.array(img))

    def generate_voiceover(self, text: str, custom_voice_url: Optional[str] = None, voice_id: Optional[str] = None) -> BytesIO:
        """
        Generate voiceover audio using voice synthesis API
        Supports:
        - ElevenLabs professional voices (voice_id format: elevenlabs:voice_id)
        - Custom cloned voices (voice_id format: user_id/voice_name)
        """

        # REQUIRE voice_id - no hardcoded voices allowed
        if not voice_id:
            raise ValueError("voice_id is required! Please select a voice from the voice selector.")

        try:
            # Detect voice type for logging
            if voice_id.startswith('elevenlabs:'):
                print(f"🎤 Using ElevenLabs professional voice: {voice_id}")
            else:
                print(f"🎤 Using custom cloned voice: {voice_id}")

            # Get the backend API URL from environment or use default
            backend_url = os.getenv('BACKEND_URL', 'http://localhost:3000')
            synthesize_url = f"{backend_url}/api/video-campaigns/synthesize-voice"

            # Get service API key for service-to-service authentication
            service_api_key = os.getenv('SERVICE_API_KEY') or os.getenv('INTERNAL_API_KEY')

            if not service_api_key:
                raise ValueError("SERVICE_API_KEY environment variable not set")

            # Call the voice synthesis API (backend handles ElevenLabs vs custom voice routing)
            import requests
            response = requests.post(
                synthesize_url,
                json={
                    "text": text,
                    "voice_id": voice_id,
                    "language": "en"
                },
                headers={
                    "X-Service-API-Key": service_api_key
                },
                timeout=120  # 2 minutes timeout for synthesis
            )

            if response.status_code == 200:
                data = response.json()
                audio_url = data.get('audio_url')

                if audio_url:
                    print(f"✅ Voice synthesized successfully. Downloading from: {audio_url[:50]}...")

                    # Download the synthesized audio
                    audio_response = requests.get(audio_url, timeout=60)
                    if audio_response.status_code == 200:
                        audio_bytes_io = BytesIO(audio_response.content)
                        print("🎙️ Voice narration generated successfully.")
                        return audio_bytes_io
                    else:
                        raise RuntimeError(f"Failed to download synthesized audio: HTTP {audio_response.status_code}")
                else:
                    raise RuntimeError("No audio_url in synthesis response")
            else:
                error_detail = response.text
                print(f"❌ Voice synthesis API error: HTTP {response.status_code}")
                print(f"   Error details: {error_detail}")
                raise RuntimeError(f"Voice synthesis failed: {error_detail}")

        except Exception as e:
            print(f"❌ Voice synthesis failed: {e}")
            raise RuntimeError(f"Failed to generate voiceover. Error: {str(e)}")

    def upload_to_s3(self, local_file: str, s3_key: str) -> str:
        """Upload file to S3 and return CloudFront URL"""
        try:
            # Check if file exists and delete it
            try:
                self.s3_client.head_object(Bucket=self.config.s3_bucket_name, Key=s3_key)
                print(f"🗑️ Existing S3 object found. Deleting: {s3_key}")
                self.s3_client.delete_object(Bucket=self.config.s3_bucket_name, Key=s3_key)
            except ClientError as e:
                if e.response['Error']['Code'] != '404':
                    raise
                print(f"ℹ️ No existing S3 object found: {s3_key}")

            # Upload new file (bucket has public policy, no ACL needed)
            self.s3_client.upload_file(
                Filename=local_file,
                Bucket=self.config.s3_bucket_name,
                Key=s3_key,
                ExtraArgs={
                    'ContentType': 'video/mp4'
                }
            )
            print(f"✅ Uploaded to S3: s3://{self.config.s3_bucket_name}/{s3_key}")

            # Return S3 direct URL (public bucket policy allows public read)
            video_url = f"https://{self.config.s3_bucket_name}.s3.{self.config.aws_region}.amazonaws.com/{s3_key}"
            return video_url

        except ClientError as e:
            raise RuntimeError(f"S3 upload failed: {e}")

    def generate_video(
        self,
        narration_text: str,
        output_filename: str = "output_video.mp4",
        template_video: Optional[str] = None,
        custom_voice_url: Optional[str] = None,
        voice_id: Optional[str] = None,
        client_logo_url: Optional[str] = None,
        user_logo_url: Optional[str] = None,
        bgm: Optional[str] = None,
        text_layovers: Optional[List[Dict[str, Any]]] = None,
        selected_font: Optional[str] = None,
        upload_to_s3: bool = True
    ) -> str:
        """
        Generate personalized video with AI voiceover and subtitles

        Args:
            narration_text: Text to be narrated in the video
            output_filename: Name of output file (used for both local and S3)
            template_video: URL or path to template video
            custom_voice_url: URL to custom uploaded voice sample for cloning (deprecated - use voice_id)
            voice_id: Voice ID for synthesis
                     - ElevenLabs format: "elevenlabs:voice_id" (e.g., "elevenlabs:21m00Tcm4TlvDq8ikWAM")
                     - Custom cloned format: "user_id/voice_name"
            client_logo_url: URL to client company logo
            user_logo_url: URL to user company logo
            bgm: URL or path to background music
            text_layovers: List of text overlays with timing
            selected_font: Font for text rendering
            upload_to_s3: Whether to upload to S3

        Returns:
            URL to the generated video (S3/CloudFront if uploaded, local path otherwise)
        """
        if not narration_text or not narration_text.strip():
            raise ValueError("narration_text cannot be empty")

        # Use defaults if not provided
        template_video = template_video or self.config.default_template_video
        selected_font = selected_font or self.config.default_font

        print(f"🎬 Starting video generation: {output_filename}")
        print(f"📝 Narration: {narration_text[:100]}...")

        # Ensure output directory exists
        output_dir = Path(self.config.output_directory)
        output_dir.mkdir(parents=True, exist_ok=True)

        # Download assets
        template_video_path = self.fetch_if_url(template_video, "mp4")

        # BGM is optional - only download if provided
        bgm_path = None
        if bgm:
            try:
                bgm_path = self.fetch_if_url(bgm, "mp3")
            except Exception as e:
                print(f"⚠️ Warning: Could not download BGM ({e}). Continuing without background music...")
        else:
            print("ℹ️ No BGM URL provided. Continuing without background music...")

        # Disclaimer is optional - only download if configured
        disclaimer_path = None
        if self.config.default_disclaimer_video:
            try:
                disclaimer_path = self.fetch_if_url(self.config.default_disclaimer_video, "mp4")
            except Exception as e:
                print(f"⚠️ Warning: Could not download disclaimer video ({e}). Continuing without disclaimer...")
        else:
            print("ℹ️ No disclaimer video configured. Continuing without disclaimer...")

        # Generate voiceover with custom voice if provided
        audio_bytes_io = self.generate_voiceover(narration_text, custom_voice_url, voice_id)

        # Save audio to temp file
        temp_audio_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        temp_audio_file.write(audio_bytes_io.read())
        temp_audio_file.close()
        self.temp_files.append(temp_audio_file.name)

        # Load audio and get duration
        voiceover_audio_clip = AudioFileClip(temp_audio_file.name)
        voiceover_duration = voiceover_audio_clip.duration

        # Load or create template video
        if not template_video_path or not os.path.exists(template_video_path):
            print("⚠️ No template video found. Creating blank video.")
            video = ColorClip(
                size=(self.config.video_width, self.config.video_height),
                color=(0, 0, 0),
                duration=voiceover_duration
            ).set_fps(self.config.video_fps)
        else:
            video = VideoFileClip(template_video_path)
            if video.duration > voiceover_duration:
                video = video.subclip(0, voiceover_duration)

        # Load disclaimer
        disclaimer_duration = 0
        disclaimer_clip = None
        if disclaimer_path and os.path.exists(disclaimer_path):
            disc_clip = VideoFileClip(disclaimer_path).subclip(0, 3)
            disclaimer_clip = disc_clip.crop(
                x_center=disc_clip.w / 2,
                y_center=disc_clip.h / 2,
                width=video.w,
                height=video.h
            ).set_position("center")
            disclaimer_duration = disclaimer_clip.duration

        # Process logos if provided
        clips_to_combine = []

        if client_logo_url and user_logo_url:
            # Download and process logos
            client_logo_buffer = self.download_logo(client_logo_url)
            user_logo_buffer = self.download_logo(user_logo_url)

            # Create logo intro sequence
            logo_width = int(video.w * 0.5)
            background_clip = video.subclip(0, min(video.duration, 4)).without_audio().resize(height=video.h).resize(width=video.w)

            client_logo_img = (
                self.imageclip_from_buffer(client_logo_buffer)
                .resize(width=logo_width)
                .set_duration(2)
                .set_start(0)
                .set_position("center")
            )

            user_logo_img = (
                self.imageclip_from_buffer(user_logo_buffer)
                .resize(width=logo_width)
                .set_duration(2)
                .set_start(2)
                .set_position("center")
            )

            logo_intro = CompositeVideoClip(
                [background_clip, client_logo_img, user_logo_img]
            ).set_duration(4)

            # Compose intro sequence
            if disclaimer_clip:
                intro_sequence = concatenate_videoclips([disclaimer_clip, logo_intro])
            else:
                intro_sequence = logo_intro

            intro_duration = intro_sequence.duration
            clips_to_combine.append(intro_sequence)

            # Adjust main video timing
            video = video.subclip(
                min(video.duration, 4),
                min(video.duration, 4 + voiceover_duration)
            ).set_start(intro_duration)

            # Add fixed logos for main video
            logo_size = (180, 180)

            logo_fixed_client = (
                self.imageclip_from_buffer(client_logo_buffer)
                .resize(logo_size)
                .set_position((30, 30))
                .set_start(intro_duration)
                .set_duration(voiceover_duration)
            )

            logo_fixed_user = (
                self.imageclip_from_buffer(user_logo_buffer)
                .resize(logo_size)
                .set_position((video.w - logo_size[0] - 30, 30))
                .set_start(intro_duration)
                .set_duration(voiceover_duration)
            )

            clips_to_combine.extend([video, logo_fixed_client, logo_fixed_user])
        else:
            intro_duration = 0
            if disclaimer_clip:
                clips_to_combine.append(disclaimer_clip)
                intro_duration = disclaimer_duration
            clips_to_combine.append(video.set_start(intro_duration))

        # Prepare audio tracks
        voiceover_audio = voiceover_audio_clip.set_start(disclaimer_duration).volumex(1.0)

        # Add BGM if available
        if bgm_path and os.path.exists(bgm_path):
            bgm_audio = (
                AudioFileClip(bgm_path)
                .volumex(0.1)
                .set_start(0)
                .set_duration(intro_duration + voiceover_duration)
            )
            combined_audio = CompositeAudioClip([bgm_audio, voiceover_audio])
        else:
            # Use only voiceover if no BGM
            combined_audio = voiceover_audio

        # Add text layovers (user-defined overlays)
        if text_layovers:
            print(f"📺 Adding {len(text_layovers)} text layovers")
            for item in text_layovers:
                # Support both camelCase (startTime) and snake_case (start_time) for backwards compatibility
                start_time = item.get("startTime", item.get("start_time", 0))
                duration = item.get("duration", 3)
                text_content = item.get("text", "")
                font_size = item.get("fontSize", item.get("font_size", 100))
                color = item.get("color", "white")
                stroke_color = item.get("strokeColor", item.get("stroke_color", "black"))
                stroke_width = item.get("strokeWidth", item.get("stroke_width", 3))

                # Handle position parameter (top, center, bottom, or custom tuple)
                position = item.get("position", "center")
                if position == "top":
                    position = ("center", 100)
                elif position == "bottom":
                    position = ("center", video.h - 200)
                elif position == "center":
                    position = "center"

                overlay = (
                    TextClip(
                        text_content,
                        font=selected_font,
                        fontsize=font_size,
                        color=color,
                        stroke_color=stroke_color,
                        stroke_width=stroke_width,
                        size=(video.w - 200, None),
                        method='caption'
                    )
                    .set_start(start_time + intro_duration)
                    .set_duration(duration)
                    .set_position(position)
                )
                clips_to_combine.append(overlay)
                print(f"  ✅ {text_content} @ {start_time}s for {duration}s at {position}")

        # Compose final video
        final = CompositeVideoClip(clips_to_combine, size=(video.w, video.h))
        final = final.set_audio(combined_audio)
        final = final.subclip(0, disclaimer_duration + voiceover_duration)

        # Write video file
        local_file = output_dir / output_filename
        print(f"🎥 Rendering video to: {local_file}")
        final.write_videofile(
            str(local_file),
            fps=self.config.video_fps,
            codec="libx264",
            audio_codec="aac",
            verbose=False,
            logger=None
        )

        # Close resources
        voiceover_audio_clip.close()
        final.close()

        print(f"✅ Video generated: {local_file}")

        # Upload to S3 if requested
        if upload_to_s3:
            try:
                video_url = self.upload_to_s3(str(local_file), output_filename)
                print(f"🌐 Video URL: {video_url}")
                return video_url
            except Exception as e:
                print(f"⚠️ S3 upload failed: {e}")
                print(f"📁 Video available locally at: {local_file}")
                return str(local_file)

        return str(local_file)


def main():
    """Example usage"""
    narration_text = "Hello! Welcome to Critical River. We are excited to have you on board. Let's achieve great things together!"

    client_logo_url = "https://img.freepik.com/premium-vector/abstract-logo-design-any-corporate-brand-business-company_1253202-84182.jpg"
    user_logo_url = "https://media.licdn.com/dms/image/v2/C510BAQFXdme9gsMwUg/company-logo_200_200/company-logo_200_200/0/1630635608408/criticalriver_logo?e=1763596800&v=beta&t=-LL-ztJ0wzw_eJBdssokTgQVIR5-nVfFggyKL3edaU0"

    text_layovers = [
        {"text": "Streamline Production", "start_time": 9, "duration": 3},
    ]

    with VideoGenerator() as generator:
        video_url = generator.generate_video(
            narration_text=narration_text,
            output_filename="test_video.mp4",
            client_logo_url=client_logo_url,
            user_logo_url=user_logo_url,
            text_layovers=text_layovers,
            upload_to_s3=True
        )
        print(f"🎉 Final video URL: {video_url}")


if __name__ == "__main__":
    main()
