import { useState, useEffect } from 'react';
import { ArrowLeftIcon, PlayIcon, ArrowDownTrayIcon, ShareIcon, EnvelopeIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
import { AICampaignGenerator } from '../../components/AICampaignGenerator';
import { CreateEmailTemplateModal } from '../../components/VideoCampaigns/CreateEmailTemplateModal';
import { useNavigate } from 'react-router-dom';
import { videoService, VideoCampaign } from '../../services/videoService';

export function VideoCampaignsPage() {
  const navigate = useNavigate();
  const [generatedVideo, setGeneratedVideo] = useState<{
    url: string;
    campaignId: string;
    name: string;
    narrationScript?: string;
  } | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [previousVideos, setPreviousVideos] = useState<VideoCampaign[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [selectedVideoForModal, setSelectedVideoForModal] = useState<VideoCampaign | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  // Load previous videos on mount
  useEffect(() => {
    loadPreviousVideos();
  }, []);

  const loadPreviousVideos = async () => {
    try {
      setLoadingVideos(true);
      // Load both READY and DRAFT campaigns
      const [readyResponse, draftResponse] = await Promise.all([
        videoService.getCampaigns({ status: 'READY', limit: 20 }),
        videoService.getCampaigns({ status: 'DRAFT', limit: 10 }),
      ]);

      // Combine and sort: drafts first, then ready campaigns
      const allCampaigns = [...draftResponse.campaigns, ...readyResponse.campaigns];
      setPreviousVideos(allCampaigns);
    } catch (error) {
      console.error('Failed to load previous videos:', error);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleVideoGenerated = (videoUrl: string, campaignId: string, name: string = 'My Video Campaign', narrationScript: string = '') => {
    setGeneratedVideo({
      url: videoUrl,
      campaignId,
      name,
      narrationScript,
    });
    // Reload the video list to show the new video
    loadPreviousVideos();
    setShowCreateNew(false);
  };

  const handleEmailTemplateCreated = (templateId: string) => {
    setShowEmailModal(false);
    // Show success message
    alert('Email template created successfully! Redirecting to Email Templates...');
    // Navigate to email templates page
    navigate('/email-templates');
  };

  const handleStartNew = () => {
    setGeneratedVideo(null);
    setShowCreateNew(true);
  };

  const handleViewVideo = (campaign: VideoCampaign, event?: React.MouseEvent) => {
    // Prevent opening modal if clicking on action buttons
    if (event && (event.target as HTMLElement).closest('button')) {
      return;
    }
    setSelectedVideoForModal(campaign);
  };

  const handlePlayInline = (campaignId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setPlayingVideoId(playingVideoId === campaignId ? null : campaignId);
  };

  const handleDownload = () => {
    if (!generatedVideo) return;
    const link = document.createElement('a');
    link.href = generatedVideo.url;
    link.download = `${generatedVideo.name}.mp4`;
    link.click();
  };

  const handleShare = () => {
    if (!generatedVideo) return;
    // Copy video URL to clipboard
    navigator.clipboard.writeText(generatedVideo.url);
    alert('Video URL copied to clipboard!');
  };

  // If video is generated, show final result screen
  if (generatedVideo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-rose-50 to-orange-50 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl">
          {/* Success Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-rose-600 rounded-full mb-6 shadow-2xl">
              <PlayIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              🎉 Your Video is Ready!
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Your professional video campaign has been generated successfully.
            </p>
          </div>

          {/* Video Player */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-8">
            <div className="aspect-video bg-black relative max-h-[600px]">
              <video
                src={generatedVideo.url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Video Info */}
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {generatedVideo.name}
              </h2>
              <p className="text-gray-600 mb-6">
                Campaign ID: {generatedVideo.campaignId}
              </p>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(true)}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-600 to-rose-600 text-white rounded-xl font-bold hover:from-orange-700 hover:to-rose-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
                >
                  <EnvelopeIcon className="w-5 h-5" />
                  Send as Email
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-600 to-rose-600 text-white rounded-xl font-bold hover:from-orange-700 hover:to-rose-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  Download
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-600 to-rose-600 text-white rounded-xl font-bold hover:from-orange-700 hover:to-rose-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
                >
                  <ShareIcon className="w-5 h-5" />
                  Share
                </button>

                <button
                  type="button"
                  onClick={handleStartNew}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-600 to-rose-600 text-white rounded-xl font-bold hover:from-orange-700 hover:to-rose-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  New Video
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: '✨', title: 'AI Generated', desc: 'Fully automated creation' },
              { icon: '🎬', title: 'HD Quality', desc: '1920x1080 resolution' },
              { icon: '🚀', title: 'Ready to Use', desc: 'Download and share now' },
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-md text-center">
                <div className="text-4xl mb-2">{stat.icon}</div>
                <h4 className="font-bold text-gray-900 mb-1">{stat.title}</h4>
                <p className="text-sm text-gray-600">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Email Template Modal */}
        {generatedVideo && (
          <CreateEmailTemplateModal
            isOpen={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            campaign={{
              id: generatedVideo.campaignId,
              name: generatedVideo.name,
              narrationScript: generatedVideo.narrationScript || 'Check out this personalized video created just for you!',
              videoUrl: generatedVideo.url,
            }}
            onSuccess={handleEmailTemplateCreated}
          />
        )}
      </div>
    );
  }

  // Show create form if requested
  if (showCreateNew) {
    return <AICampaignGenerator onVideoGenerated={handleVideoGenerated} />;
  }

  // Default: Show Video Library - CLEAN MINIMAL NETFLIX/YOUTUBE STYLE WITH ORANGE-ROSE BRANDING
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-rose-50 to-orange-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header - Clean & Minimal */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 bg-clip-text text-transparent">
                Video Campaigns
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateNew(true)}
              className="flex items-center gap-3 px-8 py-4 bg-white text-gray-900 rounded-xl font-bold border-2 border-black hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl"
            >
              <VideoCameraIcon className="w-6 h-6" />
              Create New
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loadingVideos && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-500"></div>
          </div>
        )}

        {/* Empty State */}
        {!loadingVideos && previousVideos.length === 0 && (
          <div className="text-center py-32">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-orange-500 via-orange-600 to-rose-500 rounded-full mb-8 shadow-2xl">
              <VideoCameraIcon className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 bg-clip-text text-transparent mb-4">
              No videos yet
            </h2>
            <p className="text-gray-600 mb-8 text-lg">
              Create your first video campaign
            </p>
            <button
              type="button"
              onClick={() => setShowCreateNew(true)}
              className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 text-white rounded-2xl font-bold hover:shadow-2xl hover:shadow-orange-200/50 transition-all text-lg"
            >
              <VideoCameraIcon className="w-7 h-7" />
              Create Video
            </button>
          </div>
        )}

        {/* Video Grid - LARGE THUMBNAILS, NETFLIX/YOUTUBE STYLE */}
        {!loadingVideos && previousVideos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {previousVideos.map((campaign) => (
              <div
                key={campaign.id}
                className="group relative rounded-xl overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-orange-200/50"
                onClick={(e) => handlePlayInline(campaign.id, e)}
              >
                {/* LARGE 16:9 Video Thumbnail / Inline Player */}
                <div className="relative aspect-video bg-black overflow-hidden rounded-xl border-2 border-orange-200 group-hover:border-orange-500 transition-all duration-300">
                  {playingVideoId === campaign.id && campaign.videoUrl ? (
                    <video
                      src={campaign.videoUrl}
                      controls
                      autoPlay
                      className="w-full h-full object-cover"
                      onEnded={() => setPlayingVideoId(null)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      {campaign.thumbnailUrl ? (
                        <img
                          src={campaign.thumbnailUrl}
                          alt={campaign.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500 via-orange-600 to-rose-500">
                          <VideoCameraIcon className="w-32 h-32 text-white opacity-40" />
                        </div>
                      )}
                      {/* Play Button Overlay - White Circle with Orange-Rose Gradient Icon */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="w-24 h-24 flex items-center justify-center rounded-full bg-white border-2 border-orange-500 shadow-2xl transform transition-transform duration-300 group-hover:scale-110">
                          <svg className="w-12 h-12 ml-1" viewBox="0 0 24 24" fill="none">
                            <defs>
                              <linearGradient id={`playGradient-${campaign.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#f97316" />
                                <stop offset="50%" stopColor="#ea580c" />
                                <stop offset="100%" stopColor="#f43f5e" />
                              </linearGradient>
                            </defs>
                            <path d="M8 5.14v13.72L19 12 8 5.14z" fill={`url(#playGradient-${campaign.id})`} />
                          </svg>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Minimal Title - Single Line, Centered, Small */}
                <div className="mt-3">
                  <h3 className="text-sm font-semibold text-gray-900 truncate text-center">
                    {campaign.name}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Email Template Modal for library videos */}
      {generatedVideo && (
        <CreateEmailTemplateModal
          isOpen={showEmailModal}
          onClose={() => {
            setShowEmailModal(false);
            setGeneratedVideo(null);
          }}
          campaign={{
            id: generatedVideo.campaignId,
            name: generatedVideo.name,
            narrationScript: generatedVideo.narrationScript || 'Check out this personalized video!',
            videoUrl: generatedVideo.url,
          }}
          onSuccess={handleEmailTemplateCreated}
        />
      )}
    </div>
  );
}
