import { useState } from 'react';
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface AutoGenerateVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (campaignId: string) => void;
}

export function AutoGenerateVideoModal({ isOpen, onClose, onSuccess }: AutoGenerateVideoModalProps) {
  const [companyName, setCompanyName] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [voiceId, setVoiceId] = useState('default');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationDetails, setGenerationDetails] = useState<any>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!companyName.trim()) {
      setError('Please enter a company name');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationDetails(null);

    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/video-campaigns/auto-generate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyName: companyName.trim(),
            additionalContext: additionalContext.trim() || undefined,
            voiceId: voiceId || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate video');
      }

      setGenerationDetails(data.campaign);

      // Show success state for 2 seconds, then call onSuccess
      setTimeout(() => {
        onSuccess(data.campaign.id);
        handleClose();
      }, 2000);
    } catch (err: any) {
      console.error('Auto-generate error:', err);
      setError(err.message || 'Failed to generate video automatically');
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setCompanyName('');
    setAdditionalContext('');
    setVoiceId('default');
    setError(null);
    setIsGenerating(false);
    setGenerationDetails(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SparklesIcon className="w-8 h-8 text-white" />
              <div>
                <h2 className="text-2xl font-bold text-white">AI Auto-Generate Video</h2>
                <p className="text-sm text-purple-100 mt-1">
                  Just enter a company name - AI does the rest!
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white p-2 rounded-lg transition-all"
              aria-label="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!generationDetails ? (
            <>
              {/* Company Name */}
              <div>
                <label htmlFor="companyName" className="block text-sm font-bold text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., BrandMonkz, Acme Corp, Tech Solutions Inc."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-lg"
                  disabled={isGenerating}
                />
              </div>

              {/* Additional Context (Optional) */}
              <div>
                <label htmlFor="additionalContext" className="block text-sm font-bold text-gray-700 mb-2">
                  Additional Context (Optional)
                </label>
                <textarea
                  id="additionalContext"
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="e.g., We're a B2B SaaS platform for project management, targeting remote teams..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  disabled={isGenerating}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Provide any details to help AI create better content (industry, target audience, etc.)
                </p>
              </div>

              {/* Voice Selection */}
              <div>
                <label htmlFor="voiceId" className="block text-sm font-bold text-gray-700 mb-2">
                  Voice
                </label>
                <select
                  id="voiceId"
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  disabled={isGenerating}
                >
                  <option value="default">Default Voice</option>
                  <option value="professional">Professional Male</option>
                  <option value="friendly">Friendly Female</option>
                  <option value="energetic">Energetic</option>
                </select>
              </div>

              {/* How It Works */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5" />
                  How It Works
                </h3>
                <ul className="text-sm text-purple-800 space-y-1 ml-6 list-disc">
                  <li>AI detects your company's industry automatically</li>
                  <li>Generates a compelling 30-45 second marketing script</li>
                  <li>Creates professional text overlays with key messages</li>
                  <li>Adds AI-generated voice narration</li>
                  <li>Produces a complete marketing video in 2-3 minutes</li>
                </ul>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}
            </>
          ) : (
            /* Success State */
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-green-900 mb-2">Video Generation Started!</h3>
                <p className="text-green-700">Your video will be ready in 2-3 minutes</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div>
                  <span className="text-sm font-bold text-gray-600">Industry:</span>
                  <p className="text-gray-900">{generationDetails.industry}</p>
                </div>
                <div>
                  <span className="text-sm font-bold text-gray-600">Target Audience:</span>
                  <p className="text-gray-900">{generationDetails.targetAudience}</p>
                </div>
                <div>
                  <span className="text-sm font-bold text-gray-600">Key Message:</span>
                  <p className="text-gray-900">{generationDetails.keyMessage}</p>
                </div>
                {generationDetails.overlays && (
                  <div>
                    <span className="text-sm font-bold text-gray-600">Text Overlays:</span>
                    <ul className="mt-1 space-y-1">
                      {generationDetails.overlays.map((overlay: any, idx: number) => (
                        <li key={idx} className="text-sm text-gray-700">
                          • {overlay.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!generationDetails && (
          <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-all"
              disabled={isGenerating}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !companyName.trim()}
              className="px-8 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  Auto-Generate Video
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
