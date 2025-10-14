import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  MapPinIcon,
  BriefcaseIcon,
  ArrowLeftIcon,
  PlusIcon,
  ExclamationCircleIcon,
  FireIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  PencilIcon,
  TrashIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { companiesApi } from '../../services/api';
import { CompanyForm } from './CompanyForm';
import { CampaignSelectModal } from '../../components/CampaignSelectModal';
import { buttonStyles } from '../../config/ui';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role?: string;
  status: string;
  title?: string;
}

interface Company {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  location?: string;
  employeeCount?: string;
  website?: string;
  description?: string;
  logo?: string;
  dataSource?: string;
  importedAt?: string;
  intent?: string;
  hiringInfo?: string;
  enriched?: boolean;
  enrichedAt?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  foundedYear?: number;
  revenue?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  tags?: string[];
  technologies?: string[];
  jobPostings?: string;
  hiringIntent?: string;
  techStack?: string;
  aiPitch?: string;
  // AI Intelligence Fields
  aiDescription?: string;
  aiIndustry?: string;
  aiKeywords?: string[];
  aiCompanyType?: string;
  aiTechStack?: string[];
  aiRecentNews?: string;
  aiEmployeeRange?: string;
  aiRevenue?: string;
  aiFoundedYear?: number;
  enrichmentStatus?: string;
  contacts?: Contact[];
  _count?: {
    contacts: number;
    deals: number;
  };
  createdAt: string;
  updatedAt: string;
}

const dataSourceLabels: Record<string, { label: string; icon: string }> = {
  manual: { label: 'Manual Entry', icon: '📝' },
  apollo: { label: 'Uploaded via Apollo.io', icon: '⚡' },
  csv_import: { label: 'Manual Research', icon: '📄' },
  ai_enrichment: { label: 'AI Enrichment', icon: '✨' },
  lead_discovery: { label: 'Lead Discovery', icon: '🎯' },
};

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [socialFlowing, setSocialFlowing] = useState(false);

  useEffect(() => {
    loadCompanyDetails();
  }, [id]);

  const loadCompanyDetails = async () => {
    try {
      setLoading(true);
      const data = await companiesApi.getById(id!);

      console.log('=== COMPANY DETAIL API RESPONSE ===');
      console.log('Full response:', data);
      console.log('Company:', data.company);
      console.log('Contacts array:', data.company?.contacts);
      console.log('Contacts length:', data.company?.contacts?.length);
      console.log('===================================');

      if (data.company) {
        setCompany(data.company);
      } else {
        setError('Company not found');
      }
    } catch (err) {
      setError('Failed to load company details');
      console.error('Error loading company:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!company) return;
    setDeleting(true);
    try {
      await companiesApi.delete(company.id);
      navigate('/companies');
    } catch (err) {
      console.error('Error deleting company:', err);
      setError('Failed to delete company');
      setDeleting(false);
    }
  };

  const handleEditSuccess = () => {
    setShowEditForm(false);
    loadCompanyDetails();
  };

  const handleEnrich = async () => {
    if (!company || !company.website) return;

    try {
      setEnriching(true);
      setError('');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/enrichment/companies/${company.id}/enrich`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('crmToken')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start enrichment');
      }

      const enrichmentResult = await response.json();

      // Reload company data and contacts
      await loadCompanyDetails();
      setEnriching(false);

      // Show success message with professionals count
      if (enrichmentResult.professionalsCreated > 0) {
        alert(`✅ Company enriched successfully! ${enrichmentResult.professionalsCreated} professional contact(s) added.`);
      } else {
        alert('✅ Company enriched successfully!');
      }

    } catch (err: any) {
      console.error('Error enriching company:', err);
      setError(err.message || 'Failed to enrich company');
      setEnriching(false);
    }
  };

  // 🚀 PREMIUM FEATURE: SocialFlow Handler
  const handleSocialFlow = async () => {
    if (!company) return;

    try {
      setSocialFlowing(true);
      setError('');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/enrichment/companies/${company.id}/socialflow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('crmToken')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start SocialFlow enrichment');
      }

      const result = await response.json();

      // Reload company data
      await loadCompanyDetails();
      setSocialFlowing(false);

      // Show detailed enrichment status
      const { successCount, totalSteps, enrichmentStatus } = result;

      if (successCount === 0) {
        // All steps failed
        const errors = [];
        if (enrichmentStatus?.creditRating?.error) errors.push(`Credit Rating: ${enrichmentStatus.creditRating.error}`);
        if (enrichmentStatus?.socialMedia?.error) errors.push(`Social Media: ${enrichmentStatus.socialMedia.error}`);
        if (enrichmentStatus?.aiAnalysis?.error) errors.push(`AI Analysis: ${enrichmentStatus.aiAnalysis.error}`);

        alert(`⚠️  SocialFlow enrichment completed but no data was found.\n\nIssues:\n${errors.map(e => `• ${e}`).join('\n')}\n\nPlease ensure the company has a website URL configured and is publicly accessible.`);
      } else {
        // At least one step succeeded
        const features = [];
        if (result.socialFlowData.creditRating) features.push('✅ Credit Rating');
        if (result.socialFlowData.socialMedia?.twitter || result.socialFlowData.socialMedia?.facebook ||
            result.socialFlowData.socialMedia?.instagram || result.socialFlowData.socialMedia?.youtube) features.push('✅ Social Media');
        if (result.socialFlowData.technographics?.length > 0) features.push('✅ Tech Stack');
        if (result.socialFlowData.revenue) features.push('✅ Revenue');
        if (result.socialFlowData.employees) features.push('✅ Employees');

        const failures = [];
        if (enrichmentStatus?.creditRating?.error) failures.push(`❌ Credit Rating: ${enrichmentStatus.creditRating.error}`);
        if (enrichmentStatus?.socialMedia?.error) failures.push(`❌ Social Media: ${enrichmentStatus.socialMedia.error}`);
        if (enrichmentStatus?.aiAnalysis?.error) failures.push(`❌ AI Analysis: ${enrichmentStatus.aiAnalysis.error}`);

        let message = `✅ SocialFlow enrichment complete! (${successCount}/${totalSteps} successful)\n\n`;
        if (features.length > 0) {
          message += `Data found:\n${features.join('\n')}\n`;
        }
        if (failures.length > 0) {
          message += `\n${failures.join('\n')}`;
        }

        alert(message);
      }
    } catch (err: any) {
      console.error('Error with SocialFlow:', err);
      setError(err.message || 'Failed to enrich with SocialFlow');
      setSocialFlowing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-lg">
          {error || 'Company not found'}
        </div>
      </div>
    );
  }

  const dataSourceInfo = dataSourceLabels[company.dataSource || 'manual'];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header with back button */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/companies')}
          className="btn-secondary flex items-center gap-2 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Companies
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            {/* Company logo */}
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white text-3xl font-bold flex items-center justify-center shadow-lg">
              {company.logo ? (
                <img src={company.logo} alt={company.name} className="w-full h-full rounded-xl object-cover" />
              ) : (
                company.name.substring(0, 2).toUpperCase()
              )}
            </div>

            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{company.name}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {company.location && (
                  <span className="flex items-center gap-1">
                    <MapPinIcon className="w-4 h-4" />
                    {company.location}
                  </span>
                )}
                {company.employeeCount && (
                  <span className="flex items-center gap-1">
                    <UserGroupIcon className="w-4 h-4" />
                    {company.employeeCount} employees
                  </span>
                )}
                {company.industry && (
                  <span className="flex items-center gap-1">
                    <BuildingOfficeIcon className="w-4 h-4" />
                    {company.industry}
                  </span>
                )}
              </div>

              {/* Data source badge */}
              <div className="mt-3">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                  company.dataSource === 'apollo'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  <span>{dataSourceInfo.icon}</span>
                  {dataSourceInfo.label}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow-md"
                title="Visit website"
              >
                <GlobeAltIcon className="w-4 h-4" />
              </a>
            )}
            {company.website && company.enrichmentStatus !== 'enriching' && (
              <button
                type="button"
                onClick={handleEnrich}
                disabled={enriching}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="AI Enrich Data"
              >
                {enriching ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Enriching...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4" />
                    AI Enrich
                  </>
                )}
              </button>
            )}
            {/* 🚀 PREMIUM FEATURE: SocialFlow Button */}
            <button
              type="button"
              onClick={handleSocialFlow}
              disabled={socialFlowing}
              className={`${buttonStyles.gradient.socialFlow} disabled:opacity-50 disabled:cursor-not-allowed`}
              title="🚀 Premium: SocialFlow - Credit Rating, Social Media, Tech Stack & More"
            >
              {socialFlowing ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                  SocialFlow
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowCampaignModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2"
              title="Add to campaign"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
              Campaign
            </button>
            <button
              type="button"
              onClick={() => setShowEditForm(true)}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2"
              title="Edit company"
            >
              <PencilIcon className="w-4 h-4" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white text-sm font-semibold rounded-lg hover:from-red-700 hover:to-orange-700 transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2"
              title="Delete company"
            >
              <TrashIcon className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left column - Company details */}
        <div className="col-span-2 space-y-6">
          {/* Description card */}
          {company.description && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">About</h2>
              <p className="text-gray-700 leading-relaxed">{company.description}</p>
            </div>
          )}

          {/* Enriching Status */}
          {company.enrichmentStatus === 'enriching' && (
            <div className="bg-blue-50 rounded-lg p-4 flex items-center gap-3 border border-blue-200">
              <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-blue-800 font-medium">
                AI is analyzing this company's website and gathering intelligence...
              </span>
            </div>
          )}

          {/* AI Intelligence Section */}
          {company.enrichmentStatus === 'enriched' && company.aiDescription && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center gap-2 mb-4">
                <SparklesIcon className="w-5 h-5 text-purple-600" />
                <h2 className="text-xl font-bold text-gray-900">AI Company Intelligence</h2>
                {company.enrichedAt && (
                  <span className="text-sm text-gray-500 ml-auto">
                    Updated: {new Date(company.enrichedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* AI Description */}
                <div className="col-span-2">
                  <h3 className="font-semibold text-gray-700 mb-2">Company Overview</h3>
                  <p className="text-gray-600">{company.aiDescription}</p>
                </div>

                {/* Company Type & Industry */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Type & Industry</h3>
                  <div className="flex flex-wrap gap-2">
                    {company.aiCompanyType && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {company.aiCompanyType}
                      </span>
                    )}
                    {company.aiIndustry && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                        {company.aiIndustry}
                      </span>
                    )}
                  </div>
                </div>

                {/* Company Size */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Size & Revenue</h3>
                  <div className="text-gray-600">
                    {company.aiEmployeeRange && (
                      <p>{company.aiEmployeeRange} employees</p>
                    )}
                    {company.aiRevenue && (
                      <p>{company.aiRevenue}</p>
                    )}
                    {company.aiFoundedYear && (
                      <p className="text-gray-500 text-sm">Founded: {company.aiFoundedYear}</p>
                    )}
                  </div>
                </div>

                {/* Keywords */}
                {company.aiKeywords && company.aiKeywords.length > 0 && (
                  <div className="col-span-2">
                    <h3 className="font-semibold text-gray-700 mb-2">Keywords</h3>
                    <div className="flex flex-wrap gap-2">
                      {company.aiKeywords.map((keyword, i) => (
                        <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tech Stack */}
                {company.aiTechStack && company.aiTechStack.length > 0 && (
                  <div className="col-span-2">
                    <h3 className="font-semibold text-gray-700 mb-2">Tech Stack</h3>
                    <div className="flex flex-wrap gap-2">
                      {company.aiTechStack.map((tech, i) => (
                        <span key={i} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent News */}
                {company.aiRecentNews && (
                  <div className="col-span-2">
                    <h3 className="font-semibold text-gray-700 mb-2">Recent News & Updates</h3>
                    <p className="text-gray-600 text-sm">{company.aiRecentNews}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 🚀 PREMIUM: SocialFlow Data Display */}
          {company.socialFlowEnriched && company.socialFlowData && (
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 rounded-xl shadow-lg border-2 border-yellow-400 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z"/>
                  <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-4a1 1 0 01-1-1V6a1 1 0 011-1z"/>
                </svg>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                  SocialFlow Premium Intelligence ⭐
                </h2>
                <span className="ml-auto text-xs text-gray-500">
                  Enriched: {new Date(company.socialFlowEnrichedAt).toLocaleDateString()}
                </span>
                <button
                  onClick={handleSocialFlow}
                  disabled={socialFlowing}
                  className="ml-2 px-3 py-1 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  title="Re-enrich with latest data"
                >
                  {socialFlowing ? 'Re-enriching...' : '🔄 Re-enrich'}
                </button>
              </div>

              {/* Show Enrichment Status if available */}
              {company.socialFlowData.enrichmentStatus && (
                <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Enrichment Status:</h3>
                  <div className="space-y-1 text-xs">
                    <div className={`flex items-center gap-2 ${company.socialFlowData.enrichmentStatus.creditRating?.success ? 'text-green-700' : 'text-red-600'}`}>
                      {company.socialFlowData.enrichmentStatus.creditRating?.success ? '✅' : '❌'}
                      <span>Credit Rating {company.socialFlowData.enrichmentStatus.creditRating?.error && `- ${company.socialFlowData.enrichmentStatus.creditRating.error}`}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${company.socialFlowData.enrichmentStatus.socialMedia?.success ? 'text-green-700' : 'text-red-600'}`}>
                      {company.socialFlowData.enrichmentStatus.socialMedia?.success ? '✅' : '❌'}
                      <span>Social Media {company.socialFlowData.enrichmentStatus.socialMedia?.error && `- ${company.socialFlowData.enrichmentStatus.socialMedia.error}`}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${company.socialFlowData.enrichmentStatus.aiAnalysis?.success ? 'text-green-700' : 'text-red-600'}`}>
                      {company.socialFlowData.enrichmentStatus.aiAnalysis?.success ? '✅' : '❌'}
                      <span>AI Analysis {company.socialFlowData.enrichmentStatus.aiAnalysis?.error && `- ${company.socialFlowData.enrichmentStatus.aiAnalysis.error}`}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Credit Rating */}
                {company.socialFlowData.creditRating && (
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      📊 Credit Rating
                    </h3>
                    <div className="space-y-2">
                      {typeof company.socialFlowData.creditRating === 'object' ? (
                        Object.entries(company.socialFlowData.creditRating).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-600 capitalize">{key}:</span>
                            <span className="font-semibold text-gray-900">{String(value)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600">{JSON.stringify(company.socialFlowData.creditRating)}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Social Media */}
                {company.socialFlowData.socialMedia && (
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      🔗 Social Media Profiles
                    </h3>
                    <div className="space-y-2">
                      {company.socialFlowData.socialMedia.twitter && (
                        <a href={company.socialFlowData.socialMedia.twitter} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline">
                          <span>🐦 Twitter/X</span>
                        </a>
                      )}
                      {company.socialFlowData.socialMedia.facebook && (
                        <a href={company.socialFlowData.socialMedia.facebook} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-2 text-blue-700 hover:text-blue-900 hover:underline">
                          <span>👥 Facebook</span>
                        </a>
                      )}
                      {company.socialFlowData.socialMedia.instagram && (
                        <a href={company.socialFlowData.socialMedia.instagram} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-2 text-pink-600 hover:text-pink-800 hover:underline">
                          <span>📸 Instagram</span>
                        </a>
                      )}
                      {company.socialFlowData.socialMedia.youtube && (
                        <a href={company.socialFlowData.socialMedia.youtube} target="_blank" rel="noopener noreferrer"
                           className="flex items-center gap-2 text-red-600 hover:text-red-800 hover:underline">
                          <span>📺 YouTube</span>
                        </a>
                      )}
                      {!company.socialFlowData.socialMedia.twitter &&
                       !company.socialFlowData.socialMedia.facebook &&
                       !company.socialFlowData.socialMedia.instagram &&
                       !company.socialFlowData.socialMedia.youtube && (
                        <p className="text-gray-500 text-sm">No social media profiles found</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Tech Stack */}
                {company.socialFlowData.technographics && company.socialFlowData.technographics.length > 0 && (
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      💻 Technology Stack
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {company.socialFlowData.technographics.map((tech, i) => (
                        <span key={i} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Revenue & Funding */}
                {(company.socialFlowData.revenue || company.socialFlowData.funding) && (
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      💰 Financial Information
                    </h3>
                    <div className="space-y-2">
                      {company.socialFlowData.revenue && (
                        <div>
                          <span className="text-gray-600">Revenue:</span>
                          <p className="font-semibold text-gray-900">{company.socialFlowData.revenue}</p>
                        </div>
                      )}
                      {company.socialFlowData.funding && (
                        <div>
                          <span className="text-gray-600">Funding:</span>
                          <p className="font-semibold text-gray-900">{company.socialFlowData.funding}</p>
                        </div>
                      )}
                      {company.socialFlowData.growth && (
                        <div>
                          <span className="text-gray-600">Growth Stage:</span>
                          <p className="font-semibold text-gray-900">{company.socialFlowData.growth}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Employee Count */}
                {company.socialFlowData.employees && (
                  <div className="bg-white p-4 rounded-lg shadow-md col-span-1">
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      👥 Employee Information
                    </h3>
                    <p className="text-2xl font-bold text-purple-600">{company.socialFlowData.employees}</p>
                    <p className="text-gray-500 text-sm">Estimated employees</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Intent & Hiring Info */}
          {company.intent && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FireIcon className="w-5 h-5 text-green-600" />
                Intent of Hiring
              </h2>
              <p className="text-gray-700 leading-relaxed">{company.intent}</p>
            </div>
          )}

          {company.hiringInfo && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BriefcaseIcon className="w-5 h-5 text-purple-600" />
                Recent Hiring Activity
              </h2>
              <p className="text-gray-700 leading-relaxed">{company.hiringInfo}</p>
            </div>
          )}

          {/* Additional AI Insights */}
          {(company.hiringIntent || company.techStack || company.aiPitch) && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ExclamationCircleIcon className="w-5 h-5 text-blue-600" />
                AI Insights
              </h2>

              <div className="space-y-4">
                {company.hiringIntent && (
                  <div>
                    <div className="text-sm font-semibold text-blue-700 mb-2">Hiring Intent Analysis</div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{company.hiringIntent}</p>
                  </div>
                )}

                {company.techStack && (
                  <div>
                    <div className="text-sm font-semibold text-blue-700 mb-2">Technology Stack</div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{company.techStack}</p>
                  </div>
                )}

                {company.aiPitch && (
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="text-sm font-semibold text-green-700 mb-2">AI Solution Pitch</div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{company.aiPitch}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact Persons */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5" />
                Contact Persons ({company.contacts?.length || 0})
              </h2>
              <button
                onClick={() => navigate(`/contacts?addContact=true&companyId=${company.id}&companyName=${encodeURIComponent(company.name)}`)}
                className="btn-primary flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                Add Contact
              </button>
            </div>

            <div className="space-y-4">
              {company.contacts && company.contacts.length > 0 ? (
                company.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/contacts/${contact.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center">
                        {(contact.firstName?.[0] || '?').toUpperCase()}{(contact.lastName?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {contact.firstName && contact.lastName
                            ? `${contact.firstName} ${contact.lastName}`
                            : contact.email || 'Unknown Contact'
                          }
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          {contact.email && (contact.firstName && contact.lastName) && (
                            <span className="flex items-center gap-1">
                              <EnvelopeIcon className="w-3 h-3" />
                              {contact.email}
                            </span>
                          )}
                          {contact.phone && (
                            <span className="flex items-center gap-1">
                              <PhoneIcon className="w-3 h-3" />
                              {contact.phone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            contact.status === 'CUSTOMER'
                              ? 'bg-green-100 text-green-700'
                              : contact.status === 'PROSPECT'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {contact.status}
                          </span>
                          {(contact.title || contact.role) && (
                            <span className="text-xs text-gray-500">{contact.title || contact.role}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `mailto:${contact.email}`;
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-white transition-colors"
                    >
                      <EnvelopeIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No contacts yet. Add the first contact for this company.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column - Quick stats & info */}
        <div className="space-y-6">
          {/* Quick stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Company Info
            </h3>
            <div className="space-y-4">
              {company.website && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Website</div>
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm break-all"
                  >
                    {company.domain || new URL(company.website).hostname}
                  </a>
                </div>
              )}

              {company.industry && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Industry</div>
                  <div className="text-sm font-medium text-gray-900">{company.industry}</div>
                </div>
              )}

              {company.location && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Headquarters</div>
                  <div className="text-sm font-medium text-gray-900">{company.location}</div>
                </div>
              )}

              {company.employeeCount && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Company Size</div>
                  <div className="text-sm font-medium text-gray-900">{company.employeeCount} employees</div>
                </div>
              )}

              {company.foundedYear && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Founded</div>
                  <div className="text-sm font-medium text-gray-900">{company.foundedYear}</div>
                </div>
              )}

              {company.phone && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Phone</div>
                  <div className="text-sm font-medium text-gray-900">{company.phone}</div>
                </div>
              )}

              {company.linkedin && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">LinkedIn</div>
                  <a
                    href={company.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                  >
                    View Profile
                    <GlobeAltIcon className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div>
                <div className="text-xs text-gray-500 mb-1">Data Source</div>
                <div className="text-sm font-medium text-gray-900">
                  {dataSourceInfo.label}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Added</div>
                <div className="text-sm font-medium text-gray-900">
                  {new Date(company.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Activity stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Activity
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Contacts</span>
                <span className="text-lg font-bold text-gray-900">{company._count?.contacts || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Deals</span>
                <span className="text-lg font-bold text-gray-900">{company._count?.deals || 0}</span>
              </div>
              {company.revenue && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Revenue</span>
                  <span className="text-lg font-bold text-gray-900">{company.revenue}</span>
                </div>
              )}
            </div>
          </div>

          {/* Job Postings */}
          {company.jobPostings && (
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <DocumentTextIcon className="w-4 h-4 text-orange-600" />
                Recent Job Postings
              </h3>
              <div className="text-xs text-gray-700 whitespace-pre-wrap bg-white p-3 rounded-lg border border-orange-200 max-h-48 overflow-y-auto">
                {company.jobPostings}
              </div>
            </div>
          )}

          {/* Technologies */}
          {company.technologies && company.technologies.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Technologies
              </h3>
              <div className="flex flex-wrap gap-2">
                {company.technologies.map((tech, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Company Modal */}
      {showEditForm && (
        <CompanyForm
          company={company}
          onClose={handleEditSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border-4 border-gray-300 max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Delete Company</h2>
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete <strong>{company?.name}</strong>?
              </p>
              {company?._count?.contacts && company._count.contacts > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm mb-4">
                  This company has {company._count.contacts} associated contact(s). They will remain in your CRM but won't be linked to this company.
                </div>
              )}
              <p className="text-sm text-gray-500 mb-6">
                This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="btn-secondary"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete Company'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Select Modal */}
      {showCampaignModal && company && (
        <CampaignSelectModal
          isOpen={showCampaignModal}
          onClose={() => setShowCampaignModal(false)}
          companyId={company.id}
          companyName={company.name}
          onSuccess={() => {
            setShowCampaignModal(false);
            loadCompanyDetails();
          }}
        />
      )}
    </div>
  );
}
