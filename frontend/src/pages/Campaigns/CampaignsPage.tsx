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
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import CreateCampaignModal from '../../components/CreateCampaignModal';
import { EditCampaignModal } from '../../components/EditCampaignModal';
import { CampaignsHelpGuide } from '../../components/CampaignsHelpGuide';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { gradients } = useTheme();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

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
      draft: 'bg-gray-50 text-gray-700 border-2 border-gray-300',
      scheduled: `bg-gradient-to-r ${gradients.brand.primary.gradient} text-black border-2 border-transparent`,
      active: `bg-gradient-to-r ${gradients.semantic.success?.gradient || gradients.brand.primary.gradient} text-black border-2 border-transparent`,
      completed: `bg-gradient-to-r ${gradients.brand.primary.gradient} text-black border-2 border-transparent`,
      paused: 'bg-gray-50 text-gray-700 border-2 border-gray-300',
    };
    return `px-3 py-1 rounded-full text-xs font-bold shadow-sm ${badges[status] || 'bg-gray-50 text-gray-700 border-2 border-gray-300'}`;
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
          <div className={`h-8 bg-gradient-to-r ${gradients.brand.primary.gradient} opacity-20 rounded-xl w-1/4`}></div>
          <div className={`h-64 bg-gradient-to-r ${gradients.brand.primary.gradient} opacity-20 rounded-xl`}></div>
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

  // Count total campaigns (each campaign = 1 in the count)
  const totalCompanies = campaigns.length;

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen overflow-y-auto">
      {/* Header with gradient background */}
      <div className={`mb-8 bg-gradient-to-r ${gradients.brand.primary.gradient} text-black rounded-xl p-8 shadow-xl`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <MegaphoneIcon className="h-10 w-10 text-black" />
              <h1 className="text-4xl font-bold text-black tracking-tight">Marketing Campaigns</h1>
            </div>
            <p className="text-lg text-black font-medium">Create and manage email marketing campaigns</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowHelpGuide(true)}
              className="flex items-center gap-2 px-4 py-3 bg-white bg-opacity-20 text-black  rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 tracking-wide"
              title="Open Campaigns Help Guide"
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
              Help
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white text-black  rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 tracking-wide"
            >
              <PlusIcon className="h-5 w-5" />
              Create Campaign
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview - Button Style */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <button className={`inline-flex flex-col items-start px-4 py-2.5 rounded-xl font-bold text-sm transition-all tracking-wide bg-gradient-to-r ${gradients.brand.primary.gradient} text-black shadow-lg hover:shadow-xl hover:scale-105`}>
          <div className="flex items-center gap-3 mb-2 w-full">
            <EnvelopeIcon className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Total Sent</span>
          </div>
          <span className="text-3xl font-bold">{totalStats.sent.toLocaleString()}</span>
        </button>

        <button className={`inline-flex flex-col items-start px-4 py-2.5 rounded-xl font-bold text-sm transition-all tracking-wide bg-gradient-to-r ${gradients.brand.primary.gradient} text-black shadow-lg hover:shadow-xl hover:scale-105`}>
          <div className="flex items-center gap-3 mb-2 w-full">
            <EyeIcon className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Opened</span>
          </div>
          <span className="text-3xl font-bold">
            {totalStats.opened.toLocaleString()}
            <span className="text-base font-medium ml-2">
              ({calculateRate(totalStats.opened, totalStats.sent)}%)
            </span>
          </span>
        </button>

        <button className={`inline-flex flex-col items-start px-4 py-2.5 rounded-xl font-bold text-sm transition-all tracking-wide bg-gradient-to-r ${gradients.brand.primary.gradient} text-black shadow-lg hover:shadow-xl hover:scale-105`}>
          <div className="flex items-center gap-3 mb-2 w-full">
            <CursorArrowRaysIcon className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Clicked</span>
          </div>
          <span className="text-3xl font-bold">
            {totalStats.clicked.toLocaleString()}
            <span className="text-base font-medium ml-2">
              ({calculateRate(totalStats.clicked, totalStats.sent)}%)
            </span>
          </span>
        </button>

        <button className={`inline-flex flex-col items-start px-4 py-2.5 rounded-xl font-bold text-sm transition-all tracking-wide bg-gradient-to-r ${gradients.brand.primary.gradient} text-black shadow-lg hover:shadow-xl hover:scale-105`}>
          <div className="flex items-center gap-3 mb-2 w-full">
            <BuildingOfficeIcon className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Companies Reached</span>
          </div>
          <span className="text-3xl font-bold">{totalCompanies}</span>
        </button>
      </div>

      {/* Filters with gradient when selected */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {['all', 'draft', 'scheduled', 'active', 'completed', 'paused'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 capitalize tracking-wide ${
              filterStatus === status
                ? `bg-gradient-to-r ${gradients.brand.primary.gradient} text-black shadow-lg hover:shadow-xl hover:scale-105`
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm'
            }`}
          >
            {status === 'all' ? 'All Campaigns' : status}
          </button>
        ))}
      </div>

      {/* Campaigns List */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg">
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
                className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-black rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 mx-auto tracking-wide`}
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
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer hover:-translate-y-1"
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
                        <div className="text-xs text-gray-600 mb-1 font-bold uppercase tracking-wider">Opened</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {campaign.openedCount.toLocaleString()}
                          <span className="text-sm text-gray-600 ml-2 font-medium">
                            ({calculateRate(campaign.openedCount, campaign.sentCount)}%)
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1 font-bold uppercase tracking-wider">Clicked</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {campaign.clickedCount.toLocaleString()}
                          <span className="text-sm text-gray-600 ml-2 font-medium">
                            ({calculateRate(campaign.clickedCount, campaign.sentCount)}%)
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1 font-bold uppercase tracking-wider">Converted</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {campaign.convertedCount.toLocaleString()}
                          <span className="text-sm text-gray-600 ml-2 font-medium">
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
                            className={`bg-gradient-to-r ${gradients.semantic.success?.gradient || gradients.brand.primary.gradient} shadow-sm`}
                            style={{
                              width: `${calculateRate(campaign.openedCount, campaign.sentCount)}%`,
                            }}
                          ></div>
                          <div
                            className={`bg-gradient-to-r ${gradients.brand.primary.gradient} shadow-sm`}
                            style={{
                              width: `${calculateRate(campaign.clickedCount, campaign.sentCount)}%`,
                            }}
                          ></div>
                          <div
                            className={`bg-gradient-to-r ${gradients.brand.primary.gradient} shadow-sm`}
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

      {/* Help Guide */}
      {showHelpGuide && (
        <CampaignsHelpGuide onClose={() => setShowHelpGuide(false)} />
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
  const { gradients } = useTheme();
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
      draft: 'bg-gray-50 text-gray-700 border-2 border-gray-300',
      scheduled: `bg-gradient-to-r ${gradients.brand.primary.gradient} text-black border-2 border-transparent`,
      active: `bg-gradient-to-r ${gradients.semantic.success?.gradient || gradients.brand.primary.gradient} text-black border-2 border-transparent`,
      completed: `bg-gradient-to-r ${gradients.brand.primary.gradient} text-black border-2 border-transparent`,
      paused: 'bg-gray-50 text-gray-700 border-2 border-gray-300',
    };
    return `px-3 py-1 rounded-full text-xs font-bold shadow-sm ${badges[status] || 'bg-gray-50 text-gray-700 border-2 border-gray-300'}`;
  };

  const calculateRate = (count: number, total: number) => {
    if (total === 0) return '0';
    return ((count / total) * 100).toFixed(1);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl border-2 border-gray-200 max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Gradient Header */}
        <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-white p-6`}>
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
              className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-xl transition-colors"
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
              <button className={`inline-flex flex-col items-start p-4 rounded-xl font-bold text-sm transition-all tracking-wide bg-gradient-to-r ${gradients.brand.primary.gradient} text-white shadow-lg hover:shadow-xl hover:scale-105`}>
                <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-2">Sent</div>
                <div className="text-2xl font-bold">
                  {campaign.sentCount.toLocaleString()}
                </div>
              </button>
              <button className={`inline-flex flex-col items-start p-4 rounded-xl font-bold text-sm transition-all tracking-wide bg-gradient-to-r ${gradients.brand.primary.gradient} text-white shadow-lg hover:shadow-xl hover:scale-105`}>
                <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-2">Opened</div>
                <div className="text-2xl font-bold">
                  {campaign.openedCount.toLocaleString()}
                  <span className="text-base font-medium ml-1 opacity-90">
                    ({calculateRate(campaign.openedCount, campaign.sentCount)}%)
                  </span>
                </div>
              </button>
              <button className={`inline-flex flex-col items-start p-4 rounded-xl font-bold text-sm transition-all tracking-wide bg-gradient-to-r ${gradients.brand.primary.gradient} text-white shadow-lg hover:shadow-xl hover:scale-105`}>
                <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-2">Clicked</div>
                <div className="text-2xl font-bold">
                  {campaign.clickedCount.toLocaleString()}
                  <span className="text-base font-medium ml-1 opacity-90">
                    ({calculateRate(campaign.clickedCount, campaign.sentCount)}%)
                  </span>
                </div>
              </button>
              <button className={`inline-flex flex-col items-start p-4 rounded-xl font-bold text-sm transition-all tracking-wide bg-gradient-to-r ${gradients.brand.primary.gradient} text-white shadow-lg hover:shadow-xl hover:scale-105`}>
                <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-2">Converted</div>
                <div className="text-2xl font-bold">
                  {campaign.convertedCount.toLocaleString()}
                  <span className="text-base font-medium ml-1 opacity-90">
                    ({calculateRate(campaign.convertedCount, campaign.sentCount)}%)
                  </span>
                </div>
              </button>
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
                className={`flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold hover:shadow-lg transition-all shadow-md tracking-wide`}
              >
                <PencilIcon className="h-4 w-4" />
                Edit Companies
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className={`animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500`}></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 text-center shadow-md">
                <p className="text-red-600 font-bold">{error}</p>
                <button
                  onClick={loadCampaignCompanies}
                  className="mt-2 text-red-600 hover:text-red-700 font-bold underline"
                >
                  Try Again
                </button>
              </div>
            ) : companies.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-8 text-center shadow-sm">
                <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-bold">No companies in this campaign</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {companies.map((company) => (
                  <div
                    key={company.id}
                    className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-orange-300 transition-all duration-200 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${gradients.brand.primary.gradient.replace('to-r', 'to-br')} rounded-xl flex items-center justify-center shadow-md`}>
                        <BuildingOfficeIcon className="h-6 w-6 text-white" />
                      </div>
                      <span className="font-bold text-gray-900">{company.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/companies/${company.id}`);
                      }}
                      className={`px-4 py-2 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:shadow-lg tracking-wide`}
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
            className={`w-full px-6 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 tracking-wide`}
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
