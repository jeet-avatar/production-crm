import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  SparklesIcon,
  PaperAirplaneIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  LightBulbIcon,
  BoltIcon,
  ArrowPathIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import DOMPurify from 'dompurify';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type CampaignStep = 'basics' | 'content' | 'audience' | 'schedule' | 'review';

export function CreateCampaignModal({ isOpen, onClose, onSuccess }: Props) {
  const { gradients } = useTheme();
  const [currentStep, setCurrentStep] = useState<CampaignStep>('basics');
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form data
  const [campaignName, setCampaignName] = useState('');
  const [campaignGoal, setCampaignGoal] = useState('');
  const [subject, setSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [sendTime, setSendTime] = useState('immediate');
  const [scheduledDate, setScheduledDate] = useState('');
  const [enableABTest, setEnableABTest] = useState(false);
  const [subjectVariantB, setSubjectVariantB] = useState('');
  const [subjectVariants, setSubjectVariants] = useState<string[]>([]);
  const [selectedVariantA, setSelectedVariantA] = useState(0);
  const [selectedVariantB, setSelectedVariantB] = useState(1);
  const [abTestSplit, setAbTestSplit] = useState(20);
  const [enablePersonalization, setEnablePersonalization] = useState(true);
  const [aiTone, setAiTone] = useState<'professional' | 'friendly' | 'persuasive' | 'casual'>('professional');
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setCurrentStep('basics');
      setCampaignName('');
      setCampaignGoal('');
      setSubject('');
      setEmailContent('');
      setPreviewText('');
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const generateCampaignBasics = async () => {
    setAiGenerating(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${apiUrl}/api/campaigns/ai/generate-basics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tone: aiTone,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCampaignName(data.name);
        setCampaignGoal(data.goal);
      } else {
        setError(data.error || 'Failed to generate campaign basics');
      }
    } catch (err) {
      setError('Failed to generate campaign basics');
    } finally {
      setAiGenerating(false);
    }
  };

  const generateAISubject = async () => {
    if (!campaignGoal) {
      setError('Please describe your campaign goal first');
      return;
    }

    setAiGenerating(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${apiUrl}/api/campaigns/ai/generate-subject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          goal: campaignGoal,
          tone: aiTone,
          campaignName,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Set all 5 variants
        if (data.variants && Array.isArray(data.variants)) {
          setSubjectVariants(data.variants);
          setSubject(data.variants[0] || '');
          if (enableABTest && data.variants[1]) {
            setSubjectVariantB(data.variants[1]);
          }
        } else {
          // Fallback for old API response
          setSubject(data.subject);
          if (enableABTest && data.variantB) {
            setSubjectVariantB(data.variantB);
          }
        }
      } else {
        setError(data.error || 'Failed to generate subject');
      }
    } catch (err) {
      setError('Failed to generate AI subject line');
    } finally {
      setAiGenerating(false);
    }
  };

  const generateAIContent = async () => {
    if (!campaignGoal || !subject) {
      setError('Please add campaign goal and subject first');
      return;
    }

    setAiGenerating(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${apiUrl}/api/campaigns/ai/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          goal: campaignGoal,
          subject,
          tone: aiTone,
          personalization: enablePersonalization,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmailContent(data.content);
        setPreviewText(data.previewText);
      } else {
        setError(data.error || 'Failed to generate content');
      }
    } catch (err) {
      setError('Failed to generate AI content');
    } finally {
      setAiGenerating(false);
    }
  };

  const optimizeSendTime = async () => {
    setAiGenerating(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${apiUrl}/api/campaigns/ai/optimize-send-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const data = await response.json();

      if (response.ok) {
        setScheduledDate(data.optimalTime);
        setSendTime('scheduled');
      }
    } catch (err) {
      console.error('Failed to optimize send time');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleNext = () => {
    const steps: CampaignStep[] = ['basics', 'content', 'audience', 'schedule', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: CampaignStep[] = ['basics', 'content', 'audience', 'schedule', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName || !subject || !emailContent) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${apiUrl}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: campaignName,
          subject,
          htmlContent: emailContent,
          status: sendTime === 'immediate' ? 'SENDING' : 'SCHEDULED',
          scheduledAt: sendTime === 'scheduled' ? scheduledDate : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Add selected companies to campaign
        if (selectedCompanies.length > 0) {
          await Promise.all(
            selectedCompanies.map((companyId) =>
              fetch(`${apiUrl}/api/campaigns/${data.campaign.id}/companies/${companyId}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              })
            )
          );
        }

        setSuccess('Campaign created successfully!');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        setError(data.error || 'Failed to create campaign');
      }
    } catch (err) {
      setError('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const stepConfig = {
    basics: { title: 'Campaign Basics', icon: LightBulbIcon },
    content: { title: 'Email Content', icon: SparklesIcon },
    audience: { title: 'Target Audience', icon: UserGroupIcon },
    schedule: { title: 'Schedule & Send', icon: ClockIcon },
    review: { title: 'Review & Launch', icon: ChartBarIcon },
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white border-4 border-black rounded-3xl shadow-2xl max-w-4xl w-full my-8 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Gradient */}
        <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} p-6 text-black`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-black bg-opacity-10 rounded-xl flex items-center justify-center">
                {(() => {
                  const StepIcon = stepConfig[currentStep]?.icon;
                  return StepIcon ? <StepIcon className="w-6 h-6 text-black" /> : null;
                })()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black">Create AI-Powered Campaign</h2>
                <p className="text-black text-sm font-semibold">{stepConfig[currentStep]?.title}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-black hover:bg-black hover:bg-opacity-10 p-2 rounded-lg transition-all">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex gap-2">
            {(['basics', 'content', 'audience', 'schedule', 'review'] as CampaignStep[]).map((step, index) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full transition-all ${
                  step === currentStep ? 'bg-black' : index < (['basics', 'content', 'audience', 'schedule', 'review'] as CampaignStep[]).indexOf(currentStep) ? 'bg-black bg-opacity-60' : 'bg-black bg-opacity-20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto"  style={{ maxHeight: 'calc(90vh - 240px)' }}>
          {error && (
            <div className={`mb-4 bg-gradient-to-r ${gradients.semantic.error?.gradient || 'from-red-500 to-red-600'} bg-opacity-10 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-semibold`}>
              {error}
            </div>
          )}

          {success && (
            <div className={`mb-4 bg-gradient-to-r ${gradients.semantic.success?.gradient || 'from-green-500 to-green-600'} bg-opacity-10 border-2 border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-semibold`}>
              {success}
            </div>
          )}

          {/* Step: Basics */}
          {currentStep === 'basics' && (
            <div className="space-y-6">
              {/* AI Generate Basics Button */}
              <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} bg-opacity-10 border-2 border-orange-200 rounded-xl p-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Let AI Create Your Campaign</h3>
                    <p className="text-xs text-gray-600 mt-1">Generate campaign name and goal automatically</p>
                  </div>
                  <button
                    onClick={generateCampaignBasics}
                    disabled={aiGenerating}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r ${gradients.brand.primary.gradient} text-black text-sm font-semibold rounded-lg hover:shadow-lg disabled:opacity-50 transition-all whitespace-nowrap`}
                  >
                    {aiGenerating ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-4 w-4" />
                        AI Generate
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Campaign Name *</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., Q1 Product Launch"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Campaign Goal *</label>
                <textarea
                  value={campaignGoal}
                  onChange={(e) => setCampaignGoal(e.target.value)}
                  placeholder="Describe what you want to achieve with this campaign..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all resize-none"
                />
                <p className="text-xs text-gray-500 mt-2">AI will use this to generate personalized content</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">AI Tone</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'professional', label: 'Professional', icon: '💼' },
                    { value: 'friendly', label: 'Friendly', icon: '😊' },
                    { value: 'persuasive', label: 'Persuasive', icon: '🎯' },
                    { value: 'casual', label: 'Casual', icon: '✨' },
                  ].map((tone) => (
                    <button
                      key={tone.value}
                      onClick={() => setAiTone(tone.value as any)}
                      className={`px-4 py-3 rounded-xl font-semibold transition-all border-2 ${
                        aiTone === tone.value
                          ? `bg-gradient-to-r ${gradients.brand.primary.gradient} text-black border-transparent shadow-lg`
                          : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      <span className="mr-2">{tone.icon}</span>
                      {tone.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step: Content */}
          {currentStep === 'content' && (
            <div className="space-y-0">
              {/* Subject Line Section */}
              <div className="border-b-2 border-gray-100 pb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700">Email Subject Line *</label>
                  <button
                    onClick={generateAISubject}
                    disabled={aiGenerating || !campaignGoal}
                    className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${gradients.brand.primary.gradient} text-black text-sm font-semibold rounded-lg hover:shadow-lg disabled:opacity-50 transition-all`}
                  >
                    {aiGenerating ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <SparklesIcon className="h-4 w-4" />
                    )}
                    AI Generate
                  </button>
                </div>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter subject line..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                />
              </div>

              {/* A/B Testing Section */}
              <div className="border-b-2 border-gray-100 py-6 bg-gray-50">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={enableABTest}
                    onChange={(e) => setEnableABTest(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <label className="text-sm font-semibold text-gray-900">Enable A/B Testing</label>
                    <p className="text-sm text-gray-600 mt-1">Test two subject lines to optimize open rates</p>
                  </div>
                </div>
              </div>

              {enableABTest && (
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <SparklesIcon className="h-5 w-5 text-orange-600" />
                    A/B Test Setup
                  </h3>

                  {/* Show variants if generated */}
                  {subjectVariants.length > 0 && (
                    <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-xs font-semibold text-orange-700 mb-2">AI Generated Variants</p>
                      <div className="space-y-1">
                        {subjectVariants.map((variant, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              if (selectedVariantA === index) {
                                setSubject(variant);
                              } else if (selectedVariantB === index) {
                                setSubjectVariantB(variant);
                              } else {
                                // Set as variant A by default
                                setSubject(variant);
                                setSelectedVariantA(index);
                              }
                            }}
                            className="w-full text-left px-3 py-2 bg-white rounded-lg text-xs text-gray-700 hover:bg-orange-100 transition-all border border-transparent hover:border-orange-300"
                          >
                            {index + 1}. {variant}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="border-2 border-orange-500 rounded-lg p-4 bg-white">
                      <span className="text-xs font-bold text-orange-600 uppercase tracking-wide">Variant A</span>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Subject line A"
                        className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                      />
                    </div>
                    <div className="border-2 border-orange-600 rounded-lg p-4 bg-white">
                      <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">Variant B</span>
                      <input
                        type="text"
                        value={subjectVariantB}
                        onChange={(e) => setSubjectVariantB(e.target.value)}
                        placeholder="Subject line B"
                        className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Test Configuration</label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-600">Test Split: {abTestSplit}%</span>
                          <span className="text-xs text-gray-600">Winner: {100 - abTestSplit}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="50"
                          step="5"
                          value={abTestSplit}
                          onChange={(e) => setAbTestSplit(parseInt(e.target.value))}
                          className="w-full h-2 bg-gradient-to-r from-orange-200 to-orange-300 rounded-lg appearance-none cursor-pointer accent-orange-600"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Test <strong>{abTestSplit}%</strong> of audience, send winner to remaining <strong>{100 - abTestSplit}%</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Preview Text Section */}
              <div className="border-b-2 border-gray-100 py-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Preview Text</label>
                <input
                  type="text"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="Text shown in inbox preview..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                />
              </div>

              {/* Email Content Section */}
              <div className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-semibold text-gray-700">Email Content *</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="inline-flex items-center gap-1 px-4 py-2 border-2 border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-all"
                    >
                      <EyeIcon className="h-4 w-4" />
                      {showPreview ? 'Hide Preview' : 'Show Preview'}
                    </button>
                    <button
                      onClick={generateAIContent}
                      disabled={aiGenerating || !campaignGoal || !subject}
                      className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${gradients.brand.primary.gradient} text-black text-sm font-medium rounded-lg hover:shadow-lg disabled:opacity-50 transition-all`}
                    >
                      {aiGenerating ? (
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        <SparklesIcon className="h-4 w-4" />
                      )}
                      AI Generate Content
                    </button>
                  </div>
                </div>

                {/* Split View with Clear Boundaries */}
                <div className={`grid ${showPreview ? 'grid-cols-2' : 'grid-cols-1'} gap-4 border-2 border-gray-200 rounded-lg overflow-hidden`}>
                  {/* HTML Code Editor */}
                  <div className={showPreview ? 'border-r-2 border-gray-200' : ''}>
                    <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
                      <span className="text-xs text-gray-300 font-mono font-semibold">HTML Code</span>
                    </div>
                    <textarea
                      value={emailContent}
                      onChange={(e) => setEmailContent(e.target.value)}
                      placeholder="Email body content..."
                      className="w-full h-96 p-4 font-mono text-sm bg-gray-900 text-green-400 overflow-y-auto resize-none focus:outline-none"
                      style={{ fontFamily: 'Monaco, Consolas, monospace' }}
                    />
                  </div>

                  {/* Live Preview */}
                  {showPreview && (
                    <div>
                      <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} px-4 py-2 border-b border-orange-700`}>
                        <span className="text-xs text-white font-semibold">Live Preview</span>
                      </div>
                      <div
                        className="h-96 overflow-y-auto bg-gray-50 p-4"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(emailContent) }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl">
                <input
                  type="checkbox"
                  checked={enablePersonalization}
                  onChange={(e) => setEnablePersonalization(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <div>
                  <label className="text-sm font-semibold text-gray-900">Enable AI Personalization</label>
                  <p className="text-xs text-gray-600">Customize content for each recipient using AI</p>
                </div>
              </div>
            </div>
          )}

          {/* Step: Audience */}
          {currentStep === 'audience' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Select Target Companies</h3>
                <p className="text-gray-600 mb-6">Choose which companies to include in this campaign</p>
                <p className="text-sm text-orange-600 font-medium">
                  You can add companies from the Companies page after creating the campaign
                </p>
              </div>
            </div>
          )}

          {/* Step: Schedule */}
          {currentStep === 'schedule' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">When to Send</label>
                <div className="space-y-3">
                  <button
                    onClick={() => setSendTime('immediate')}
                    className={`w-full px-4 py-4 rounded-xl font-semibold transition-all border-2 flex items-center gap-3 ${
                      sendTime === 'immediate'
                        ? `bg-gradient-to-r ${gradients.brand.primary.gradient} text-black border-transparent shadow-lg`
                        : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <BoltIcon className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-bold">Send Immediately</div>
                      <div className={`text-sm ${sendTime === 'immediate' ? 'text-white opacity-90' : 'text-gray-500'}`}>
                        Campaign will be sent right away
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSendTime('scheduled')}
                    className={`w-full px-4 py-4 rounded-xl font-semibold transition-all border-2 flex items-center gap-3 ${
                      sendTime === 'scheduled'
                        ? `bg-gradient-to-r ${gradients.brand.primary.gradient} text-black border-transparent shadow-lg`
                        : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <ClockIcon className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-bold">Schedule for Later</div>
                      <div className={`text-sm ${sendTime === 'scheduled' ? 'text-white opacity-90' : 'text-gray-500'}`}>
                        Choose the best time to send
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {sendTime === 'scheduled' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">Schedule Date & Time</label>
                    <button
                      onClick={optimizeSendTime}
                      disabled={aiGenerating}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r ${gradients.brand.primary.gradient} text-black text-xs font-semibold rounded-lg hover:shadow-lg disabled:opacity-50 transition-all`}
                    >
                      {aiGenerating ? (
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        <SparklesIcon className="h-4 w-4" />
                      )}
                      AI Optimize Time
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border-2 border-orange-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Campaign Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Campaign Name:</span>
                    <span className="font-semibold text-gray-900">{campaignName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subject Line:</span>
                    <span className="font-semibold text-gray-900">{subject}</span>
                  </div>
                  {enableABTest && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">A/B Testing:</span>
                      <span className="font-semibold text-orange-600">Enabled</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Personalization:</span>
                    <span className="font-semibold text-gray-900">{enablePersonalization ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Send Time:</span>
                    <span className="font-semibold text-gray-900">
                      {sendTime === 'immediate' ? 'Immediate' : `Scheduled: ${scheduledDate}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">AI Tone:</span>
                    <span className="font-semibold text-gray-900 capitalize">{aiTone}</span>
                  </div>
                </div>
              </div>

              <div className={`bg-gradient-to-r ${gradients.semantic.info?.gradient || gradients.brand.primary.gradient} bg-opacity-10 border-2 border-orange-200 rounded-xl p-4`}>
                <p className="text-sm text-gray-800">
                  <strong>Note:</strong> You can add companies to this campaign from the Companies page after creation.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex-shrink-0">
          <button
            onClick={handleBack}
            disabled={currentStep === 'basics' || loading}
            className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 font-semibold transition-all disabled:opacity-50"
          >
            Back
          </button>

          <div className="flex gap-3">
            {currentStep !== 'review' ? (
              <button
                onClick={handleNext}
                disabled={
                  (currentStep === 'basics' && (!campaignName || !campaignGoal)) ||
                  (currentStep === 'content' && (!subject || !emailContent))
                }
                className={`px-6 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-black rounded-xl hover:shadow-lg disabled:opacity-50 font-semibold transition-all`}
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={handleCreateCampaign}
                disabled={loading || !campaignName || !subject || !emailContent}
                className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-black rounded-xl hover:shadow-lg disabled:opacity-50 font-semibold transition-all`}
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="h-5 w-5" />
                    Create Campaign
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateCampaignModal;
