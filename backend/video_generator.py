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
from elevenlabs import ElevenLabs
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
import whisper

# Suppress FP16 warnings
warnings.filterwarnings("ignore", message="FP16 is not supported on CPU")

# Load environment variables
load_dotenv()


class VideoGeneratorConfig:
    """Configuration for video generation service"""

    def __init__(self):
        # API Keys
        self.elevenlabs_api_key = os.getenv('ELEVENLABS_API_KEY')
        self.elevenlabs_voice_id = os.getenv('ELEVENLABS_VOICE_ID', '2EiwWnXFnvU5JabPnv8n')

        # AWS S3 Configuration
        self.aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID')
        self.aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        self.aws_region = os.getenv('AWS_REGION', 'us-east-1')
        self.s3_bucket_name = os.getenv('S3_BUCKET_NAME', 'suiteflow-demo')
        self.cloudfront_domain = os.getenv('CLOUDFRONT_DOMAIN', 'd26e2s8btupe4a.cloudfront.net')

        # Default Assets
        self.default_template_video = os.getenv(
            'DEFAULT_TEMPLATE_VIDEO',
            'https://d26e2s8btupe4a.cloudfront.net/redbg.mp4'
        )
        self.default_bgm = os.getenv(
            'DEFAULT_BGM',
            'https://d26e2s8btupe4a.cloudfront.net/bgm.mp3'
        )
        self.default_disclaimer_video = os.getenv(
            'DEFAULT_DISCLAIMER_VIDEO',
            'https://d26e2s8btupe4a.cloudfront.net/disclamer.mp4'
        )

        # Video Settings
        self.output_directory = os.getenv('VIDEO_OUTPUT_DIR', 'static')
        self.video_width = int(os.getenv('VIDEO_WIDTH', '1920'))
        self.video_height = int(os.getenv('VIDEO_HEIGHT', '1080'))
        self.video_fps = int(os.getenv('VIDEO_FPS', '24'))
        self.default_font = os.getenv('DEFAULT_FONT', 'Avenir')

        # Whisper Model
        self.whisper_model_size = os.getenv('WHISPER_MODEL_SIZE', 'small')

        self.validate()

    def validate(self):
        """Validate required configuration"""
        if not self.elevenlabs_api_key:
            print("⚠️ Warning: ELEVENLABS_API_KEY not set. Will use gTTS fallback.")

        if not self.aws_access_key_id or not self.aws_secret_access_key:
            print("⚠️ Warning: AWS credentials not set. S3 upload may fail.")


class VideoGenerator:
    """Handles video generation with AI voiceover and subtitles"""

    def __init__(self, config: Optional[VideoGeneratorConfig] = None):
        self.config = config or VideoGeneratorConfig()
        self.temp_files: List[str] = []
        self.whisper_model = None

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

    def generate_voiceover(self, text: str) -> BytesIO:
        """Generate voiceover audio using ElevenLabs or gTTS fallback"""
        if self.config.elevenlabs_api_key:
            try:
                client = ElevenLabs(
                    api_key=self.config.elevenlabs_api_key,
                    base_url="https://api.elevenlabs.io/"
                )

                audio_stream = client.text_to_speech.convert(
                    voice_id=self.config.elevenlabs_voice_id,
                    output_format="mp3_44100_128",
                    text=text,
                    model_id="eleven_multilingual_v2"
                )

                audio_bytes_io = BytesIO()
                for chunk in audio_stream:
                    audio_bytes_io.write(chunk)
                audio_bytes_io.seek(0)

                print("🎙️ ElevenLabs voiceover generated successfully.")
                return audio_bytes_io
            except Exception as e:
                print(f"⚠️ ElevenLabs error: {e}")
                print("🔄 Falling back to gTTS...")

        # Fallback to gTTS
        try:
            from gtts import gTTS
            tts_buffer = BytesIO()
            tts = gTTS(text=text, lang="en", slow=False)
            tts.write_to_fp(tts_buffer)
            tts_buffer.seek(0)
            print("✅ Fallback voiceover generated using gTTS.")
            return tts_buffer
        except Exception as e:
            raise RuntimeError(f"Failed to generate voiceover: {e}")

    def get_whisper_model(self):
        """Load Whisper model (cached)"""
        if self.whisper_model is None:
            print(f"📝 Loading Whisper model: {self.config.whisper_model_size}")
            self.whisper_model = whisper.load_model(self.config.whisper_model_size)
        return self.whisper_model

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

            # Upload new file
            self.s3_client.upload_file(
                Filename=local_file,
                Bucket=self.config.s3_bucket_name,
                Key=s3_key,
                ExtraArgs={'ContentType': 'video/mp4'}
            )
            print(f"✅ Uploaded to S3: s3://{self.config.s3_bucket_name}/{s3_key}")

            # Return CloudFront URL with cache busting
            video_url = f"https://{self.config.cloudfront_domain}/{s3_key}?v={int(time.time())}"
            return video_url

        except ClientError as e:
            raise RuntimeError(f"S3 upload failed: {e}")

    def generate_video(
        self,
        narration_text: str,
        output_filename: str = "output_video.mp4",
        template_video: Optional[str] = None,
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
        bgm = bgm or self.config.default_bgm
        selected_font = selected_font or self.config.default_font

        print(f"🎬 Starting video generation: {output_filename}")
        print(f"📝 Narration: {narration_text[:100]}...")

        # Ensure output directory exists
        output_dir = Path(self.config.output_directory)
        output_dir.mkdir(parents=True, exist_ok=True)

        # Download assets
        template_video_path = self.fetch_if_url(template_video, "mp4")
        bgm_path = self.fetch_if_url(bgm, "mp3")
        disclaimer_path = self.fetch_if_url(self.config.default_disclaimer_video, "mp4")

        # Generate voiceover
        audio_bytes_io = self.generate_voiceover(narration_text)

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

        # Transcribe audio for subtitles
        model = self.get_whisper_model()
        result = model.transcribe(temp_audio_file.name)

        # Load disclaimer
        disclaimer_duration = 0
        disclaimer_clip = None
        if os.path.exists(disclaimer_path):
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
        bgm_audio = (
            AudioFileClip(bgm_path)
            .volumex(0.1)
            .set_start(0)
            .set_duration(intro_duration + voiceover_duration)
        )
        combined_audio = CompositeAudioClip([bgm_audio, voiceover_audio])

        # Generate subtitles
        subtitle_clips = []
        for seg in result["segments"]:
            start_time = disclaimer_duration + seg["start"]
            duration = seg["end"] - seg["start"]

            subtitle = (
                TextClip(
                    seg["text"],
                    font=selected_font,
                    fontsize=30,
                    color='yellow',
                    stroke_color='black',
                    stroke_width=2,
                    size=(video.w - 100, None),
                    method='caption'
                )
                .set_start(start_time)
                .set_duration(duration)
                .set_position(('center', video.h - 150))
            )
            subtitle_clips.append(subtitle)

        clips_to_combine.extend(subtitle_clips)

        # Add text layovers
        if text_layovers:
            print(f"📺 Adding {len(text_layovers)} text layovers")
            for item in text_layovers:
                overlay = (
                    TextClip(
                        item["text"],
                        font=selected_font,
                        fontsize=item.get("font_size", 100),
                        color=item.get("color", "white"),
                        stroke_color=item.get("stroke_color", "black"),
                        stroke_width=item.get("stroke_width", 3),
                        size=(video.w - 200, None),
                        method='caption'
                    )
                    .set_start(item.get("start_time", 0))
                    .set_duration(item.get("duration", 3))
                    .set_position('center')
                )
                clips_to_combine.append(overlay)
                print(f"  ✅ {item['text']} @ {item.get('start_time', 0)}s")

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
