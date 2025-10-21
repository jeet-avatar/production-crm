import { useState } from 'react';
import { ArrowLeftIcon, PlayIcon, ArrowDownTrayIcon, ShareIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { AICampaignGenerator } from '../../components/AICampaignGenerator';
import { CreateEmailTemplateModal } from '../../components/VideoCampaigns/CreateEmailTemplateModal';
import { useNavigate } from 'react-router-dom';

export function VideoCampaignsPage() {
  const navigate = useNavigate();
  const [generatedVideo, setGeneratedVideo] = useState<{
    url: string;
    campaignId: string;
    name: string;
    narrationScript?: string;
  } | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const handleVideoGenerated = (videoUrl: string, campaignId: string, name: string = 'My Video Campaign', narrationScript: string = '') => {
    setGeneratedVideo({
      url: videoUrl,
      campaignId,
      name,
      narrationScript,
    });
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
            <div className="aspect-video bg-black">
              <video
                src={generatedVideo.url}
                controls
                autoPlay
                className="w-full h-full"
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

  // Default: Show AI Campaign Generator
  return <AICampaignGenerator onVideoGenerated={handleVideoGenerated} />;
}
