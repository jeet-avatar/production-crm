import React from 'react';
import { useCurrentFrame, spring } from 'remotion';
import { SceneWrapper } from '../components/SceneWrapper';

const ORANGE = '#FF6B35';

export const CampaignsScene: React.FC = () => {
  const frame = useCurrentFrame();

  const cardProgress = spring({
    frame: Math.max(0, frame - 25),
    fps: 30,
    config: { damping: 200 },
  });

  return (
    <SceneWrapper
      icon="📧"
      title="Step 3: Send Email Campaigns"
      subtitle="Create targeted campaigns in minutes"
    >
      <div
        style={{
          transform: `translateY(${(1 - cardProgress) * 40}px)`,
          opacity: cardProgress,
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          padding: '20px 24px',
          width: 420,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          position: 'relative',
        }}
      >
        {/* New Campaign badge */}
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            backgroundColor: ORANGE,
            borderRadius: 12,
            padding: '3px 10px',
          }}
        >
          <span style={{ color: '#FFFFFF', fontSize: 11, fontWeight: 700 }}>New Campaign</span>
        </div>

        {/* Subject */}
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280' }}>Subject</span>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginTop: 2 }}>
            Exclusive offer just for you!
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: '#E5E7EB', marginBottom: 10 }} />

        {/* Body preview */}
        <div style={{ fontSize: 13, color: '#374151', marginBottom: 14, lineHeight: 1.5 }}>
          Hi Rajesh, we have something special prepared just for you and your team...
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            backgroundColor: '#F9FAFB',
            borderRadius: 8,
            padding: '8px 12px',
          }}
        >
          <span style={{ fontSize: 12, color: '#374151' }}>📬 1,240 sent</span>
          <span style={{ fontSize: 12, color: '#374151' }}>✅ 62% opened</span>
          <span style={{ fontSize: 12, color: '#374151' }}>🖱 28% clicked</span>
        </div>
      </div>
    </SceneWrapper>
  );
};
