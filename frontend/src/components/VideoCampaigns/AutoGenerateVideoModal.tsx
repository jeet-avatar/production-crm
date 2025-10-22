import { useState, useEffect } from 'react';
import { XMarkIcon, SparklesIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { VoiceSelector } from '../VoiceSelector';

interface AutoGenerateVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (campaignId: string) => void;
}

interface VideoTemplate {
  id: string;
  name: string;
  category: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
}

export function AutoGenerateVideoModal({ isOpen, onClose, onSuccess }: AutoGenerateVideoModalProps) {
  // Step 1: Company Info
  const [step, setStep] = useState(1); // 1: Company Info, 2: Voice Selection, 3: Template Selection, 4: Generating
  const [companyName, setCompanyName] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');

  // Step 2: Voice
  const [voiceId, setVoiceId] = useState('');
  const [customVoiceUrl, setCustomVoiceUrl] = useState('');

  // Step 3: Template
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [detectedIndustry, setDetectedIndustry] = useState<string>('');

  // Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationDetails, setGenerationDetails] = useState<any>(null);
  const [campaignId, setCampaignId] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState(3);

  // Load templates when reaching step 3
  useEffect(() => {
    if (step === 3 && templates.length === 0) {
      loadTemplates();
    }
  }, [step]);

  // Poll for progress when in step 4
  useEffect(() => {
    if (step !== 4 || !campaignId) return;

    const pollProgress = async () => {
      try {
        const token = localStorage.getItem('crmToken');
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/video-campaigns/${campaignId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const campaign = data.campaign;

          // Calculate progress based on elapsed time
          const startTime = new Date(campaign.createdAt).getTime();
          const elapsed = Date.now() - startTime;
          const estimatedTotal = 180000; // 3 minutes
          const progress = Math.min(Math.floor((elapsed / estimatedTotal) * 100), 99);
          const remaining = Math.max(0, Math.ceil((estimatedTotal - elapsed) / 60000));

          setProgressPercent(progress);
          setEstimatedTimeLeft(remaining);

          // If status changed to READY, set to 100%
          if (campaign.status === 'READY') {
            setProgressPercent(100);
            setEstimatedTimeLeft(0);
            // Wait a moment then redirect
            setTimeout(() => {
              onSuccess(campaignId);
              handleClose();
            }, 1000);
          }
        }
      } catch (err) {
        console.error('Failed to fetch progress:', err);
      }
    };

    // Poll immediately
    pollProgress();

    // Then poll every 3 seconds
    const interval = setInterval(pollProgress, 3000);

    return () => clearInterval(interval);
  }, [step, campaignId]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/video-campaigns/templates`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);

        // Auto-select first template if available
        if (data.templates && data.templates.length > 0) {
          setSelectedTemplateId(data.templates[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleNext = () => {
    // Validation
    if (step === 1 && !companyName.trim()) {
      setError('Please enter a company name');
      return;
    }

    if (step === 2 && !voiceId && !customVoiceUrl) {
      setError('Please select a voice for narration');
      return;
    }

    if (step === 3 && !selectedTemplateId) {
      setError('Please select a video template');
      return;
    }

    setError(null);

    if (step < 3) {
      setStep(step + 1);
    } else {
      handleGenerate();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  const handleGenerate = async () => {
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
            customVoiceUrl: customVoiceUrl || undefined,
            templateId: selectedTemplateId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate video');
      }

      setGenerationDetails(data.campaign);
      setDetectedIndustry(data.campaign.industry || '');
      setCampaignId(data.campaign.id);
      setProgressPercent(0);
      setEstimatedTimeLeft(3);
      setStep(4); // Move to success screen

      // Don't auto-close - let progress polling handle it
    } catch (err: any) {
      console.error('Auto-generate error:', err);
      setError(err.message || 'Failed to generate video automatically');
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setCompanyName('');
    setAdditionalContext('');
    setVoiceId('');
    setCustomVoiceUrl('');
    setSelectedTemplateId(null);
    setTemplates([]);
    setError(null);
    setIsGenerating(false);
    setGenerationDetails(null);
    setDetectedIndustry('');
    setCampaignId('');
    setProgressPercent(0);
    setEstimatedTimeLeft(3);
    onClose();
  };

  if (!isOpen) return null;

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SparklesIcon className="w-8 h-8 text-white" />
              <div>
                <h2 className="text-2xl font-bold text-white">AI Auto-Generate Video</h2>
                <p className="text-sm text-purple-100 mt-1">
                  {step === 1 && "Tell us about your company"}
                  {step === 2 && "Choose a voice for narration"}
                  {step === 3 && "Select a video template"}
                  {step === 4 && "Generating your video..."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-white/80 hover:text-white p-2 rounded-lg transition-all"
              aria-label="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Steps */}
          {step < 4 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    s < step ? 'bg-green-500 text-white' :
                    s === step ? 'bg-white text-purple-600' :
                    'bg-purple-400 text-purple-100'
                  }`}>
                    {s < step ? '✓' : s}
                  </div>
                  {s < 3 && (
                    <div className={`w-16 h-1 mx-1 rounded transition-all ${
                      s < step ? 'bg-green-500' : 'bg-purple-400'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
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
                  autoFocus
                />
              </div>

              {/* Additional Context */}
              <div>
                <label htmlFor="additionalContext" className="block text-sm font-bold text-gray-700 mb-2">
                  Additional Context (Optional)
                </label>
                <textarea
                  id="additionalContext"
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="e.g., We're a B2B SaaS platform for project management, targeting remote teams..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Provide details about your industry, target audience, and unique value proposition
                </p>
              </div>

              {/* How It Works */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5" />
                  What Happens Next
                </h3>
                <ul className="text-sm text-purple-800 space-y-1 ml-6 list-disc">
                  <li>AI detects your company's industry automatically</li>
                  <li>Choose from 20+ professional ElevenLabs AI voices</li>
                  <li>Select a video template that matches your brand</li>
                  <li>AI generates script, text overlays, and complete video</li>
                  <li>Video ready in 2-3 minutes!</li>
                </ul>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <span className="font-bold">Company:</span> {companyName}
                  {additionalContext && (
                    <span className="block mt-1 text-blue-700">{additionalContext.substring(0, 100)}{additionalContext.length > 100 ? '...' : ''}</span>
                  )}
                </p>
              </div>

              <div className="border-2 border-purple-200 rounded-xl p-4 max-h-[500px] overflow-y-auto">
                <VoiceSelector
                  value={voiceId || customVoiceUrl}
                  onChange={(voice, isCustom) => {
                    console.log('Voice selected:', voice, 'isCustom:', isCustom);
                    if (isCustom) {
                      setCustomVoiceUrl(voice);
                      setVoiceId('');
                    } else {
                      setVoiceId(voice);
                      setCustomVoiceUrl('');
                    }
                    setError(null);
                  }}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-900">
                  <span className="font-bold">Company:</span> {companyName} •
                  <span className="font-bold ml-2">Voice:</span> {voiceId ? `Selected (${voiceId.split(':')[0]})` : 'Custom Voice'}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Choose a Video Template</h3>

                {loadingTemplates ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No templates available
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto p-2">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        onClick={() => setSelectedTemplateId(template.id)}
                        className={`relative cursor-pointer rounded-xl overflow-hidden border-4 transition-all transform hover:scale-105 ${
                          selectedTemplateId === template.id
                            ? 'border-purple-600 shadow-lg'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        {template.thumbnailUrl || template.videoUrl ? (
                          <video
                            src={template.videoUrl}
                            poster={template.thumbnailUrl}
                            className="w-full h-32 object-cover"
                            muted
                            loop
                            onMouseEnter={(e) => e.currentTarget.play()}
                            onMouseLeave={(e) => {
                              e.currentTarget.pause();
                              e.currentTarget.currentTime = 0;
                            }}
                          />
                        ) : (
                          <div className="w-full h-32 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                            <SparklesIcon className="w-12 h-12 text-purple-400" />
                          </div>
                        )}

                        <div className="p-3 bg-white">
                          <p className="font-bold text-sm text-gray-900 truncate">{template.name}</p>
                          <p className="text-xs text-gray-500">{template.category}</p>
                        </div>

                        {selectedTemplateId === template.id && (
                          <div className="absolute top-2 right-2 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && generationDetails && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <SparklesIcon className="w-10 h-10 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {progressPercent === 100 ? '🎉 Video Complete!' : '⚡ Generating Your Video...'}
                </h3>

                <p className="text-gray-700 mb-6">
                  {progressPercent === 100
                    ? 'Your professional video is ready!'
                    : 'AI is creating your professional marketing video'}
                </p>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-6 mb-4 overflow-hidden shadow-inner">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-blue-600 h-full rounded-full transition-all duration-500 ease-out flex items-center justify-center text-white text-sm font-bold shadow-lg"
                    style={{ width: `${progressPercent}%` }}
                  >
                    {progressPercent > 10 && `${progressPercent}%`}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-600 rounded-full animate-pulse"></div>
                    <span className="font-bold text-purple-900">{progressPercent}% Complete</span>
                  </div>
                  {estimatedTimeLeft > 0 && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-bold text-blue-900">{estimatedTimeLeft} min remaining</span>
                    </div>
                  )}
                </div>

                {progressPercent === 100 && (
                  <p className="text-sm text-green-600 mt-4 animate-bounce">Redirecting to your video...</p>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div>
                  <span className="text-sm font-bold text-gray-600">Company:</span>
                  <p className="text-gray-900">{companyName}</p>
                </div>
                {detectedIndustry && (
                  <div>
                    <span className="text-sm font-bold text-gray-600">Detected Industry:</span>
                    <p className="text-gray-900">{detectedIndustry}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm font-bold text-gray-600">Voice:</span>
                  <p className="text-gray-900">{voiceId || 'Custom Voice'}</p>
                </div>
                <div>
                  <span className="text-sm font-bold text-gray-600">Template:</span>
                  <p className="text-gray-900">{selectedTemplate?.name || 'Selected'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 4 && (
          <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-between gap-3">
            <button
              type="button"
              onClick={step === 1 ? handleClose : handleBack}
              className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-all flex items-center gap-2"
              disabled={isGenerating}
            >
              {step === 1 ? (
                <>
                  <XMarkIcon className="w-5 h-5" />
                  Cancel
                </>
              ) : (
                <>
                  <ChevronLeftIcon className="w-5 h-5" />
                  Back
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={isGenerating || (step === 1 && !companyName.trim()) || (step === 2 && !voiceId && !customVoiceUrl) || (step === 3 && !selectedTemplateId)}
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
              ) : step === 3 ? (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  Generate Video
                </>
              ) : (
                <>
                  Next
                  <ChevronRightIcon className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
