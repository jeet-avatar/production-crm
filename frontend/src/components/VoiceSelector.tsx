import { useState, useRef } from 'react';
import {
  SpeakerWaveIcon,
  ArrowUpTrayIcon,
  PlayIcon,
  StopIcon,
  CheckCircleIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';

export interface VoiceOption {
  id: string;
  name: string;
  accent: string;
  gender: 'male' | 'female';
  description: string;
  sample?: string; // Sample audio URL
  preview?: string; // Sample text for preview
}

interface VoiceSelectorProps {
  value?: string; // Selected voice ID or custom file URL
  onChange: (voice: string, isCustom: boolean) => void;
  onCustomVoiceUpload?: (file: File) => Promise<string>;
}

const BUILT_IN_VOICES: VoiceOption[] = [
  {
    id: 'gtts-en-us',
    name: 'David',
    accent: 'American English',
    gender: 'male',
    description: 'Professional American male voice, clear and confident',
    preview: 'Hello! Welcome to our presentation. Today I\'ll be sharing some exciting insights with you.',
  },
  {
    id: 'gtts-en-uk',
    name: 'James',
    accent: 'British English',
    gender: 'male',
    description: 'British male voice, sophisticated and articulate',
    preview: 'Good day! I\'m delighted to present this information to you today.',
  },
  {
    id: 'gtts-en-au',
    name: 'Emma',
    accent: 'Australian English',
    gender: 'female',
    description: 'Australian female voice, friendly and warm',
    preview: 'G\'day! Thanks for joining us today. Let\'s dive into the details.',
  },
  {
    id: 'gtts-en-in',
    name: 'Priya',
    accent: 'Indian English',
    gender: 'female',
    description: 'Indian female voice, professional and clear',
    preview: 'Hello! I am pleased to share these insights with you.',
  },
  {
    id: 'gtts-en-ca',
    name: 'Michael',
    accent: 'Canadian English',
    gender: 'male',
    description: 'Canadian male voice, friendly and professional',
    preview: 'Hi there! Welcome to today\'s presentation, eh?',
  },
  {
    id: 'gtts-en-ie',
    name: 'Sean',
    accent: 'Irish English',
    gender: 'male',
    description: 'Irish male voice, charming and engaging',
    preview: 'Top of the morning! Let me walk you through this today.',
  },
];

export function VoiceSelector({ value, onChange, onCustomVoiceUpload }: VoiceSelectorProps) {
  const [selectedVoice, setSelectedVoice] = useState<string>(value || 'gtts-en-us');
  const [isCustom, setIsCustom] = useState(false);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoice(voiceId);
    setIsCustom(false);
    setCustomFile(null);
    onChange(voiceId, false);
  };

  const handleCustomVoiceUpload = async (file: File) => {
    if (!onCustomVoiceUpload) return;

    setIsUploading(true);
    try {
      const voiceUrl = await onCustomVoiceUpload(file);
      setCustomFile(file);
      setSelectedVoice(voiceUrl);
      setIsCustom(true);
      onChange(voiceUrl, true);
    } catch (error) {
      console.error('Voice upload failed:', error);
      alert('Failed to upload voice file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
      if (!validTypes.includes(file.type)) {
        alert('Invalid file type. Please upload MP3, WAV, or OGG audio files.');
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('File too large. Maximum size is 10MB.');
        return;
      }

      handleCustomVoiceUpload(file);
    }
  };

  const playPreview = async (voice: VoiceOption) => {
    if (!voice.preview) return;

    if (playingVoice === voice.id) {
      // Stop playing
      audioRef.current?.pause();
      setPlayingVoice(null);
      return;
    }

    setPlayingVoice(voice.id);

    // Generate preview using Web Speech API
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(voice.preview);

      // Try to match voice to accent
      const voices = window.speechSynthesis.getVoices();
      const matchingVoice = voices.find(v =>
        v.lang.startsWith('en') &&
        (v.name.includes(voice.accent) || v.lang.includes(voice.id.split('-')[2]))
      );

      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utterance.onend = () => setPlayingVoice(null);
      utterance.onerror = () => setPlayingVoice(null);

      window.speechSynthesis.cancel(); // Stop any current speech
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopPreview = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingVoice(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SpeakerWaveIcon className="w-5 h-5 text-purple-600" />
          <label className="text-sm font-semibold text-gray-700">
            Voice Selection
          </label>
        </div>
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
          title="Show help"
        >
          <QuestionMarkCircleIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm">
          <p className="font-semibold text-purple-900 mb-2">Voice Selection Guide:</p>
          <ul className="space-y-1 text-gray-700 ml-4">
            <li>• <strong>Built-in Voices:</strong> Choose from 6 professional voices with different accents</li>
            <li>• <strong>Preview:</strong> Click play button to hear a sample</li>
            <li>• <strong>Custom Voice:</strong> Upload your own voice recording (MP3, WAV, OGG)</li>
            <li>• <strong>Best Practice:</strong> Record in a quiet environment with clear pronunciation</li>
          </ul>
        </div>
      )}

      {/* Built-in Voices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {BUILT_IN_VOICES.map((voice) => (
          <div
            key={voice.id}
            onClick={() => handleVoiceSelect(voice.id)}
            className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedVoice === voice.id && !isCustom
                ? 'border-purple-600 bg-purple-50 shadow-md'
                : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
            }`}
          >
            {/* Selected Indicator */}
            {selectedVoice === voice.id && !isCustom && (
              <CheckCircleIcon className="absolute top-2 right-2 w-6 h-6 text-purple-600" />
            )}

            {/* Voice Info */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                {voice.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900">{voice.name}</h4>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {voice.gender === 'male' ? '♂' : '♀'}
                  </span>
                </div>
                <p className="text-xs text-purple-600 font-medium">{voice.accent}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{voice.description}</p>
              </div>
            </div>

            {/* Preview Button */}
            {voice.preview && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playPreview(voice);
                }}
                className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {playingVoice === voice.id ? (
                  <>
                    <StopIcon className="w-4 h-4" />
                    Stop Preview
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-4 h-4" />
                    Preview Voice
                  </>
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* OR Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-white text-gray-500 uppercase">Or Upload Custom Voice</span>
        </div>
      </div>

      {/* Custom Voice Upload */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
          isCustom
            ? 'border-purple-600 bg-purple-50'
            : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
        }`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
            <p className="text-sm text-gray-600">Uploading voice...</p>
          </div>
        ) : customFile ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircleIcon className="w-12 h-12 text-purple-600" />
            <p className="font-semibold text-gray-900">Custom Voice Uploaded</p>
            <p className="text-sm text-gray-600">{customFile.name}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCustomFile(null);
                setIsCustom(false);
                handleVoiceSelect('gtts-en-us');
              }}
              className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Change Voice
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ArrowUpTrayIcon className="w-10 h-10 text-gray-400" />
            <p className="text-sm font-semibold text-gray-700">
              Upload Your Own Voice Recording
            </p>
            <p className="text-xs text-gray-500">
              MP3, WAV, or OGG • Max 10MB
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Record yourself reading the script for a personal touch
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-gray-700">
        <strong>💡 Tip:</strong> Built-in voices use Google Text-to-Speech for instant generation.
        Upload your own voice recording for a more personal touch, or contact us about ElevenLabs
        integration for premium AI voices.
      </div>
    </div>
  );
}
