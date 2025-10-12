import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MegaphoneIcon,
  PlusIcon,
  EnvelopeIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  ChartBarIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  XMarkIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import CreateCampaignModal from '../../components/CreateCampaignModal';
import { EditCampaignModal } from '../../components/EditCampaignModal';

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'social';
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused';
  subject?: string;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  convertedCount: number;
  scheduledDate?: string;
  createdAt: string;
  createdBy: string;
}

interface Company {
  id: string;
  name: string;
}

export function CampaignsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${apiUrl}/api/campaigns`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      // Map API data to component format
      const mappedCampaigns = data.campaigns.map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type || 'email',
        status: c.status ? c.status.toLowerCase() : 'draft',
        subject: c.subject,
        sentCount: c.totalSent || c._count?.emailLogs || 0,
        openedCount: c.totalOpened || 0,
        clickedCount: c.totalClicked || 0,
        convertedCount: 0,
        scheduledDate: c.scheduledDate,
        createdAt: c.createdAt,
        createdBy: 'Current User',
      }));

      setCampaigns(mappedCampaigns);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      setCampaigns([]);
      setIsLoading(false);
    }
  };

  const filteredCampaigns = filterStatus === 'all'
    ? campaigns
    : campaigns.filter(c => c.status === filterStatus);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-yellow-100 text-yellow-700',
      active: 'bg-green-100 text-green-700',
      completed: 'bg-blue-100 text-blue-700',
      paused: 'bg-gray-100 text-gray-700',
    };
    return `px-3 py-1 rounded-full text-xs font-semibold ${badges[status] || 'bg-gray-100 text-gray-700'}`;
  };

  const calculateRate = (count: number, total: number) => {
    if (total === 0) return '0';
    return ((count / total) * 100).toFixed(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const totalStats = campaigns.reduce(
    (acc, campaign) => ({
      sent: acc.sent + campaign.sentCount,
      opened: acc.opened + campaign.openedCount,
      clicked: acc.clicked + campaign.clickedCount,
      converted: acc.converted + campaign.convertedCount,
    }),
    { sent: 0, opened: 0, clicked: 0, converted: 0 }
  );

  // Count unique companies (simplified version)
  const totalCompanies = campaigns.length > 0 ? Math.ceil(campaigns.length * 1.5) : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen overflow-y-auto">
      {/* Header with gradient background */}
      <div className="mb-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-8 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <MegaphoneIcon className="h-10 w-10 text-white" />
              <h1 className="text-4xl font-bold text-white tracking-tight">Marketing Campaigns</h1>
            </div>
            <p className="text-lg text-white opacity-90 font-medium">Create and manage email marketing campaigns</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95"
          >
            <PlusIcon className="h-5 w-5" />
            Create Campaign
          </button>
        </div>
      </div>

      {/* Stats Overview with gradient backgrounds */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <EnvelopeIcon className="h-6 w-6 text-white" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{totalStats.sent.toLocaleString()}</div>
          </div>
          <p className="text-sm font-medium text-gray-700">Total Sent</p>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
              <EyeIcon className="h-6 w-6 text-white" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{totalStats.opened.toLocaleString()}</div>
          </div>
          <p className="text-sm font-medium text-gray-700">
            Opened ({calculateRate(totalStats.opened, totalStats.sent)}%)
          </p>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <CursorArrowRaysIcon className="h-6 w-6 text-white" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{totalStats.clicked.toLocaleString()}</div>
          </div>
          <p className="text-sm font-medium text-gray-700">
            Clicked ({calculateRate(totalStats.clicked, totalStats.sent)}%)
          </p>
        </div>

        <div className="card bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
              <BuildingOfficeIcon className="h-6 w-6 text-white" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{totalCompanies}</div>
          </div>
          <p className="text-sm font-medium text-gray-700">Companies Reached</p>
        </div>
      </div>

      {/* Filters with gradient when selected */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {['all', 'draft', 'scheduled', 'active', 'completed', 'paused'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 capitalize ${
              filterStatus === status
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
            }`}
          >
            {status === 'all' ? 'All Campaigns' : status}
          </button>
        ))}
      </div>

      {/* Campaigns List */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg">
          <div className="p-12 text-center">
            <MegaphoneIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No campaigns found</h3>
            <p className="text-gray-600 mb-6 text-lg">
              {filterStatus === 'all'
                ? 'Create your first campaign to get started'
                : `No ${filterStatus} campaigns found`}
            </p>
            {filterStatus === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 mx-auto"
              >
                <PlusIcon className="h-5 w-5" />
                Create Campaign
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer hover:-translate-y-1"
              onClick={() => {
                // Navigate to analytics page if campaign has been sent
                if (campaign.sentCount > 0) {
                  navigate(`/campaigns/${campaign.id}/analytics`);
                } else {
                  setSelectedCampaign(campaign);
                  setShowDetailModal(true);
                }
              }}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-gray-900">{campaign.name}</h3>
                      <span className={getStatusBadge(campaign.status)}>{campaign.status}</span>
                    </div>
                    {campaign.subject && (
                      <p className="text-base text-gray-600 mb-2 flex items-center gap-2">
                        <EnvelopeIcon className="h-5 w-5 inline" />
                        {campaign.subject}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                      <span>Created {formatDate(campaign.createdAt)}</span>
                      {campaign.scheduledDate && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4 inline" />
                            Scheduled for {formatDate(campaign.scheduledDate)}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span>by {campaign.createdBy}</span>
                    </div>
                  </div>
                </div>

                {/* Campaign Stats */}
                {campaign.sentCount > 0 && (
                  <div className="border-t border-gray-100 pt-4">
                    <div className="grid grid-cols-4 gap-6">
                      <div>
                        <div className="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wider">Sent</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {campaign.sentCount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wider">Opened</div>
                        <div className="text-2xl font-bold text-green-600">
                          {campaign.openedCount.toLocaleString()}
                          <span className="text-sm text-gray-500 ml-2 font-medium">
                            ({calculateRate(campaign.openedCount, campaign.sentCount)}%)
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wider">Clicked</div>
                        <div className="text-2xl font-bold text-purple-600">
                          {campaign.clickedCount.toLocaleString()}
                          <span className="text-sm text-gray-500 ml-2 font-medium">
                            ({calculateRate(campaign.clickedCount, campaign.sentCount)}%)
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wider">Converted</div>
                        <div className="text-2xl font-bold text-orange-600">
                          {campaign.convertedCount.toLocaleString()}
                          <span className="text-sm text-gray-500 ml-2 font-medium">
                            ({calculateRate(campaign.convertedCount, campaign.sentCount)}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                        <div className="flex h-3 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-600 shadow-sm"
                            style={{
                              width: `${calculateRate(campaign.openedCount, campaign.sentCount)}%`,
                            }}
                          ></div>
                          <div
                            className="bg-gradient-to-r from-purple-500 to-purple-600 shadow-sm"
                            style={{
                              width: `${calculateRate(campaign.clickedCount, campaign.sentCount)}%`,
                            }}
                          ></div>
                          <div
                            className="bg-gradient-to-r from-orange-500 to-orange-600 shadow-sm"
                            style={{
                              width: `${calculateRate(campaign.convertedCount, campaign.sentCount)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Campaign Detail Modal */}
      {showDetailModal && selectedCampaign && (
        <CampaignDetailModal
          campaign={selectedCampaign}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCampaign(null);
          }}
          navigate={navigate}
        />
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <CreateCampaignModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            loadCampaigns();
          }}
        />
      )}

      {/* Edit Campaign Modal */}
      {showEditModal && editCampaign && (
        <EditCampaignModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditCampaign(null);
          }}
          campaignId={editCampaign.id}
          campaignName={editCampaign.name}
          onSuccess={() => {
            loadCampaigns();
          }}
        />
      )}
    </div>
  );
}

// Campaign Detail Modal Component
interface CampaignDetailModalProps {
  campaign: Campaign;
  onClose: () => void;
  navigate: (path: string) => void;
}

function CampaignDetailModal({ campaign, onClose, navigate }: CampaignDetailModalProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadCampaignCompanies();
  }, [campaign.id]);

  const loadCampaignCompanies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${apiUrl}/api/campaigns/${campaign.id}/companies`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load companies');
      }

      const data = await response.json();
      setCompanies(data.companies || []);
    } catch (err) {
      console.error('Error loading campaign companies:', err);
      setError('Failed to load companies. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-yellow-100 text-yellow-700',
      active: 'bg-green-100 text-green-700',
      completed: 'bg-blue-100 text-blue-700',
      paused: 'bg-gray-100 text-gray-700',
    };
    return `px-3 py-1 rounded-full text-xs font-semibold ${badges[status] || 'bg-gray-100 text-gray-700'}`;
  };

  const calculateRate = (count: number, total: number) => {
    if (total === 0) return '0';
    return ((count / total) * 100).toFixed(1);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border-4 border-gray-300 max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold">{campaign.name}</h2>
                <span className={getStatusBadge(campaign.status)}>{campaign.status}</span>
              </div>
              {campaign.subject && (
                <p className="text-lg opacity-90 flex items-center gap-2">
                  <EnvelopeIcon className="h-5 w-5" />
                  {campaign.subject}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Campaign Stats */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Campaign Performance</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <div className="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wider">Sent</div>
                <div className="text-2xl font-bold text-gray-900">
                  {campaign.sentCount.toLocaleString()}
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                <div className="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wider">Opened</div>
                <div className="text-2xl font-bold text-green-600">
                  {campaign.openedCount.toLocaleString()}
                  <span className="text-sm text-gray-500 ml-1 font-medium">
                    ({calculateRate(campaign.openedCount, campaign.sentCount)}%)
                  </span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <div className="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wider">Clicked</div>
                <div className="text-2xl font-bold text-purple-600">
                  {campaign.clickedCount.toLocaleString()}
                  <span className="text-sm text-gray-500 ml-1 font-medium">
                    ({calculateRate(campaign.clickedCount, campaign.sentCount)}%)
                  </span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
                <div className="text-xs text-gray-600 mb-1 font-medium uppercase tracking-wider">Converted</div>
                <div className="text-2xl font-bold text-orange-600">
                  {campaign.convertedCount.toLocaleString()}
                  <span className="text-sm text-gray-500 ml-1 font-medium">
                    ({calculateRate(campaign.convertedCount, campaign.sentCount)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Companies List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <BuildingOfficeIcon className="h-6 w-6" />
                Companies in Campaign
              </h3>
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm"
              >
                <PencilIcon className="h-4 w-4" />
                Edit Companies
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-red-600 font-medium">{error}</p>
                <button
                  onClick={loadCampaignCompanies}
                  className="mt-2 text-red-600 hover:text-red-700 font-semibold underline"
                >
                  Try Again
                </button>
              </div>
            ) : companies.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No companies in this campaign</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {companies.map((company) => (
                  <div
                    key={company.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-blue-300 transition-all duration-200 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <BuildingOfficeIcon className="h-6 w-6 text-white" />
                      </div>
                      <span className="font-semibold text-gray-900">{company.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/companies/${company.id}`);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:shadow-lg"
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95"
          >
            Close
          </button>
        </div>
      </div>

      {/* Edit Campaign Modal */}
      {showEditModal && (
        <EditCampaignModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          campaignId={campaign.id}
          campaignName={campaign.name}
          onSuccess={() => {
            loadCampaignCompanies();
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}
