import React from 'react';
import { useCurrentFrame, spring } from 'remotion';
import { SceneWrapper } from '../components/SceneWrapper';

const ORANGE = '#FF6B35';
const INDIGO = '#4F46E5';

export const ChatbotScene: React.FC = () => {
  const frame = useCurrentFrame();

  const userMsgProgress = spring({
    frame: Math.max(0, frame - 20),
    fps: 30,
    config: { damping: 200 },
  });

  const aiMsgProgress = spring({
    frame: Math.max(0, frame - 55),
    fps: 30,
    config: { damping: 200 },
  });

  return (
    <SceneWrapper
      icon="🤖"
      title="Step 4: AI Chatbot"
      subtitle="Your AI assistant answers questions 24/7"
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          padding: '16px 20px',
          width: 380,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* User message */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            opacity: userMsgProgress,
            transform: `translateX(${(1 - userMsgProgress) * 30}px)`,
          }}
        >
          <div
            style={{
              backgroundColor: INDIGO,
              borderRadius: '14px 14px 4px 14px',
              padding: '10px 14px',
              maxWidth: '75%',
            }}
          >
            <span style={{ color: '#FFFFFF', fontSize: 13 }}>
              How many contacts do I have?
            </span>
          </div>
        </div>

        {/* AI response */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 4,
            opacity: aiMsgProgress,
            transform: `translateX(${(1 - aiMsgProgress) * -30}px)`,
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, color: ORANGE, paddingLeft: 4 }}>
            BrandMonkz AI
          </span>
          <div
            style={{
              backgroundColor: '#F3F4F6',
              borderRadius: '4px 14px 14px 14px',
              padding: '10px 14px',
              maxWidth: '85%',
            }}
          >
            <span style={{ color: '#111827', fontSize: 13, lineHeight: 1.5 }}>
              You have 1,240 contacts. 340 opened your last campaign. 🎉
            </span>
          </div>
        </div>
      </div>
    </SceneWrapper>
  );
};
