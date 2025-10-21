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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50 to-emerald-50 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl">
          {/* Success Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-6 shadow-2xl">
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
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
                >
                  <EnvelopeIcon className="w-5 h-5" />
                  Send as Email
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  Download
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
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

  // Default: Show Video Library
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                🎬 Video Campaigns
              </h1>
              <p className="text-gray-600">
                {previousVideos.length > 0
                  ? `You have ${previousVideos.length} video campaign${previousVideos.length !== 1 ? 's' : ''}`
                  : 'Create your first AI-powered video campaign'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateNew(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
            >
              <VideoCameraIcon className="w-5 h-5" />
              Create New Video
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loadingVideos && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading your videos...</p>
          </div>
        )}

        {/* Empty State */}
        {!loadingVideos && previousVideos.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl shadow-lg">
            <VideoCameraIcon className="w-24 h-24 mx-auto text-gray-300 mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No videos yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Start creating engaging video campaigns with AI-powered personalization
            </p>
            <button
              type="button"
              onClick={() => setShowCreateNew(true)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
            >
              <VideoCameraIcon className="w-6 h-6" />
              Create Your First Video
            </button>
          </div>
        )}

        {/* Video Grid - Clean Minimal Design */}
        {!loadingVideos && previousVideos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {previousVideos.map((campaign) => (
              <div
                key={campaign.id}
                className="group border-2 border-gray-200 rounded-2xl bg-white shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-300 overflow-hidden cursor-pointer"
                onClick={(e) => handlePlayInline(campaign.id, e)}
              >
                {/* Large Video Thumbnail / Inline Player */}
                <div className="relative aspect-video bg-black overflow-hidden">
                  {playingVideoId === campaign.id && campaign.videoUrl ? (
                    <video
                      src={campaign.videoUrl}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
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
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                          <VideoCameraIcon className="w-24 h-24 text-gray-600" />
                        </div>
                      )}
                      {/* Play Button Overlay - Shows on Hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-20 h-20 flex items-center justify-center rounded-full bg-white/90 shadow-2xl">
                          <PlayIcon className="w-10 h-10 text-orange-500 ml-1" />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Title Only - One Line, Centered */}
                <div className="p-4">
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
