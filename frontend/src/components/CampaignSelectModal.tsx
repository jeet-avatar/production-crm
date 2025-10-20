import { useState, useEffect } from 'react';
import { XMarkIcon, PaperAirplaneIcon, PlusIcon } from '@heroicons/react/24/outline';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
  onSuccess?: () => void;
}

export function CampaignSelectModal({ isOpen, onClose, companyId, companyName, onSuccess }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignSubject, setNewCampaignSubject] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCampaigns();
      setSelectedCampaignId('');
      setError('');
      setSuccess('');
      setShowCreateNew(false);
      setNewCampaignName('');
      setNewCampaignSubject('');
    }
  }, [isOpen]);

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
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error('Error loading campaigns:', err);
      setError('Failed to load campaigns');
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newCampaignName.trim()) {
      setError('Please enter a campaign name');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');

      // Create the campaign
      const createResponse = await fetch(`${apiUrl}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newCampaignName.trim(),
          subject: newCampaignSubject.trim() || `Campaign: ${newCampaignName.trim()}`,
          status: 'DRAFT',
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        setError(createData.error || 'Failed to create campaign');
        return;
      }

      const newCampaignId = createData.campaign.id;

      // Add company to the new campaign
      const addResponse = await fetch(
        `${apiUrl}/api/campaigns/${newCampaignId}/companies/${companyId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        }
      );

      if (addResponse.ok) {
        setSuccess(`Campaign "${newCampaignName}" created and ${companyName} added successfully!`);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        setError('Campaign created but failed to add company');
      }
    } catch (err) {
      console.error('Error creating campaign:', err);
      setError('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCampaign = async () => {
    if (!selectedCampaignId) {
      setError('Please select a campaign');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');

      const response = await fetch(
        `${apiUrl}/api/campaigns/${selectedCampaignId}/companies/${companyId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSuccess(`${companyName} added to campaign successfully!`);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        setError(data.error || 'Failed to add company to campaign');
      }
    } catch (err) {
      console.error('Error adding to campaign:', err);
      setError('Failed to add company to campaign');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl border-4 border-gray-300 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Add to Campaign</h2>
            <p className="text-sm text-gray-600 mt-1">{companyName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          {!showCreateNew ? (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Campaign
              </label>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                disabled={loading || !!success}
              >
                <option value="">Choose a campaign...</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name} ({campaign.status})
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowCreateNew(true)}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange-500 hover:text-orange-600 hover:bg-orange-50 font-medium transition-all"
                disabled={loading || !!success}
              >
                <PlusIcon className="w-5 h-5" />
                Create New Campaign
              </button>
            </>
          ) : (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Name *
              </label>
              <input
                type="text"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                placeholder="e.g., Q1 Enterprise Outreach"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all mb-4"
                disabled={loading || !!success}
              />

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Subject (Optional)
              </label>
              <input
                type="text"
                value={newCampaignSubject}
                onChange={(e) => setNewCampaignSubject(e.target.value)}
                placeholder="e.g., Partnership Opportunity"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                disabled={loading || !!success}
              />

              <button
                onClick={() => {
                  setShowCreateNew(false);
                  setNewCampaignName('');
                  setNewCampaignSubject('');
                }}
                className="mt-3 text-sm text-gray-600 hover:text-gray-800 font-medium"
                disabled={loading || !!success}
              >
                ← Back to existing campaigns
              </button>
            </>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-all"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={showCreateNew ? handleCreateAndAdd : handleAddToCampaign}
            disabled={showCreateNew ? (!newCampaignName.trim() || loading || !!success) : (!selectedCampaignId || loading || !!success)}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-rose-600 text-black rounded-lg hover:from-orange-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all shadow-sm inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {showCreateNew ? 'Creating...' : 'Adding...'}
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="w-4 h-4" />
                {showCreateNew ? 'Create & Add to Campaign' : 'Add to Campaign'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
