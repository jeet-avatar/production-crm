import { useState, useEffect } from 'react';
import {
  SpeakerWaveIcon,
  PlayIcon,
  CheckCircleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { videoService } from '../services/videoService';

interface VoiceSelectorProps {
  value?: string; // Selected voice ID
  onChange: (voice: string, isCustom: boolean) => void;
}

export function VoiceSelector({ value, onChange }: VoiceSelectorProps) {
  const [selectedVoice, setSelectedVoice] = useState<string>(value || '');
  const [showHelp, setShowHelp] = useState(false);
  const [elevenLabsVoices, setElevenLabsVoices] = useState<any[]>([]);
  const [isLoadingElevenLabs, setIsLoadingElevenLabs] = useState(false);

  // Load ElevenLabs voices
  const loadElevenLabsVoices = async () => {
    setIsLoadingElevenLabs(true);
    try {
      const response = await videoService.getElevenLabsVoices();
      setElevenLabsVoices(response.voices || []);
    } catch (error) {
      console.error('Failed to load ElevenLabs voices:', error);
      // Silent fail - show error message to user
    } finally {
      setIsLoadingElevenLabs(false);
    }
  };

  // Load voices on component mount
  useEffect(() => {
    loadElevenLabsVoices();
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SpeakerWaveIcon className="w-5 h-5 text-blue-600" />
          <label className="text-sm font-semibold text-gray-700">
            Voice Selection
          </label>
        </div>
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="p-1 text-gray-400 hover:text-orange-600 transition-colors"
          title="Show help"
        >
          <QuestionMarkCircleIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <p className="font-semibold text-blue-900 mb-2">ElevenLabs Professional Voices:</p>
          <ul className="space-y-1 text-gray-700 ml-4">
            <li>• <strong>Preview:</strong> Click "Preview Voice" to hear a sample</li>
            <li>• <strong>Select:</strong> Click on a voice card to select it for your video</li>
            <li>• <strong>Quality:</strong> All voices are premium AI-generated with natural intonation</li>
            <li>• <strong>Usage:</strong> Selected voice will be used to narrate your video script</li>
          </ul>
        </div>
      )}

      {/* ElevenLabs Professional Voices Section */}
      {elevenLabsVoices.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SpeakerWaveIcon className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">Professional Voices</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                {elevenLabsVoices.length} voices
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
            {elevenLabsVoices.map((voice) => (
              <div
                key={voice.voice_id}
                onClick={() => {
                  setSelectedVoice(voice.voice_id);
                  onChange(voice.voice_id, false);
                }}
                className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedVoice === voice.voice_id
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                {selectedVoice === voice.voice_id && (
                  <CheckCircleIcon className="absolute top-2 right-2 w-6 h-6 text-blue-600" />
                )}

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                    {voice.name?.[0]?.toUpperCase() || 'V'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900">{voice.name}</h4>
                    <p className="text-xs text-blue-600 font-medium">ElevenLabs AI Voice</p>
                    {voice.labels && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {voice.labels.gender && (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {voice.labels.gender}
                          </span>
                        )}
                        {voice.labels.accent && (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {voice.labels.accent}
                          </span>
                        )}
                        {voice.labels.age && (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {voice.labels.age}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Play Preview if available */}
                {voice.preview_url && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const audio = new Audio(voice.preview_url);
                      audio.play().catch(err => {
                        console.error('Failed to play preview:', err);
                      });
                    }}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 border border-blue-300 rounded-md text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <PlayIcon className="w-4 h-4" />
                    Preview Voice
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoadingElevenLabs && elevenLabsVoices.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          Loading professional voices...
        </div>
      )}

      {!isLoadingElevenLabs && elevenLabsVoices.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          <p className="mb-2">No voices available</p>
          <p className="text-xs">Please check your ElevenLabs API configuration</p>
        </div>
      )}
    </div>
  );
}
