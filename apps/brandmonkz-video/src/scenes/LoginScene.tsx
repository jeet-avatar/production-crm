import React from 'react';
import { useCurrentFrame, spring } from 'remotion';
import { SceneWrapper } from '../components/SceneWrapper';

const ORANGE = '#FF6B35';

export const LoginScene: React.FC = () => {
  const frame = useCurrentFrame();

  const cardProgress = spring({
    frame: Math.max(0, frame - 20),
    fps: 30,
    config: { damping: 200 },
  });

  const cardScale = cardProgress;
  const cardOpacity = cardProgress;

  return (
    <SceneWrapper
      icon="🔐"
      title="Step 1: Login"
      subtitle="Visit app.brandmonkz.com and sign in"
    >
      <div
        style={{
          transform: `scale(${cardScale})`,
          opacity: cardOpacity,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: '24px 28px',
          width: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* Email field */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Email</label>
          <div
            style={{
              backgroundColor: '#F3F4F6',
              borderRadius: 6,
              height: 36,
              border: '1px solid #E5E7EB',
              paddingLeft: 10,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 13, color: '#9CA3AF' }}>rajesh@example.com</span>
          </div>
        </div>

        {/* Password field */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Password</label>
          <div
            style={{
              backgroundColor: '#F3F4F6',
              borderRadius: 6,
              height: 36,
              border: '1px solid #E5E7EB',
              paddingLeft: 10,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 16, color: '#374151', letterSpacing: 4 }}>••••••••</span>
          </div>
        </div>

        {/* Login button */}
        <div
          style={{
            backgroundColor: ORANGE,
            borderRadius: 8,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 700 }}>Login</span>
        </div>
      </div>
    </SceneWrapper>
  );
};
