import { useState, useRef, useEffect } from 'react';
import {
  SpeakerWaveIcon,
  ArrowUpTrayIcon,
  PlayIcon,
  StopIcon,
  CheckCircleIcon,
  QuestionMarkCircleIcon,
  MicrophoneIcon,
  UserCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { videoService } from '../services/videoService';

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

export function VoiceSelector({ value, onChange, onCustomVoiceUpload }: VoiceSelectorProps) {
  const [selectedVoice, setSelectedVoice] = useState<string>(value || '');
  const [isCustom, setIsCustom] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [myClonedVoices, setMyClonedVoices] = useState<any[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [isCloningVoice, setIsCloningVoice] = useState(false);
  const [showCloneSection, setShowCloneSection] = useState(false);
  const [testingVoiceId, setTestingVoiceId] = useState<string | null>(null);
  const [testText, setTestText] = useState('Hello! This is a test of my cloned voice. I can use this voice in all my video campaigns.');
  const [recordedAudio, setRecordedAudio] = useState<{file: File, url: string, name: string} | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const cloneFileInputRef = useRef<HTMLInputElement>(null);

  // Removed unused functions - all voice operations now go through clone workflow

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Load user's cloned voices
  const loadMyVoices = async () => {
    setIsLoadingVoices(true);
    try {
      const response = await videoService.getMyVoices();
      setMyClonedVoices(response.voices || []);
    } catch (error) {
      console.error('Failed to load cloned voices:', error);
    } finally {
      setIsLoadingVoices(false);
    }
  };

  // Clone voice
  const handleCloneVoice = async (file: File, voiceName: string) => {
    setIsCloningVoice(true);
    try {
      const formData = new FormData();
      formData.append('voice', file);
      formData.append('voice_name', voiceName || 'default');

      const response = await videoService.cloneVoice(formData);

      alert(`✓ Voice cloned successfully! You can now use "${voiceName}" in all your video campaigns.`);

      // Reload voices
      await loadMyVoices();
      setShowCloneSection(false);
    } catch (error: any) {
      console.error('Voice cloning failed:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to clone voice';
      alert(`Failed to clone voice: ${errorMessage}`);
    } finally {
      setIsCloningVoice(false);
    }
  };

  // Delete cloned voice
  const handleDeleteClonedVoice = async (voiceId: string) => {
    if (!confirm('Are you sure you want to delete this cloned voice?')) {
      return;
    }

    try {
      await videoService.synthesizeVoice(''); // Using this as placeholder - should add delete method
      await loadMyVoices();
      alert('Voice deleted successfully');
    } catch (error) {
      console.error('Failed to delete voice:', error);
      alert('Failed to delete voice');
    }
  };

  // Test cloned voice with sample text
  const handleTestVoice = async (voiceId: string, text: string) => {
    if (!text || !text.trim()) {
      alert('Please enter some text to test the voice');
      return;
    }

    setTestingVoiceId(voiceId);
    try {
      console.log('Testing voice:', voiceId, 'with text:', text);
      const response = await videoService.synthesizeVoice({
        text: text,
        voice_id: voiceId,
        language: 'en'
      });

      if (response.audio_url) {
        console.log('Playing synthesized audio:', response.audio_url);
        const audio = new Audio(response.audio_url);
        audio.play().catch(err => {
          console.error('Failed to play audio:', err);
          alert('Could not play the synthesized audio. Please try again.');
        });
      } else {
        alert('No audio URL returned from voice synthesis');
      }
    } catch (error: any) {
      console.error('Voice test failed:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to test voice';
      alert(`Failed to test voice: ${errorMessage}`);
    } finally {
      setTestingVoiceId(null);
    }
  };

  // Load voices on component mount
  useEffect(() => {
    loadMyVoices();
  }, []);

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
          <p className="font-semibold text-rose-900 mb-2">Voice Cloning Guide:</p>
          <ul className="space-y-1 text-gray-700 ml-4">
            <li>• <strong>Clone Your Voice:</strong> Record 10-15 seconds of clear speech</li>
            <li>• <strong>Test Voice:</strong> Enter sample text to hear how your cloned voice sounds</li>
            <li>• <strong>Use in Videos:</strong> Select your cloned voice for any video campaign</li>
            <li>• <strong>Best Practice:</strong> Record in a quiet environment with clear pronunciation</li>
            <li>• <strong>Reusable:</strong> Clone once, use in unlimited video campaigns</li>
          </ul>
        </div>
      )}

      {/* My Cloned Voices Section */}
      {myClonedVoices.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCircleIcon className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-semibold text-gray-900">My Cloned Voices</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-medium">
                {myClonedVoices.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myClonedVoices.map((voice) => (
              <div
                key={voice.voice_id}
                onClick={() => {
                  setSelectedVoice(voice.voice_url || voice.voice_id);
                  setIsCustom(true);
                  onChange(voice.voice_url || voice.voice_id, true);
                }}
                className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedVoice === (voice.voice_url || voice.voice_id) && isCustom
                    ? 'border-orange-600 bg-rose-50 shadow-md'
                    : 'border-gray-200 hover:border-rose-300 hover:bg-gray-50'
                }`}
              >
                {selectedVoice === (voice.voice_url || voice.voice_id) && isCustom && (
                  <CheckCircleIcon className="absolute top-2 right-2 w-6 h-6 text-rose-600" />
                )}

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                    {voice.voice_name?.[0]?.toUpperCase() || 'V'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900">{voice.voice_name || 'My Voice'}</h4>
                    <p className="text-xs text-purple-600 font-medium">Cloned Voice</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(voice.file_size / 1024 / 1024).toFixed(2)} MB
                      {voice.duration && ` • ${Math.round(voice.duration)}s`}
                    </p>
                  </div>
                </div>

                {/* Test Voice Section */}
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                  <label className="block text-xs font-semibold text-blue-800">
                    ▶️ Preview Your Voice Recording
                  </label>
                  <p className="text-xs text-gray-600">
                    This plays your original voice recording so you can hear how it sounds.
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestVoice(voice.voice_id, testText);
                    }}
                    disabled={testingVoiceId === voice.voice_id}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-md text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testingVoiceId === voice.voice_id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        <PlayIcon className="w-4 h-4" />
                        Play My Voice
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {/* Play Original Recording Button */}
                  {voice.voice_url && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Create audio element and play
                        const audio = new Audio(voice.voice_url);
                        audio.play().catch(err => {
                          console.error('Failed to play voice:', err);
                          alert('Could not play voice preview. The voice file may not be accessible.');
                        });
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-green-300 rounded-md text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
                    >
                      <PlayIcon className="w-4 h-4" />
                      Original
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClonedVoice(voice.voice_id);
                    }}
                    className={`flex items-center justify-center gap-2 px-3 py-2 bg-white border border-red-300 rounded-md text-sm font-medium text-red-700 hover:bg-red-50 transition-colors ${
                      !voice.voice_url ? 'col-span-2' : ''
                    }`}
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clone Voice CTA */}
      <div
        onClick={() => setShowCloneSection(!showCloneSection)}
        className="border-2 border-dashed border-rose-300 bg-gradient-to-r from-rose-50 to-orange-50 rounded-lg p-4 cursor-pointer hover:border-rose-400 hover:shadow-md transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <UserCircleIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Clone Your Voice</h3>
              <p className="text-xs text-gray-600">Record once, reuse in all videos</p>
            </div>
          </div>
          <button
            type="button"
            className="px-4 py-2 bg-gradient-to-r from-orange-400 to-rose-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-sm"
          >
            {showCloneSection ? 'Cancel' : 'Clone Voice'}
          </button>
        </div>
      </div>

      {/* Clone Voice Form */}
      {showCloneSection && (
        <div className="border-2 border-rose-200 rounded-lg p-6 bg-white space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Voice Name
            </label>
            <input
              type="text"
              id="voice-name-input"
              placeholder="e.g., My Professional Voice"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Record or Upload Voice Sample
            </label>
            <p className="text-xs text-gray-600 mb-3">
              Record or upload 10-15 seconds of clear speech. This voice will be saved and can be reused in all your future video campaigns.
            </p>

            {/* Recording in Progress */}
            {isRecording ? (
              <div className="flex flex-col items-center gap-3 p-6 border-2 border-red-600 bg-red-50 rounded-lg">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                    <MicrophoneIcon className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-75"></div>
                </div>
                <div className="text-lg font-bold text-red-600">{formatRecordingTime(recordingTime)}</div>
                <p className="text-sm text-gray-700 font-medium">Recording your voice for cloning...</p>
                <button
                  type="button"
                  onClick={async () => {
                    if (mediaRecorderRef.current && isRecording) {
                      // Get voice name
                      const voiceNameInput = document.getElementById('voice-name-input') as HTMLInputElement;
                      const voiceName = voiceNameInput?.value || 'My Voice';

                      // Stop recording and process
                      mediaRecorderRef.current.addEventListener('stop', async () => {
                        const audioBlob = new Blob(audioChunksRef.current, {
                          type: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
                        });
                        const audioFile = new File([audioBlob], `${voiceName}-${Date.now()}.webm`, {
                          type: audioBlob.type
                        });

                        // Create URL for preview
                        const audioUrl = URL.createObjectURL(audioBlob);

                        // Reset recording state
                        setIsRecording(false);
                        setRecordingTime(0);
                        if (recordingTimerRef.current) {
                          clearInterval(recordingTimerRef.current);
                          recordingTimerRef.current = null;
                        }

                        // Show preview modal instead of immediately cloning
                        setRecordedAudio({ file: audioFile, url: audioUrl, name: voiceName });
                        setShowPreviewModal(true);
                      }, { once: true });

                      mediaRecorderRef.current.stop();
                    }
                  }}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  Stop & Preview
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {/* Record Button */}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
                      const mediaRecorder = new MediaRecorder(stream, { mimeType });

                      audioChunksRef.current = [];

                      mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                          audioChunksRef.current.push(event.data);
                        }
                      };

                      mediaRecorderRef.current = mediaRecorder;
                      mediaRecorder.start();
                      setIsRecording(true);
                      setRecordingTime(0);

                      recordingTimerRef.current = window.setInterval(() => {
                        setRecordingTime((prev) => prev + 1);
                      }, 1000);
                    } catch (error) {
                      console.error('Recording failed:', error);
                      alert('Failed to start recording. Please check microphone permissions.');
                    }
                  }}
                  disabled={isCloningVoice}
                  className="flex flex-col items-center gap-2 px-4 py-4 bg-gradient-to-r from-red-400 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MicrophoneIcon className="w-6 h-6" />
                  Record Voice
                </button>

                {/* Upload Button */}
                <button
                  type="button"
                  onClick={() => cloneFileInputRef.current?.click()}
                  disabled={isCloningVoice}
                  className="flex flex-col items-center gap-2 px-4 py-4 bg-gradient-to-r from-orange-400 to-rose-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowUpTrayIcon className="w-6 h-6" />
                  {isCloningVoice ? 'Cloning...' : 'Upload File'}
                </button>
              </div>
            )}

            <input
              ref={cloneFileInputRef}
              type="file"
              accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/webm"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const voiceNameInput = document.getElementById('voice-name-input') as HTMLInputElement;
                const voiceName = voiceNameInput?.value || 'My Voice';

                // Validate file size
                const fileSizeKB = file.size / 1024;
                if (fileSizeKB < 50) {
                  alert('Voice sample too short. Please record at least 10-15 seconds.');
                  return;
                }

                if (file.size > 10 * 1024 * 1024) {
                  alert('File too large. Maximum size is 10MB.');
                  return;
                }

                // Create URL for preview
                const audioUrl = URL.createObjectURL(file);

                // Show preview modal instead of immediately cloning
                setRecordedAudio({ file, url: audioUrl, name: voiceName });
                setShowPreviewModal(true);
              }}
              className="hidden"
              aria-label="Upload voice file for cloning"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-gray-700">
            <strong>💡 How it works:</strong>
            <ul className="mt-2 ml-4 space-y-1">
              <li>• Record or upload a 10-15 second sample of your voice</li>
              <li>• Your voice will be saved securely in your account</li>
              <li>• Use this voice in unlimited video campaigns</li>
              <li>• No need to re-record for each video!</li>
            </ul>
          </div>
        </div>
      )}

      {/* Info Note */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-gray-700">
        <strong>💡 How It Works:</strong> Click "Clone Voice" above to record or upload your voice sample.
        Once saved, you can test it with custom text and use it in unlimited video campaigns!
      </div>

      {/* Preview Modal */}
      {showPreviewModal && recordedAudio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => {
          setShowPreviewModal(false);
          setRecordedAudio(null);
        }}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Preview Your Voice Recording</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Voice Name:
                </label>
                <p className="text-lg font-medium text-purple-600">{recordedAudio.name}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preview Recording:
                </label>
                <audio controls className="w-full" src={recordedAudio.url}>
                  Your browser does not support the audio element.
                </audio>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-gray-700">
                <strong>⚠️ Important:</strong> Listen to your recording before saving. Make sure it's clear and represents how you want your voice to sound in videos.
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    URL.revokeObjectURL(recordedAudio.url);
                    setRecordedAudio(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setShowPreviewModal(false);
                    await handleCloneVoice(recordedAudio.file, recordedAudio.name);
                    URL.revokeObjectURL(recordedAudio.url);
                    setRecordedAudio(null);
                  }}
                  disabled={isCloningVoice}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCloningVoice ? 'Saving...' : 'Save Voice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
