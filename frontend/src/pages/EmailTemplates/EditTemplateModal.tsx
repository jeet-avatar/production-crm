import { Fragment, useState, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, EyeIcon, DocumentTextIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface EditTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateData: any) => Promise<void>;
  template: {
    id: string;
    name: string;
    subject: string;
    htmlContent: string;
    textContent: string | null;
    variables: string[];
  };
}

interface VideoCampaign {
  id: string;
  name: string;
  videoUrl: string;
  thumbnailUrl: string;
}

export function EditTemplateModal({ isOpen, onClose, onSave, template }: EditTemplateModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [videos, setVideos] = useState<VideoCampaign[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingClientLogo, setIsUploadingClientLogo] = useState(false);
  const [isUploadingCompanyLogo, setIsUploadingCompanyLogo] = useState(false);

  const getDraftKey = () => `emailTemplate_draft_${template.id}`;

  // Handle video file upload
  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('🎬 Starting video upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileSizeMB: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      fileType: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    // Validate file type
    if (!file.type.startsWith('video/')) {
      alert('Please select a valid video file');
      return;
    }

    // Validate file size (100MB max for best performance)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      alert(`Video file is too large (${fileSizeMB} MB). Maximum size is 100MB.\n\nTo compress your video:\n1. Use online tools like HandBrake or CloudConvert\n2. Or use FFmpeg: ffmpeg -i input.mp4 -vcodec libx264 -crf 28 output.mp4\n3. Target resolution: 1920x1080 or 1280x720\n4. Target bitrate: 2-4 Mbps`);
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Create a local preview of the video immediately
      const localVideoUrl = URL.createObjectURL(file);
      console.log('📹 Created local video preview:', localVideoUrl);

      // Update form data with local preview immediately so it shows in the template
      setFormData(prev => ({
        ...prev,
        videoUrl: localVideoUrl, // Temporary local URL
        videoThumbnailUrl: '', // Will generate thumbnail from video
        videoTitle: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
      }));

      const token = localStorage.getItem('crmToken');
      if (!token) {
        alert('Not authenticated. Please log in again.');
        return;
      }

      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('video', file);
      formData.append('name', file.name);
      formData.append('description', `Uploaded from Email Templates on ${new Date().toLocaleDateString()}`);
      formData.append('category', 'Email Campaign');

      console.log('📤 Sending upload request to /api/video-campaigns/templates/upload');

      // Upload using XMLHttpRequest to track progress
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener('load', async () => {
        console.log('📥 Upload response received:', {
          status: xhr.status,
          statusText: xhr.statusText,
          responseLength: xhr.responseText?.length
        });

        if (xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);
          console.log('✅ Video uploaded to S3:', response);

          // Update the preview with the actual S3 URL (replace local blob URL)
          setFormData(prev => ({
            ...prev,
            videoUrl: response.videoUrl, // Replace local URL with S3 URL
            videoThumbnailUrl: response.thumbnailUrl || '', // Use S3 thumbnail if available
          }));

          // Create a campaign with the uploaded video
          const campaignResponse = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/video-campaigns', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
              narrationScript: 'Custom uploaded video',
              videoSource: 'CUSTOM_UPLOAD',
              customVideoUrl: response.videoUrl,
              tone: 'professional',
            }),
          });

          if (!campaignResponse.ok) {
            const errorText = await campaignResponse.text();
            console.error('❌ Campaign creation failed:', errorText);
            throw new Error('Failed to create campaign with uploaded video');
          }

          const campaignData = await campaignResponse.json();
          console.log('✅ Campaign created:', campaignData);

          // Refresh the video list
          await fetchVideoCampaigns();

          // Auto-select the newly uploaded video - need to wait a bit for state to update
          setTimeout(() => {
            handleVideoSelect(campaignData.campaign.id);
          }, 500);

          alert('Video uploaded successfully!');
        } else if (xhr.status === 413) {
          console.error('❌ 413 Payload Too Large error:', {
            fileSize: file.size,
            fileSizeMB: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
            fileName: file.name,
            responseText: xhr.responseText
          });
          throw new Error(`Payload too large error. File size: ${(file.size / (1024 * 1024)).toFixed(2)} MB. Please check server configuration.`);
        } else {
          console.error('❌ Upload failed:', {
            status: xhr.status,
            statusText: xhr.statusText,
            responseText: xhr.responseText
          });
          const errorData = xhr.responseText ? JSON.parse(xhr.responseText) : {};
          throw new Error(errorData.error || `Upload failed with status ${xhr.status}`);
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        console.error('❌ XHR error during upload');
        // Clear the local preview on error
        setFormData(prev => ({
          ...prev,
          videoUrl: '',
          videoThumbnailUrl: '',
          videoTitle: '',
        }));
        alert('Upload failed. Please try again.');
      });

      xhr.addEventListener('abort', () => {
        console.log('⚠️ Upload cancelled by user');
        // Clear the local preview on abort
        setFormData(prev => ({
          ...prev,
          videoUrl: '',
          videoThumbnailUrl: '',
          videoTitle: '',
        }));
        alert('Upload cancelled.');
      });

      // Send the request
      xhr.open('POST', (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/video-campaigns/templates/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);

    } catch (err: any) {
      console.error('Video upload error:', err);
      // Clear the local preview on error
      setFormData(prev => ({
        ...prev,
        videoUrl: '',
        videoThumbnailUrl: '',
        videoTitle: '',
      }));
      alert(err.message || 'Failed to upload video. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle client logo upload
  const handleClientLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('Client logo upload started:', file.name, file.type, file.size);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Image file is too large. Maximum size is 5MB.');
      return;
    }

    try {
      setIsUploadingClientLogo(true);

      const token = localStorage.getItem('crmToken');
      if (!token) {
        alert('Not authenticated. Please log in again.');
        setIsUploadingClientLogo(false);
        return;
      }

      const logoFormData = new FormData();
      logoFormData.append('logo', file);

      console.log('Uploading client logo to API...');
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/video-campaigns/upload-logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: logoFormData,
      });

      console.log('Client logo upload response status:', response.status);

      if (!response.ok) {
        let errorMessage = `Upload failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('Client logo upload error:', errorData);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          const errorText = await response.text();
          console.error('Client logo upload error (raw):', errorText);
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Client logo uploaded successfully:', data);

      if (!data.logoUrl) {
        throw new Error('Server did not return a logo URL');
      }

      setFormData(prev => ({ ...prev, clientLogoUrl: data.logoUrl }));
      alert('Client logo uploaded successfully!');
    } catch (err: any) {
      console.error('❌ Client logo upload error:', err);
      alert(`Failed to upload client logo: ${err.message}`);
    } finally {
      setIsUploadingClientLogo(false);
    }
  };

  // Handle company logo upload
  const handleCompanyLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('Company logo upload started:', file.name, file.type, file.size);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Image file is too large. Maximum size is 5MB.');
      return;
    }

    try {
      setIsUploadingCompanyLogo(true);

      const token = localStorage.getItem('crmToken');
      if (!token) {
        alert('Not authenticated. Please log in again.');
        setIsUploadingCompanyLogo(false);
        return;
      }

      const logoFormData = new FormData();
      logoFormData.append('logo', file);

      console.log('Uploading company logo to API...');
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/video-campaigns/upload-logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: logoFormData,
      });

      console.log('Company logo upload response status:', response.status);

      if (!response.ok) {
        let errorMessage = `Upload failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('Company logo upload error:', errorData);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          const errorText = await response.text();
          console.error('Company logo upload error (raw):', errorText);
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Company logo uploaded successfully:', data);

      if (!data.logoUrl) {
        throw new Error('Server did not return a logo URL');
      }

      setFormData(prev => ({ ...prev, companyLogoUrl: data.logoUrl }));
      alert('Company logo uploaded successfully!');
    } catch (err: any) {
      console.error('❌ Company logo upload error:', err);
      alert(`Failed to upload company logo: ${err.message}`);
    } finally {
      setIsUploadingCompanyLogo(false);
    }
  };

  // Template customization fields - NO hardcoded values
  const [formData, setFormData] = useState({
    // Basic Info
    templateName: template.name,
    subject: template.subject,

    // Content
    toName: '',
    headline: '',
    bodyContent: '',

    // Video
    selectedVideoId: '',
    videoUrl: '',
    videoThumbnailUrl: '',
    videoTitle: '',

    // Logos
    clientLogoUrl: '',
    companyLogoUrl: '',

    // Colors
    primaryColor: '#F97316', // Orange - default color only
    secondaryColor: '#FB7185', // Rose - default color only
    textOnGradient: '#000000', // Black text on gradient - default color only

    // Company Info
    companyName: '',
    senderName: '',
    senderTitle: '',
    companyAddress: '',
    companyCity: '',
    companyState: '',
    companyZip: '',
    contactEmail: '',
    contactPhone: '',

    // Social Media
    linkedInUrl: '',
    twitterUrl: '',
    facebookUrl: '',
    youtubeUrl: '',

    // Legal
    unsubscribeUrl: '',
    privacyPolicyUrl: '',
  });

  // Check for existing draft when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchVideoCampaigns();

      // Check for saved draft
      const draftKey = getDraftKey();
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          const draftAge = Date.now() - draft.timestamp;
          // Only show recovery if draft is less than 24 hours old
          if (draftAge < 24 * 60 * 60 * 1000) {
            setShowDraftRecovery(true);
          } else {
            // Clear old draft
            localStorage.removeItem(draftKey);
          }
        } catch (error) {
          console.error('Error loading draft:', error);
        }
      }
    }
  }, [isOpen]);

  // Auto-save to localStorage every 5 seconds
  useEffect(() => {
    if (!isOpen) return;

    const autoSaveInterval = setInterval(() => {
      const draftKey = getDraftKey();
      const draftData = {
        formData,
        timestamp: Date.now(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      console.log('Auto-saved draft at', new Date().toLocaleTimeString());
    }, 5000); // Auto-save every 5 seconds

    return () => clearInterval(autoSaveInterval);
  }, [isOpen, formData]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [formData]);

  const fetchVideoCampaigns = async () => {
    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/video-campaigns', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Map campaigns to expected video format
        const mappedVideos = (data.campaigns || []).map((campaign: any) => ({
          id: campaign.id,
          name: campaign.name,
          // Use customVideoUrl for uploaded videos, videoUrl for generated ones
          videoUrl: campaign.customVideoUrl || campaign.videoUrl || '',
          thumbnailUrl: campaign.thumbnailUrl || campaign.template?.thumbnailUrl || '',
        }));
        setVideos(mappedVideos);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const handleVideoSelect = (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    console.log('🎬 Video selected:', { videoId, video, allVideos: videos });
    if (video) {
      const newVideoData = {
        selectedVideoId: video.id,
        videoUrl: video.videoUrl,
        videoThumbnailUrl: video.thumbnailUrl || video.videoUrl, // Fallback to video URL if no thumbnail
        videoTitle: video.name,
      };
      console.log('✅ Setting video data:', newVideoData);
      setFormData(prev => ({
        ...prev,
        ...newVideoData,
      }));
    } else {
      console.warn('⚠️ Video not found for ID:', videoId);
    }
  };

  const generateUpdatedHTML = () => {
    const gradient = `linear-gradient(to right, ${formData.primaryColor}, ${formData.secondaryColor})`;

    // Debug logging
    console.log('🎥 Generating HTML with video data:', {
      videoUrl: formData.videoUrl,
      videoThumbnailUrl: formData.videoThumbnailUrl,
      videoTitle: formData.videoTitle,
      selectedVideoId: formData.selectedVideoId,
    });

    // ALWAYS show video - use actual embedded player if video available, otherwise show logos placeholder
    const thumbnailSrc = formData.videoThumbnailUrl || createLogoPlaceholder();

    // Create placeholder SVG with client and company logos
    function createLogoPlaceholder() {
      // If we have both logos, show them side by side
      if (formData.clientLogoUrl && formData.companyLogoUrl) {
        return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"%3E%3Cdefs%3E%3ClinearGradient id="grad" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23667eea;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%23764ba2;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill="url(%23grad)" width="1920" height="1080"/%3E%3Cimage href="' + encodeURIComponent(formData.clientLogoUrl) + '" x="580" y="390" width="300" height="100" preserveAspectRatio="xMidYMid meet"/%3E%3Cimage href="' + encodeURIComponent(formData.companyLogoUrl) + '" x="1040" y="390" width="300" height="100" preserveAspectRatio="xMidYMid meet"/%3E%3Ccircle cx="960" cy="640" r="80" fill="white" fill-opacity="0.9"/%3E%3Cpath d="M 930 600 L 930 680 L 1000 640 Z" fill="%23667eea"/%3E%3C/svg%3E';
      }
      // If we have only client logo
      else if (formData.clientLogoUrl) {
        return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"%3E%3Cdefs%3E%3ClinearGradient id="grad" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23667eea;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%23764ba2;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill="url(%23grad)" width="1920" height="1080"/%3E%3Cimage href="' + encodeURIComponent(formData.clientLogoUrl) + '" x="810" y="390" width="300" height="100" preserveAspectRatio="xMidYMid meet"/%3E%3Ccircle cx="960" cy="640" r="80" fill="white" fill-opacity="0.9"/%3E%3Cpath d="M 930 600 L 930 680 L 1000 640 Z" fill="%23667eea"/%3E%3C/svg%3E';
      }
      // If we have only company logo
      else if (formData.companyLogoUrl) {
        return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"%3E%3Cdefs%3E%3ClinearGradient id="grad" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23667eea;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%23764ba2;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill="url(%23grad)" width="1920" height="1080"/%3E%3Cimage href="' + encodeURIComponent(formData.companyLogoUrl) + '" x="810" y="390" width="300" height="100" preserveAspectRatio="xMidYMid meet"/%3E%3Ccircle cx="960" cy="640" r="80" fill="white" fill-opacity="0.9"/%3E%3Cpath d="M 930 600 L 930 680 L 1000 640 Z" fill="%23667eea"/%3E%3C/svg%3E';
      }
      // Default gradient with play button only (no text)
      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"%3E%3Cdefs%3E%3ClinearGradient id="grad" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23667eea;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%23764ba2;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill="url(%23grad)" width="1920" height="1080"/%3E%3Ccircle cx="960" cy="540" r="100" fill="white" fill-opacity="0.9"/%3E%3Cpath d="M 920 490 L 920 590 L 1010 540 Z" fill="%23667eea"/%3E%3C/svg%3E';
    }

    // Generate video section - For emails, use clickable thumbnail that links to video (email clients don't support <video> tags)
    const videoSection = formData.videoUrl
      ? `<div class="video-player"><a href="${formData.videoUrl}" target="_blank" style="display:block;text-decoration:none;position:relative;"><div class="video-thumbnail-wrapper"><img src="${thumbnailSrc}" alt="Click to play video" style="width:100%;height:auto;display:block;border-radius:8px;"><div class="play-button-overlay"><div class="play-icon"></div></div></div></a></div>`
      : `<div class="video-player"><div class="video-thumbnail-wrapper"><img src="${thumbnailSrc}" alt="Video Placeholder"><div class="play-button-overlay"><div class="play-icon"></div></div></div></div>`;

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${formData.subject}</title><style>body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background-color:#f3f4f6}.container{max-width:600px;margin:0 auto;background:#fff}.header{background:${gradient};padding:30px 40px;text-align:center;border-radius:8px 8px 0 0}.header img{height:60px;max-width:200px;margin:0 auto 10px;display:block}.header h1{margin:20px 0 0;color:${formData.textOnGradient};font-size:28px;font-weight:bold}.content{padding:40px;color:#1f2937;line-height:1.6}.greeting{font-size:18px;font-weight:600;margin-bottom:20px;color:#111827}.body-text{font-size:16px;color:#374151;margin-bottom:30px}.video-player{position:relative;background:linear-gradient(135deg,#fef3c7 0%,#fce7f3 100%);border-radius:12px;padding:0;margin:30px 0;border:2px solid ${formData.primaryColor};overflow:hidden}.video-thumbnail-wrapper{position:relative;width:100%;padding-top:56.25%;background:#000}.video-thumbnail-wrapper img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover}.play-button-overlay{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:80px;height:80px;background:${gradient};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,0.3);transition:all 0.3s ease;border:4px solid ${formData.textOnGradient};pointer-events:none}.play-button-overlay:hover{transform:translate(-50%,-50%) scale(1.1);box-shadow:0 6px 30px rgba(0,0,0,0.4)}.play-icon{width:0;height:0;border-left:24px solid ${formData.textOnGradient};border-top:16px solid transparent;border-bottom:16px solid transparent;margin-left:6px}.video-info{padding:20px;text-align:center;background:rgba(255,255,255,0.95)}.video-title{margin:0 0 8px 0;color:#1f2937;font-size:18px;font-weight:bold}.video-duration{color:#6b7280;font-size:14px;margin:0}.signature{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:14px}.signature-name{font-weight:600;color:#111827;font-size:16px}.footer{background-color:#1f2937;color:#9ca3af;padding:30px 40px;text-align:center;font-size:13px;line-height:1.6;border-radius:0 0 8px 8px}.footer a{color:${formData.primaryColor};text-decoration:underline;font-weight:600}@media screen and (max-width:600px){.container{width:100%!important}.header{padding:20px!important}.header h1{font-size:24px!important}.header img{height:50px!important}.content{padding:20px!important}.play-button-overlay{width:60px!important;height:60px!important}.play-icon{border-left:18px solid ${formData.textOnGradient}!important;border-top:12px solid transparent!important;border-bottom:12px solid transparent!important}.footer{padding:20px!important}}</style></head><body><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f3f4f6;padding:40px 0"><tr><td align="center"><table role="presentation" class="container" cellspacing="0" cellpadding="0" border="0" width="600"><tr><td class="header" style="background:${gradient};padding:30px 40px;text-align:center;border-radius:8px 8px 0 0;">${formData.clientLogoUrl ? `<img src="${formData.clientLogoUrl}" alt="Client Logo" style="height:60px;max-width:200px;margin:0 auto 10px;display:block;"/>` : ''}${formData.companyLogoUrl ? `<img src="${formData.companyLogoUrl}" alt="Company Logo" style="height:60px;max-width:200px;margin:0 auto 10px;display:block;">` : ''}<h1 style="margin:20px 0 0;color:${formData.textOnGradient};font-size:28px;font-weight:bold;">${formData.headline}</h1></td></tr><tr><td class="content"><div class="greeting">Hi ${formData.toName},</div><div class="body-text">${formData.bodyContent}</div>${videoSection}<div class="signature"><div class="signature-name">${formData.senderName}</div><div>${formData.senderTitle}</div><div style="margin-top:10px">${formData.companyName}</div></div></td></tr><tr><td class="footer"><div style="margin-bottom:20px"><strong>${formData.companyName}</strong><br>${formData.companyAddress}<br>${formData.companyCity}, ${formData.companyState} ${formData.companyZip}<br><a href="mailto:${formData.contactEmail}">${formData.contactEmail}</a> | ${formData.contactPhone}</div><div style="margin:20px 0"><a href="${formData.linkedInUrl}" target="_blank">LinkedIn</a> | <a href="${formData.twitterUrl}" target="_blank">Twitter</a> | <a href="${formData.facebookUrl}" target="_blank">Facebook</a> | <a href="${formData.youtubeUrl}" target="_blank">YouTube</a></div><div style="margin:20px 0"><a href="${formData.unsubscribeUrl}" target="_blank">Unsubscribe</a> | <a href="${formData.privacyPolicyUrl}" target="_blank">Privacy Policy</a></div><div style="margin-top:20px;font-size:12px;color:#6b7280">&copy; ${new Date().getFullYear()} ${formData.companyName}. All rights reserved.</div></td></tr></table></td></tr></table></body></html>`;
  };

  // Memoize the preview HTML to prevent unnecessary re-renders and keep video stable
  const previewHTML = useMemo(() => {
    return generateUpdatedHTML();
  }, [formData]); // Only regenerate when formData changes

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const htmlContent = generateUpdatedHTML();
      const updatedTemplate = {
        name: formData.templateName,
        subject: formData.subject,
        htmlContent,
        textContent: template.textContent,
        variables: template.variables,
      };

      console.log('💾 Saving template with data:', {
        name: updatedTemplate.name,
        subject: updatedTemplate.subject,
        hasVideo: formData.videoUrl ? 'YES' : 'NO',
        videoUrl: formData.videoUrl,
        htmlContentLength: htmlContent.length,
        htmlContentPreview: htmlContent.substring(0, 500),
      });

      await onSave(updatedTemplate);

      console.log('✅ Template saved successfully');

      // Clear draft after successful save
      localStorage.removeItem(getDraftKey());
      setHasUnsavedChanges(false);

      onClose();
    } catch (error) {
      console.error('❌ Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close? Your changes have been auto-saved and can be recovered when you reopen this template.'
      );
      if (!confirmClose) return;
    }
    onClose();
  };

  const handleRecoverDraft = () => {
    const draftKey = getDraftKey();
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setFormData(draft.formData);
        setShowDraftRecovery(false);
      } catch (error) {
        console.error('Error recovering draft:', error);
      }
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(getDraftKey());
    setShowDraftRecovery(false);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="text-2xl font-bold text-black">
                      Edit Email Template
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-xl bg-white bg-opacity-20 p-2 text-black hover:bg-opacity-30"
                      aria-label="Close"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {/* Draft Recovery Banner */}
                {showDraftRecovery && (
                  <div className="bg-blue-50 border-b-2 border-blue-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-500 text-white rounded-full p-2">
                          <DocumentTextIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-blue-900">Draft Found!</h4>
                          <p className="text-sm text-blue-700">We found unsaved changes from your previous editing session.</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleRecoverDraft}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600"
                        >
                          Recover Draft
                        </button>
                        <button
                          type="button"
                          onClick={handleDiscardDraft}
                          className="px-4 py-2 bg-white border-2 border-blue-300 text-blue-700 rounded-lg font-bold hover:bg-blue-50"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Auto-save Indicator */}
                <div className="bg-gray-100 border-b border-gray-200 px-6 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-600">
                      {hasUnsavedChanges ? (
                        <span className="text-orange-600 font-medium">● Auto-saving every 5 seconds...</span>
                      ) : (
                        <span className="text-green-600 font-medium">✓ All changes saved</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="flex h-[80vh]">
                  {/* Left: Form */}
                  <div className="w-1/2 overflow-y-auto border-r border-gray-200 p-6">
                    <div className="space-y-6">
                      {/* Basic Info */}
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Basic Information</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                            <input
                              type="text"
                              value={formData.templateName}
                              onChange={(e) => setFormData(prev => ({ ...prev, templateName: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                            <input
                              type="text"
                              value={formData.subject}
                              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Email Content</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">To Name (Recipient)</label>
                            <input
                              type="text"
                              value={formData.toName || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, toName: e.target.value }))}
                              placeholder="John"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">This will be used in "Hi John," greeting</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                            <input
                              type="text"
                              value={formData.headline}
                              onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Body Content</label>
                            <textarea
                              value={formData.bodyContent}
                              onChange={(e) => setFormData(prev => ({ ...prev, bodyContent: e.target.value }))}
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Video Selection */}
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Video</h3>
                        <div className="space-y-3">
                          {videos.length === 0 ? (
                            <div className="space-y-3">
                              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="flex-shrink-0">
                                    <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-bold text-yellow-900">No Videos in Library</h4>
                                    <p className="text-sm text-yellow-700 mt-1">Upload a video from your computer or create a new video campaign.</p>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  type="button"
                                  onClick={() => window.location.href = '/campaigns'}
                                  className="px-4 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-black rounded-lg font-bold hover:shadow-lg transition-all"
                                  disabled={isUploading}
                                >
                                  <div className="flex items-center justify-center gap-2">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-sm">Create Campaign</span>
                                  </div>
                                </button>

                                <label className={`cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                  <input
                                    type="file"
                                    accept="video/*"
                                    className="hidden"
                                    onChange={handleVideoUpload}
                                    disabled={isUploading}
                                  />
                                  <div className="px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all">
                                    <div className="flex items-center justify-center gap-2">
                                      {isUploading ? (
                                        <>
                                          <svg className="h-5 w-5 text-orange-600 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                          </svg>
                                          <span className="text-sm font-medium text-gray-700">{uploadProgress}%</span>
                                        </>
                                      ) : (
                                        <>
                                          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                          </svg>
                                          <span className="text-sm font-medium text-gray-700">Upload Video</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </label>
                              </div>

                              {/* Upload Progress Bar */}
                              {isUploading && (
                                <div className="mt-3">
                                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="bg-gradient-to-r from-orange-500 to-rose-500 h-2 transition-all duration-300"
                                      style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                  </div>
                                  <p className="text-xs text-gray-600 mt-1 text-center">Uploading video... {uploadProgress}%</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select from Video Library</label>
                                <select
                                  value={formData.selectedVideoId}
                                  onChange={(e) => handleVideoSelect(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                >
                                  <option value="">-- Select a video --</option>
                                  {videos.map(video => (
                                    <option key={video.id} value={video.id}>{video.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="flex-1 border-t border-gray-300"></div>
                                <span className="text-sm text-gray-500 font-medium">OR</span>
                                <div className="flex-1 border-t border-gray-300"></div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Upload New Video</label>
                                <button
                                  type="button"
                                  onClick={() => window.location.href = '/campaigns'}
                                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all"
                                >
                                  <div className="flex items-center justify-center gap-2">
                                    <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="text-sm font-medium text-gray-700">Upload Video to Library</span>
                                  </div>
                                </button>
                                <p className="text-xs text-gray-500 mt-1">This will take you to Video Campaigns to upload</p>
                              </div>
                            </>
                          )}

                          {formData.videoUrl && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-sm font-medium text-green-900">✓ Video selected: {formData.videoTitle}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Logos */}
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Logos</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              <PhotoIcon className="h-4 w-4 inline mr-1" />
                              Client Logo URL (Optional)
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="url"
                                value={formData.clientLogoUrl}
                                onChange={(e) => setFormData(prev => ({ ...prev, clientLogoUrl: e.target.value }))}
                                placeholder="https://example.com/client-logo.png"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              />
                              <label className={`cursor-pointer ${isUploadingClientLogo ? 'opacity-50' : ''}`}>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleClientLogoUpload}
                                  disabled={isUploadingClientLogo}
                                />
                                <div className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors">
                                  {isUploadingClientLogo ? (
                                    <svg className="h-5 w-5 text-gray-600 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                  ) : (
                                    <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                  )}
                                </div>
                              </label>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              <PhotoIcon className="h-4 w-4 inline mr-1" />
                              Company Logo URL (Critical River)
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="url"
                                value={formData.companyLogoUrl}
                                onChange={(e) => setFormData(prev => ({ ...prev, companyLogoUrl: e.target.value }))}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              />
                              <label className={`cursor-pointer ${isUploadingCompanyLogo ? 'opacity-50' : ''}`}>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleCompanyLogoUpload}
                                  disabled={isUploadingCompanyLogo}
                                />
                                <div className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors">
                                  {isUploadingCompanyLogo ? (
                                    <svg className="h-5 w-5 text-gray-600 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                  ) : (
                                    <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                  )}
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Colors */}
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Brand Colors</h3>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                            <input
                              type="color"
                              value={formData.primaryColor}
                              onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                              className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                            />
                            <span className="text-xs text-gray-500 mt-1">{formData.primaryColor}</span>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                            <input
                              type="color"
                              value={formData.secondaryColor}
                              onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                              className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                            />
                            <span className="text-xs text-gray-500 mt-1">{formData.secondaryColor}</span>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Text on Gradient</label>
                            <input
                              type="color"
                              value={formData.textOnGradient}
                              onChange={(e) => setFormData(prev => ({ ...prev, textOnGradient: e.target.value }))}
                              className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                            />
                            <span className="text-xs text-gray-500 mt-1">{formData.textOnGradient}</span>
                          </div>
                        </div>
                      </div>

                      {/* Company Info */}
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Company Information</h3>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                              <input
                                type="text"
                                value={formData.companyName}
                                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Sender Name</label>
                              <input
                                type="text"
                                value={formData.senderName}
                                onChange={(e) => setFormData(prev => ({ ...prev, senderName: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sender Title</label>
                            <input
                              type="text"
                              value={formData.senderTitle}
                              onChange={(e) => setFormData(prev => ({ ...prev, senderTitle: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                            <input
                              type="text"
                              value={formData.companyAddress}
                              onChange={(e) => setFormData(prev => ({ ...prev, companyAddress: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                              <input
                                type="text"
                                value={formData.companyCity}
                                onChange={(e) => setFormData(prev => ({ ...prev, companyCity: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                              <input
                                type="text"
                                value={formData.companyState}
                                onChange={(e) => setFormData(prev => ({ ...prev, companyState: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                              <input
                                type="text"
                                value={formData.companyZip}
                                onChange={(e) => setFormData(prev => ({ ...prev, companyZip: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                              <input
                                type="email"
                                value={formData.contactEmail}
                                onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                              <input
                                type="tel"
                                value={formData.contactPhone}
                                onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Social Media */}
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Social Media Links</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                            <input
                              type="url"
                              value={formData.linkedInUrl}
                              onChange={(e) => setFormData(prev => ({ ...prev, linkedInUrl: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Twitter</label>
                            <input
                              type="url"
                              value={formData.twitterUrl}
                              onChange={(e) => setFormData(prev => ({ ...prev, twitterUrl: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
                            <input
                              type="url"
                              value={formData.facebookUrl}
                              onChange={(e) => setFormData(prev => ({ ...prev, facebookUrl: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">YouTube</label>
                            <input
                              type="url"
                              value={formData.youtubeUrl}
                              onChange={(e) => setFormData(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Legal Links */}
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Legal Links</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Unsubscribe URL</label>
                            <input
                              type="url"
                              value={formData.unsubscribeUrl}
                              onChange={(e) => setFormData(prev => ({ ...prev, unsubscribeUrl: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Privacy Policy URL</label>
                            <input
                              type="url"
                              value={formData.privacyPolicyUrl}
                              onChange={(e) => setFormData(prev => ({ ...prev, privacyPolicyUrl: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Live Preview */}
                  <div className="w-1/2 bg-gray-50 p-6 overflow-y-auto">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Live Preview</h3>
                      <p className="text-sm text-gray-600">See your changes in real-time</p>
                    </div>
                    <div
                      className="bg-white rounded-lg shadow-lg"
                      dangerouslySetInnerHTML={{ __html: previewHTML }}
                    />
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-black rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Template'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
