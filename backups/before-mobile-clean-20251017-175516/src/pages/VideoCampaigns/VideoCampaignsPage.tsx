import { useState, useEffect } from 'react';
import {
  PlusIcon,
  VideoCameraIcon,
  EyeIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { CreateVideoCampaignModal } from '../../components/CreateVideoCampaignModal';
import { VideoGenerationProgress } from '../../components/VideoGenerationProgress';
import { videoService, type VideoCampaign } from '../../services/videoService';
import { buttonStyles } from '../../config/ui';

export function VideoCampaignsPage() {
  const [campaigns, setCampaigns] = useState<VideoCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    loadCampaigns();
    // Poll for status updates every 10 seconds
    const interval = setInterval(loadCampaigns, 10000);
    return () => clearInterval(interval);
  }, [selectedStatus]);

  const loadCampaigns = async () => {
    try {
      const result = await videoService.getCampaigns({
        status: selectedStatus === 'all' ? undefined : selectedStatus,
      });
      setCampaigns(result.campaigns);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      await videoService.deleteCampaign(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete campaign');
    }
  };

  const handleDownload = (videoUrl: string, name: string) => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `${name}.mp4`;
    link.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY':
        return 'bg-green-100 text-green-800';
      case 'GENERATING':
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredCampaigns = campaigns;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Video Campaigns</h1>
              <p className="text-sm text-gray-600 mt-1">
                Create personalized marketing videos with AI
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className={`flex items-center justify-center gap-2 ${buttonStyles.gradient.primary}`}
            >
              <PlusIcon className="w-5 h-5" />
              <span>Create Campaign</span>
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap gap-2">
            {['all', 'DRAFT', 'GENERATING', 'READY', 'FAILED'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setSelectedStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                  selectedStatus === status
                    ? 'bg-blue-600 text-white shadow-sm'
                    : `${buttonStyles.secondary}`
                }`}
              >
                {status === 'all' ? 'All' : status.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                <div className="aspect-video bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredCampaigns.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-6">
              <VideoCameraIcon className="w-12 h-12 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No video campaigns yet
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Create your first video campaign with AI-powered narration, custom templates, and
              professional overlays
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className={`inline-flex items-center gap-2 ${buttonStyles.gradient.primary}`}
            >
              <PlusIcon className="w-5 h-5" />
              Create Your First Campaign
            </button>
          </div>
        ) : (
          /* Campaigns Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden"
              >
                {/* Video Preview or Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 relative group">
                  {campaign.videoUrl ? (
                    <video
                      src={campaign.videoUrl}
                      poster={campaign.thumbnailUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  ) : campaign.thumbnailUrl ? (
                    <img
                      src={campaign.thumbnailUrl}
                      alt={campaign.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <VideoCameraIcon className="w-16 h-16 text-gray-400" />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        campaign.status
                      )}`}
                    >
                      {campaign.status}
                    </span>
                  </div>
                </div>

                {/* Campaign Info */}
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">
                    {campaign.name}
                  </h3>

                  {/* Progress Indicator for Generating */}
                  {(campaign.status === 'GENERATING' || campaign.status === 'PROCESSING') && (
                    <div className="mb-3">
                      <VideoGenerationProgress
                        status={campaign.status}
                        progress={campaign.jobs?.[0]?.progress || 0}
                        currentStep={campaign.jobs?.[0]?.currentStep || 'Initializing...'}
                      />
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    {campaign._count && (
                      <span className="flex items-center gap-1">
                        👥 {campaign._count.companies} companies
                      </span>
                    )}
                    {campaign.views > 0 && (
                      <span className="flex items-center gap-1">
                        <EyeIcon className="w-4 h-4" /> {campaign.views}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {campaign.videoUrl && campaign.status === 'READY' && (
                      <>
                        <button
                          onClick={() => window.open(campaign.videoUrl, '_blank')}
                          className={`flex-1 flex items-center justify-center gap-2 ${buttonStyles.primary} text-sm`}
                        >
                          <PlayIcon className="w-4 h-4" />
                          Play
                        </button>
                        <button
                          onClick={() => handleDownload(campaign.videoUrl!, campaign.name)}
                          className={`flex items-center justify-center px-3 py-2 ${buttonStyles.secondary}`}
                          title="Download"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border-2 border-red-200"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Error Message */}
                  {campaign.status === 'FAILED' && campaign.generationError && (
                    <p className="mt-2 text-xs text-red-600">{campaign.generationError}</p>
                  )}

                  {/* Metadata */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Created {new Date(campaign.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Campaign Count */}
        {!loading && filteredCampaigns.length > 0 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Showing {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateVideoCampaignModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadCampaigns}
      />
    </div>
  );
}
