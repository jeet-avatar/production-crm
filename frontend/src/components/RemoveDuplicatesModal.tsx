import { useState, useEffect } from 'react';
import { XMarkIcon, ExclamationTriangleIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  createdAt: string;
}

interface DuplicateGroup {
  type: string;
  field: string;
  keep: string;
  duplicates: string[];
  contacts: Contact[];
}

interface RemoveDuplicatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function RemoveDuplicatesModal({ isOpen, onClose, onComplete }: RemoveDuplicatesModalProps) {
  const [currentStep, setCurrentStep] = useState(1); // 1: Detecting, 2: Review, 3: Removing, 4: Complete
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [selectedDuplicates, setSelectedDuplicates] = useState<Set<string>>(new Set());
  const [totalDuplicates, setTotalDuplicates] = useState(0);
  const [removedCount, setRemovedCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      detectDuplicates();
    }
  }, [isOpen]);

  const detectDuplicates = async () => {
    try {
      setCurrentStep(1);
      setError('');

      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/contacts/detect-duplicates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to detect duplicates');
      }

      const data = await response.json();
      setDuplicateGroups(data.groups);
      setTotalDuplicates(data.totalDuplicates);

      // Pre-select all duplicates (not the ones to keep)
      const allDuplicateIds = new Set<string>();
      data.groups.forEach((group: DuplicateGroup) => {
        group.duplicates.forEach(id => allDuplicateIds.add(id));
      });
      setSelectedDuplicates(allDuplicateIds);

      setCurrentStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to detect duplicates');
      setCurrentStep(2);
    }
  };

  const removeDuplicates = async () => {
    try {
      setCurrentStep(3);
      setError('');

      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/contacts/remove-duplicates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          duplicateIds: Array.from(selectedDuplicates),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove duplicates');
      }

      const data = await response.json();
      setRemovedCount(data.removedCount);
      setCurrentStep(4);
    } catch (err: any) {
      setError(err.message || 'Failed to remove duplicates');
      setCurrentStep(2);
    }
  };

  const toggleDuplicate = (id: string) => {
    const newSelected = new Set(selectedDuplicates);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDuplicates(newSelected);
  };

  const handleClose = () => {
    setCurrentStep(1);
    setDuplicateGroups([]);
    setSelectedDuplicates(new Set());
    setTotalDuplicates(0);
    setRemovedCount(0);
    setError('');
    onClose();
  };

  const handleComplete = () => {
    handleClose();
    onComplete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 px-8 py-6 relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <ExclamationTriangleIcon className="w-8 h-8" />
            Remove Duplicate Contacts
          </h2>
          <p className="text-red-100 mt-2">
            Find and remove duplicate contacts from your database
          </p>
        </div>

        {/* Progress Steps */}
        <div className="px-8 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-red-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentStep >= 1 ? 'bg-red-600 text-white' : 'bg-gray-300'}`}>
                1
              </div>
              <span className="font-medium">Detecting</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${currentStep >= 2 ? 'bg-red-600' : 'bg-gray-300'}`} />

            <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-red-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentStep >= 2 ? 'bg-red-600 text-white' : 'bg-gray-300'}`}>
                2
              </div>
              <span className="font-medium">Review</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${currentStep >= 3 ? 'bg-red-600' : 'bg-gray-300'}`} />

            <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-red-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentStep >= 3 ? 'bg-red-600 text-white' : 'bg-gray-300'}`}>
                3
              </div>
              <span className="font-medium">Remove</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${currentStep >= 4 ? 'bg-green-600' : 'bg-gray-300'}`} />

            <div className={`flex items-center gap-2 ${currentStep >= 4 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentStep >= 4 ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>
                ✓
              </div>
              <span className="font-medium">Complete</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
          {/* Step 1: Detecting */}
          {currentStep === 1 && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-6"></div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Scanning for Duplicates</h3>
              <p className="text-gray-600">Please wait while we analyze your contacts...</p>
            </div>
          )}

          {/* Step 2: Review Duplicates */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-lg">
                  {error}
                </div>
              )}

              {duplicateGroups.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Duplicates Found!</h3>
                  <p className="text-gray-600">Your contact list is clean.</p>
                </div>
              ) : (
                <>
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 px-6 py-4 rounded-r-lg">
                    <p className="font-semibold text-yellow-900">
                      Found {totalDuplicates} duplicate contact{totalDuplicates !== 1 ? 's' : ''} in {duplicateGroups.length} group{duplicateGroups.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Review the duplicates below. The oldest contact in each group will be kept (highlighted in green).
                    </p>
                  </div>

                  {duplicateGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                        <h4 className="font-semibold text-gray-900">
                          Duplicate Group #{groupIndex + 1}
                          <span className="ml-2 text-sm font-normal text-gray-600">
                            ({group.type === 'email' ? 'Same Email' : group.type === 'phone' ? 'Same Phone' : 'Same Name & Company'}: {group.field})
                          </span>
                        </h4>
                      </div>
                      <div className="divide-y divide-gray-200">
                        {group.contacts.map((contact) => {
                          const isKeeping = contact.id === group.keep;
                          const isSelected = selectedDuplicates.has(contact.id);
                          return (
                            <div
                              key={contact.id}
                              className={`px-4 py-3 flex items-center justify-between ${
                                isKeeping ? 'bg-green-50' : 'bg-white'
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {contact.firstName} {contact.lastName}
                                      {isKeeping && (
                                        <span className="ml-2 px-2 py-0.5 bg-green-200 text-green-800 text-xs font-semibold rounded">
                                          KEEP
                                        </span>
                                      )}
                                    </p>
                                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                      {contact.email && <span>{contact.email}</span>}
                                      {contact.phone && <span>{contact.phone}</span>}
                                      {contact.company && <span>{contact.company}</span>}
                                      <span className="text-xs text-gray-500">
                                        Added: {new Date(contact.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {!isKeeping && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleDuplicate(contact.id)}
                                    className="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500"
                                  />
                                  <span className="text-sm text-gray-700">Remove</span>
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Step 3: Removing */}
          {currentStep === 3 && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-6"></div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Removing Duplicates</h3>
              <p className="text-gray-600">Please wait...</p>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <div className="text-center py-12">
              <CheckCircleIcon className="w-20 h-20 text-green-600 mx-auto mb-6" />
              <h3 className="text-3xl font-bold text-gray-900 mb-3">Successfully Removed!</h3>
              <p className="text-xl text-gray-700 mb-2">
                {removedCount} duplicate contact{removedCount !== 1 ? 's' : ''} removed
              </p>
              <p className="text-gray-600">Your contact list has been cleaned up.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={handleClose}
            className="px-6 py-3 bg-white border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            {currentStep === 4 ? 'Close' : 'Cancel'}
          </button>

          {currentStep === 2 && duplicateGroups.length > 0 && (
            <button
              onClick={removeDuplicates}
              disabled={selectedDuplicates.size === 0}
              className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-semibold hover:from-red-700 hover:to-orange-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <TrashIcon className="w-5 h-5" />
              Remove {selectedDuplicates.size} Duplicate{selectedDuplicates.size !== 1 ? 's' : ''}
            </button>
          )}

          {currentStep === 4 && (
            <button
              onClick={handleComplete}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
