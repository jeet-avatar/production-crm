import { useState, useRef, useEffect } from 'react';
import {
  SpeakerWaveIcon,
  ArrowUpTrayIcon,
  PlayIcon,
  StopIcon,
  CheckCircleIcon,
  QuestionMarkCircleIcon,
  MicrophoneIcon,
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
    id: 'natural-en-us-male-1',
    name: 'Alex',
    accent: 'American English',
    gender: 'male',
    description: 'Natural American male voice, deep and authoritative',
    preview: 'Hello! Welcome to our presentation. Today I\'ll be sharing some exciting insights with you.',
  },
  {
    id: 'natural-en-us-female-1',
    name: 'Samantha',
    accent: 'American English',
    gender: 'female',
    description: 'Natural American female voice, clear and professional',
    preview: 'Hi there! Thanks for joining us. Let\'s explore these amazing features together.',
  },
  {
    id: 'natural-en-uk-male-1',
    name: 'Daniel',
    accent: 'British English',
    gender: 'male',
    description: 'Natural British male voice, sophisticated and articulate',
    preview: 'Good day! I\'m delighted to present this information to you today.',
  },
  {
    id: 'natural-en-uk-female-1',
    name: 'Kate',
    accent: 'British English',
    gender: 'female',
    description: 'Natural British female voice, elegant and refined',
    preview: 'Welcome! It\'s my pleasure to guide you through today\'s presentation.',
  },
  {
    id: 'natural-en-au-female-1',
    name: 'Karen',
    accent: 'Australian English',
    gender: 'female',
    description: 'Natural Australian female voice, friendly and warm',
    preview: 'G\'day! Thanks for joining us today. Let\'s dive into the details.',
  },
  {
    id: 'natural-en-in-female-1',
    name: 'Veena',
    accent: 'Indian English',
    gender: 'female',
    description: 'Natural Indian female voice, professional and clear',
    preview: 'Hello! I am pleased to share these insights with you.',
  },
  {
    id: 'natural-en-us-male-2',
    name: 'Tom',
    accent: 'American English',
    gender: 'male',
    description: 'Natural American male voice, friendly and conversational',
    preview: 'Hey everyone! Let me walk you through this exciting opportunity.',
  },
  {
    id: 'natural-en-us-female-2',
    name: 'Victoria',
    accent: 'American English',
    gender: 'female',
    description: 'Natural American female voice, warm and engaging',
    preview: 'Welcome! I\'m excited to share these important updates with you.',
  },
  {
    id: 'natural-en-ie-male-1',
    name: 'Moira',
    accent: 'Irish English',
    gender: 'male',
    description: 'Natural Irish male voice, charming and engaging',
    preview: 'Top of the morning! Let me walk you through this today.',
  },
  {
    id: 'natural-fr-fr-female-1',
    name: 'Amelie',
    accent: 'French',
    gender: 'female',
    description: 'Natural French female voice, elegant and expressive',
    preview: 'Bonjour! Welcome to our presentation today.',
  },
  {
    id: 'natural-de-de-male-1',
    name: 'Anna',
    accent: 'German',
    gender: 'male',
    description: 'Natural German male voice, clear and professional',
    preview: 'Guten Tag! Welcome to today\'s presentation.',
  },
  {
    id: 'natural-es-es-female-1',
    name: 'Monica',
    accent: 'Spanish',
    gender: 'female',
    description: 'Natural Spanish female voice, vibrant and articulate',
    preview: 'Hola! Welcome to our presentation today.',
  },
];

export function VoiceSelector({ value, onChange, onCustomVoiceUpload }: VoiceSelectorProps) {
  const [selectedVoice, setSelectedVoice] = useState<string>(value || 'natural-en-us-male-1');
  const [isCustom, setIsCustom] = useState(false);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
      const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];
      if (!validTypes.includes(file.type)) {
        alert('Invalid file type. Please upload MP3, WAV, OGG, or WEBM audio files.');
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

  // Load available voices for better matching
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Recording functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Use audio/webm for better browser compatibility
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioFile = new File([audioBlob], `voice-recording-${Date.now()}.webm`, { type: mimeType });

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Upload the recorded file
        await handleCustomVoiceUpload(audioFile);

        // Reset recording state
        setIsRecording(false);
        setRecordingTime(0);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Recording failed:', error);
      alert('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SpeakerWaveIcon className="w-5 h-5 text-rose-600" />
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
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-sm">
          <p className="font-semibold text-rose-900 mb-2">Voice Selection Guide:</p>
          <ul className="space-y-1 text-gray-700 ml-4">
            <li>• <strong>Built-in Voices:</strong> Choose from 12 natural-sounding voices with different accents</li>
            <li>• <strong>Preview:</strong> Click play button to hear a sample of each voice</li>
            <li>• <strong>Record Voice:</strong> Record yourself directly in the browser for a personal touch</li>
            <li>• <strong>Upload Voice:</strong> Upload a pre-recorded MP3, WAV, or OGG file</li>
            <li>• <strong>Best Practice:</strong> Record in a quiet environment with clear pronunciation for best results</li>
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
                ? 'border-orange-600 bg-rose-50 shadow-md'
                : 'border-gray-200 hover:border-rose-300 hover:bg-gray-50'
            }`}
          >
            {/* Selected Indicator */}
            {selectedVoice === voice.id && !isCustom && (
              <CheckCircleIcon className="absolute top-2 right-2 w-6 h-6 text-rose-600" />
            )}

            {/* Voice Info */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white font-bold text-lg">
                {voice.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900">{voice.name}</h4>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {voice.gender === 'male' ? '♂' : '♀'}
                  </span>
                </div>
                <p className="text-xs text-rose-600 font-medium">{voice.accent}</p>
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
          <span className="px-2 bg-white text-gray-500 uppercase">Or Use Your Own Voice</span>
        </div>
      </div>

      {/* Custom Voice Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Record Voice */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
            isRecording
              ? 'border-red-600 bg-red-50 cursor-default'
              : isCustom
              ? 'border-orange-600 bg-rose-50 cursor-default'
              : 'border-gray-300 hover:border-orange-400 hover:bg-gray-50 cursor-pointer'
          }`}
        >
          {isRecording ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                  <MicrophoneIcon className="w-8 h-8 text-white" />
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-75"></div>
              </div>
              <div className="text-lg font-bold text-red-600">{formatRecordingTime(recordingTime)}</div>
              <p className="text-sm text-gray-700 font-medium">Recording in progress...</p>
              <button
                type="button"
                onClick={stopRecording}
                className="mt-2 px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Stop Recording
              </button>
            </div>
          ) : customFile ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircleIcon className="w-12 h-12 text-rose-600" />
              <p className="font-semibold text-gray-900">Custom Voice Ready</p>
              <p className="text-xs text-gray-600 truncate max-w-full">{customFile.name}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCustomFile(null);
                  setIsCustom(false);
                  handleVoiceSelect('natural-en-us-male-1');
                }}
                className="mt-2 text-sm text-rose-600 hover:text-rose-700 font-medium"
              >
                Change Voice
              </button>
            </div>
          ) : isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
              <p className="text-sm text-gray-600">Processing...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
                <MicrophoneIcon className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-semibold text-gray-700">Record Voice</p>
              <p className="text-xs text-gray-500">Click to start recording</p>
              <button
                type="button"
                onClick={startRecording}
                className="mt-2 px-4 py-2 bg-gradient-to-r from-orange-400 to-rose-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Start Recording
              </button>
            </div>
          )}
        </div>

        {/* Upload Voice */}
        <div
          onClick={() => !isRecording && !isCustom && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
            isCustom
              ? 'border-orange-600 bg-rose-50 cursor-default'
              : isRecording
              ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-orange-400 hover:bg-gray-50 cursor-pointer'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : customFile ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircleIcon className="w-12 h-12 text-rose-600" />
              <p className="font-semibold text-gray-900">Voice Uploaded</p>
              <p className="text-xs text-gray-600 truncate max-w-full">{customFile.name}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCustomFile(null);
                  setIsCustom(false);
                  handleVoiceSelect('natural-en-us-male-1');
                }}
                className="mt-2 text-sm text-rose-600 hover:text-rose-700 font-medium"
              >
                Change Voice
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
                <ArrowUpTrayIcon className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-semibold text-gray-700">Upload Voice File</p>
              <p className="text-xs text-gray-500">MP3, WAV, OGG • Max 10MB</p>
              <button
                type="button"
                disabled={isRecording}
                className="mt-2 px-4 py-2 bg-gradient-to-r from-orange-400 to-rose-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Choose File
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/webm"
            onChange={handleFileChange}
            className="hidden"
            disabled={isRecording}
          />
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-gray-700">
        <strong>💡 Tip:</strong> Choose from 12 natural-sounding built-in voices, or use your own voice for maximum personalization.
        Record directly in your browser or upload a pre-recorded audio file. For best results, speak clearly and record in a quiet environment.
      </div>
    </div>
  );
}
