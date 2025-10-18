import { useState, useEffect } from 'react';
import { PlusIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { dealsApi } from '../../services/api';
import { DealForm } from './DealForm';

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: 'PROSPECTING' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
  probability: number;
  expectedCloseDate?: string;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  company?: {
    id: string;
    name: string;
  };
  description?: string;
  createdAt: string;
}

const dealStages = [
  { id: 'PROSPECTING', name: 'Prospecting', color: 'bg-gray-100 border-gray-300' },
  { id: 'QUALIFICATION', name: 'Qualification', color: 'bg-blue-100 border-blue-300' },
  { id: 'PROPOSAL', name: 'Proposal', color: 'bg-yellow-100 border-yellow-300' },
  { id: 'NEGOTIATION', name: 'Negotiation', color: 'bg-orange-100 border-orange-300' },
  { id: 'CLOSED_WON', name: 'Closed Won', color: 'bg-green-100 border-green-300' },
  { id: 'CLOSED_LOST', name: 'Closed Lost', color: 'bg-red-100 border-red-300' },
];

export function DealBoard() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const loadDeals = async () => {
    try {
      setLoading(true);
      const response = await dealsApi.getAll();
      setDeals(response.deals || []);
    } catch (err) {
      setError('Failed to load deals');
      console.error('Error loading deals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeals();
  }, []);

  const handleAddDeal = () => {
    setEditingDeal(null);
    setShowModal(true);
  };

  const handleEditDeal = (deal: Deal) => {
    setEditingDeal(deal);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingDeal(null);
    loadDeals();
  };

  const handleStageChange = async (dealId: string, newStage: string) => {
    try {
      await dealsApi.updateStage(dealId, newStage);
      loadDeals();
    } catch (err) {
      setError('Failed to update deal stage');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getDealsByStage = (stage: string) => {
    return deals.filter(deal => deal.stage === stage);
  };

  const getTotalValue = (stage: string) => {
    return getDealsByStage(stage).reduce((sum, deal) => sum + deal.value, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deals Pipeline</h1>
          <p className="text-gray-600 mt-1">Track and manage your sales opportunities</p>
        </div>
        <button
          onClick={handleAddDeal}
          className="btn-secondary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Add Deal</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {dealStages.map((stage) => {
          const stageDeals = getDealsByStage(stage.id);
          const totalValue = getTotalValue(stage.id);
          
          return (
            <div key={stage.id} className="card p-4">
              <div className="text-sm font-medium text-gray-600 mb-1">{stage.name}</div>
              <div className="text-2xl font-bold text-gray-900">{stageDeals.length}</div>
              <div className="text-sm text-gray-500">{formatCurrency(totalValue)}</div>
            </div>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
        {dealStages.map((stage) => {
          const stageDeals = getDealsByStage(stage.id);
          
          return (
            <div key={stage.id} className="flex flex-col">
              {/* Stage Header */}
              <div className={`p-4 rounded-t-lg border-2 ${stage.color}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                  <span className="text-sm text-gray-600">
                    {stageDeals.length}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {formatCurrency(getTotalValue(stage.id))}
                </div>
              </div>

              {/* Deal Cards */}
              <div className={`flex-1 p-3 bg-gray-50 rounded-b-lg border-x-2 border-b-2 ${stage.color.replace('bg-', 'border-').split(' ')[1]} min-h-96`}>
                <div className="space-y-3">
                  {stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleEditDeal(deal)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 text-sm leading-tight">
                          {deal.title}
                        </h4>
                        <div className="text-xs text-gray-500 ml-2">
                          {deal.probability}%
                        </div>
                      </div>
                      
                      <div className="flex items-center text-primary-600 mb-2">
                        <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                        <span className="font-semibold text-sm">
                          {formatCurrency(deal.value)}
                        </span>
                      </div>

                      {deal.contact && (
                        <div className="text-xs text-gray-600 mb-1">
                          {deal.contact.firstName} {deal.contact.lastName}
                        </div>
                      )}

                      {deal.company && (
                        <div className="text-xs text-gray-600 mb-2">
                          {deal.company.name}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          Close: {formatDate(deal.expectedCloseDate)}
                        </div>
                        
                        {/* Stage Change Dropdown */}
                        <select
                          value={deal.stage}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleStageChange(deal.id, e.target.value);
                          }}
                          className="text-xs border-0 bg-transparent text-gray-500 cursor-pointer hover:text-gray-700"
                          title="Change stage"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {dealStages.map((stageOption) => (
                            <option key={stageOption.id} value={stageOption.id}>
                              {stageOption.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}

                  {/* Empty State */}
                  {stageDeals.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-400 text-sm">No deals in this stage</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deal Form Modal */}
      {showModal && (
        <DealForm
          deal={editingDeal}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}