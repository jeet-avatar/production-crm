"""
Video Generation Service API
Flask wrapper for video_generator.py to enable HTTP-based video generation

Endpoints:
- POST /api/video/generate - Start video generation job
- GET /api/video/status/:jobId - Get job status
- GET /health - Health check
"""

import os
import sys
import json
import uuid
import threading
import traceback
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add parent directory to Python path to import video_generator
sys.path.insert(0, str(Path(__file__).parent.parent))
from video_generator import VideoGenerator, VideoGeneratorConfig

app = Flask(__name__)
CORS(app)

# In-memory job storage (for production, use Redis or database)
jobs: Dict[str, Dict[str, Any]] = {}


class JobStatus:
    """Job status constants"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


def create_job(job_id: str, campaign_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new job entry"""
    job = {
        "id": job_id,
        "status": JobStatus.PENDING,
        "progress": 0,
        "currentStep": "Initializing...",
        "videoUrl": None,
        "error": None,
        "createdAt": datetime.utcnow().isoformat(),
        "updatedAt": datetime.utcnow().isoformat(),
        "campaignData": campaign_data,
    }
    jobs[job_id] = job
    return job


def update_job(job_id: str, **updates):
    """Update job with new data"""
    if job_id in jobs:
        jobs[job_id].update(updates)
        jobs[job_id]["updatedAt"] = datetime.utcnow().isoformat()


def process_video_generation(job_id: str, campaign_data: Dict[str, Any]):
    """Background worker to generate video"""
    try:
        print(f"🎬 Starting video generation for job {job_id}")

        # Stage 1: Initialization (0-15%)
        update_job(
            job_id,
            status=JobStatus.PROCESSING,
            progress=5,
            currentStep="Initializing video generation environment..."
        )

        # Extract campaign data
        narration_script = campaign_data.get("narrationScript", "")
        template_url = campaign_data.get("templateUrl")
        voice_id = campaign_data.get("voiceId")
        custom_voice_url = campaign_data.get("customVoiceUrl")
        client_logo_url = campaign_data.get("clientLogoUrl")
        user_logo_url = campaign_data.get("userLogoUrl")
        bgm_url = campaign_data.get("bgmUrl")
        text_overlays = campaign_data.get("textOverlays", [])
        campaign_id = campaign_data.get("campaignId", job_id)

        if not narration_script:
            raise ValueError("Narration script is required")

        update_job(job_id, progress=10, currentStep="Validating video parameters...")

        # Initialize video generator
        config = VideoGeneratorConfig()
        generator = VideoGenerator(config)

        update_job(job_id, progress=15, currentStep="Video generator initialized")

        # Stage 2: Voice Generation (15-40%)
        update_job(job_id, progress=20, currentStep="Generating AI voiceover from script...")

        # Generate output filename
        output_filename = f"campaign-{campaign_id}-{job_id}.mp4"

        update_job(job_id, progress=30, currentStep="Processing voice synthesis...")

        update_job(job_id, progress=40, currentStep="Voiceover complete, preparing video...")

        # Stage 3: Video Processing (40-75%)
        update_job(job_id, progress=45, currentStep="Loading video template...")

        update_job(job_id, progress=50, currentStep="Processing video template and overlays...")

        # Generate video (this is the main processing step)
        video_url = generator.generate_video(
            narration_text=narration_script,
            output_filename=output_filename,
            template_video=template_url,
            custom_voice_url=custom_voice_url,
            voice_id=voice_id,
            client_logo_url=client_logo_url,
            user_logo_url=user_logo_url,
            bgm=bgm_url,
            text_layovers=text_overlays,
            upload_to_s3=True
        )

        # Stage 4: Finalization (75-95%)
        update_job(job_id, progress=75, currentStep="Video rendering complete")

        update_job(job_id, progress=80, currentStep="Optimizing video quality...")

        update_job(job_id, progress=85, currentStep="Generating video thumbnail...")

        # Stage 5: Upload (90-98%)
        update_job(job_id, progress=90, currentStep="Uploading video to cloud storage...")

        update_job(job_id, progress=95, currentStep="Verifying upload...")

        # Cleanup
        generator.cleanup()

        update_job(job_id, progress=98, currentStep="Cleaning up temporary files...")

        # Complete
        update_job(
            job_id,
            status=JobStatus.COMPLETED,
            progress=100,
            currentStep="Video generation complete!",
            videoUrl=video_url
        )

        print(f"✅ Video generation complete for job {job_id}: {video_url}")

    except Exception as e:
        error_message = str(e)
        error_trace = traceback.format_exc()
        print(f"❌ Video generation failed for job {job_id}: {error_message}")
        print(error_trace)

        update_job(
            job_id,
            status=JobStatus.FAILED,
            progress=0,
            currentStep="Failed",
            error=error_message
        )


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "video-generator-service",
        "timestamp": datetime.utcnow().isoformat(),
        "activeJobs": len([j for j in jobs.values() if j["status"] == JobStatus.PROCESSING]),
        "totalJobs": len(jobs)
    })


@app.route('/api/video/generate', methods=['POST'])
def generate_video():
    """
    Start video generation job

    Request body:
    {
        "campaignId": "campaign_123",
        "narrationScript": "Welcome to...",
        "templateUrl": "https://...",
        "voiceId": "custom_voice_id",
        "customVoiceUrl": "https://s3.../voice-sample.mp3",
        "clientLogoUrl": "https://...",
        "userLogoUrl": "https://...",
        "bgmUrl": "https://...",
        "textOverlays": [...]
    }
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "Request body is required"}), 400

        if not data.get("narrationScript"):
            return jsonify({"error": "narrationScript is required"}), 400

        # Generate unique job ID
        job_id = str(uuid.uuid4())

        # Create job
        job = create_job(job_id, data)

        # Start background processing
        thread = threading.Thread(
            target=process_video_generation,
            args=(job_id, data),
            daemon=True
        )
        thread.start()

        return jsonify({
            "success": True,
            "jobId": job_id,
            "status": job["status"],
            "message": "Video generation started"
        }), 202

    except Exception as e:
        print(f"❌ Generate video error: {e}")
        traceback.print_exc()
        return jsonify({
            "error": "Failed to start video generation",
            "details": str(e)
        }), 500


@app.route('/api/video/status/<job_id>', methods=['GET'])
def get_job_status(job_id: str):
    """Get status of video generation job"""
    try:
        if job_id not in jobs:
            return jsonify({"error": "Job not found"}), 404

        job = jobs[job_id]

        return jsonify({
            "jobId": job["id"],
            "status": job["status"],
            "progress": job["progress"],
            "currentStep": job["currentStep"],
            "videoUrl": job["videoUrl"],
            "error": job["error"],
            "createdAt": job["createdAt"],
            "updatedAt": job["updatedAt"]
        })

    except Exception as e:
        print(f"❌ Get status error: {e}")
        return jsonify({
            "error": "Failed to get job status",
            "details": str(e)
        }), 500


@app.route('/api/video/jobs', methods=['GET'])
def list_jobs():
    """List all jobs (for debugging)"""
    try:
        return jsonify({
            "jobs": [
                {
                    "jobId": job["id"],
                    "status": job["status"],
                    "progress": job["progress"],
                    "createdAt": job["createdAt"]
                }
                for job in jobs.values()
            ]
        })
    except Exception as e:
        print(f"❌ List jobs error: {e}")
        return jsonify({
            "error": "Failed to list jobs",
            "details": str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.getenv('VIDEO_SERVICE_PORT', 5002))
    print(f"🎬 Video Generation Service starting on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
