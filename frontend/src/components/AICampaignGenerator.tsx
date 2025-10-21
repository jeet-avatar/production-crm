import { useState } from 'react';
import { SparklesIcon, CheckCircleIcon, PlayIcon } from '@heroicons/react/24/outline';
import { CreateVideoCampaignModal } from './CreateVideoCampaignModal';
import { videoService } from '../services/videoService';
import { useTheme } from '../contexts/ThemeContext';

interface AICampaignGeneratorProps {
  onVideoGenerated?: (videoUrl: string, campaignId: string, name: string) => void;
}

export function AICampaignGenerator({ onVideoGenerated }: AICampaignGeneratorProps) {
  const { gradients } = useTheme();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showManualCreate, setShowManualCreate] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);

  const pollForVideoCompletion = async (campaignId: string) => {
    setIsGenerating(true);
    setShowManualCreate(false); // Close modal
    setCurrentStep('🎬 Creating your personalized video...');
    setProgress(65);

    const maxAttempts = 60; // 5 minutes max (5 seconds * 60)
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const status = await videoService.getCampaignStatus(campaignId);

        if (status.status === 'READY' && status.videoUrl) {
          setProgress(100);
          setCurrentStep('✅ Video ready!');

          // Get campaign details
          const campaign = await videoService.getCampaign(campaignId);

          setTimeout(() => {
            setIsGenerating(false);
            if (onVideoGenerated) {
              onVideoGenerated(status.videoUrl, campaignId, campaign.name);
            }
          }, 1000);
        } else if (status.status === 'FAILED') {
          setIsGenerating(false);
          alert(`Video generation failed: ${status.error || 'Unknown error'}`);
        } else if (attempts < maxAttempts) {
          // Update progress smoothly from 65% to 95%
          const progressIncrement = (attempts / maxAttempts) * 30; // 30% range
          setProgress(Math.min(95, 65 + progressIncrement));

          // Show actual backend status or friendly message
          if (status.currentStep) {
            setCurrentStep(status.currentStep);
          } else {
            // Friendly messages based on progress
            if (progress < 75) {
              setCurrentStep('🎤 Adding voice narration...');
            } else if (progress < 85) {
              setCurrentStep('🎨 Composing video with logos and overlays...');
            } else {
              setCurrentStep('✨ Finalizing your video...');
            }
          }

          attempts++;
          setTimeout(checkStatus, 5000); // Check again in 5 seconds
        } else {
          setIsGenerating(false);
          alert('Video generation is taking longer than expected. Please check back later.');
        }
      } catch (error) {
        console.error('Failed to check video status:', error);
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, 5000);
        } else {
          setIsGenerating(false);
          alert('Failed to check video status. Please try again.');
        }
      }
    };

    checkStatus();
  };

  const handleAIGenerate = () => {
    if (!prompt.trim()) {
      alert('Please enter a campaign description');
      return;
    }

    // For now, just open manual create with the prompt
    // In future, we can add full AI automation here
    setShowManualCreate(true);
  };

  const handleManualSetup = () => {
    setShowManualCreate(true);
  };

  const examplePrompts = [
    'Create a product launch video for our new CRM platform targeting small businesses',
    'Make a customer testimonial video showcasing our success stories',
    'Generate a holiday sale announcement with 25% off promotion',
    'Create an onboarding welcome video for new customers',
    'Make a social media teaser for our upcoming webinar',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-rose-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl relative z-0">
        {!isGenerating ? (
          <>
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-rose-600 rounded-full mb-6 shadow-2xl">
                <SparklesIcon className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-5xl font-bold text-gray-900 mb-4">
                AI Video Campaign Generator
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Describe your campaign idea in plain English. Our AI will create a professional video campaign in minutes.
              </p>
            </div>

            {/* Main Input Area */}
            <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8 border-2 border-gray-100">
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                What kind of video campaign do you want to create?
              </label>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Example: Create a 30-second product demo video for our CRM software, highlighting time-saving automation features with an energetic professional voice..."
                className="w-full h-40 px-6 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all resize-none text-gray-900 placeholder-gray-400 text-lg"
              />

              {/* Character Count */}
              <div className="flex justify-between items-center mt-3">
                <p className="text-sm text-gray-500">
                  {prompt.length} characters • Be specific for best results
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleAIGenerate}
                  disabled={!prompt.trim()}
                  className={`flex-1 px-8 py-4 bg-gradient-to-r ${gradients.brand.primary.gradient} text-black rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <SparklesIcon className="w-6 h-6" />
                    Generate with AI
                  </span>
                </button>

                <button
                  onClick={handleManualSetup}
                  className="px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-2xl font-semibold text-lg hover:bg-gray-50 transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                  Manual Setup
                </button>
              </div>
            </div>

            {/* Example Prompts */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-orange-600" />
                Example Prompts
              </h3>
              <div className="space-y-2">
                {examplePrompts.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setPrompt(example)}
                    className="w-full text-left px-4 py-3 bg-gradient-to-r from-orange-50 to-rose-50 hover:from-orange-100 hover:to-rose-100 rounded-xl text-sm text-gray-700 transition-all border border-orange-200 hover:border-orange-300"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {[
                { icon: '🎤', title: 'Professional Voices', desc: '20+ AI voices' },
                { icon: '🎬', title: 'Smart Templates', desc: 'Auto-selected visuals' },
                { icon: '⚡', title: 'Instant Generation', desc: 'Ready in minutes' },
              ].map((feature, index) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-md text-center border-2 border-gray-100">
                  <div className="text-4xl mb-2">{feature.icon}</div>
                  <h4 className="font-bold text-gray-900 mb-1">{feature.title}</h4>
                  <p className="text-sm text-gray-600">{feature.desc}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center border-4 border-orange-200">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-orange-500 to-rose-600 rounded-full mb-8 shadow-2xl animate-pulse">
              <PlayIcon className="w-12 h-12 text-white" />
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Creating Your Video
            </h2>

            <p className="text-lg text-gray-600 mb-8 font-medium">
              {currentStep}
            </p>

            {/* Progress Bar */}
            <div className="w-full max-w-md mx-auto mb-8">
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                <div
                  className={`h-full bg-gradient-to-r ${gradients.brand.primary.gradient} transition-all duration-500 ease-out`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-3 font-semibold">{progress}% complete</p>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 max-w-md mx-auto">
              <p className="text-sm text-blue-900 font-medium">
                ⏱️ <strong>Hang tight!</strong> We're composing your video with voice narration, logos, and overlays. This usually takes 2-3 minutes.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Manual Create Modal */}
      {showManualCreate && (
        <CreateVideoCampaignModal
          isOpen={showManualCreate}
          onClose={() => setShowManualCreate(false)}
          onSuccess={(campaign) => {
            // Start polling for video completion
            pollForVideoCompletion(campaign.id);
          }}
        />
      )}
    </div>
  );
}
