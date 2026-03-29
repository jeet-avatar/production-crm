import React from 'react';
import { useCurrentFrame, spring, interpolate } from 'remotion';
import { SceneWrapper } from '../components/SceneWrapper';

const ORANGE = '#FF6B35';

export const WelcomeScene: React.FC = () => {
  const frame = useCurrentFrame();

  const taglineProgress = spring({
    frame: Math.max(0, frame - 30),
    fps: 30,
    config: { damping: 200 },
  });

  const taglineY = interpolate(taglineProgress, [0, 1], [40, 0]);
  const taglineOpacity = taglineProgress;

  return (
    <SceneWrapper
      icon="👋"
      title="Welcome to BrandMonkz"
      subtitle="Your AI-powered CRM for smart outreach"
    >
      <div
        style={{
          transform: `translateY(${taglineY}px)`,
          opacity: taglineOpacity,
          color: ORANGE,
          fontSize: 22,
          fontWeight: 600,
          textAlign: 'center',
          marginTop: 8,
          letterSpacing: '0.5px',
        }}
      >
        Grow your business with intelligent automation
      </div>
    </SceneWrapper>
  );
};
