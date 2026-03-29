import React from 'react';
import { useCurrentFrame, spring } from 'remotion';
import { SceneWrapper } from '../components/SceneWrapper';

const ORANGE = '#FF6B35';
const INDIGO = '#4F46E5';

interface PillBadgeProps {
  label: string;
  delay: number;
}

const PillBadge: React.FC<PillBadgeProps> = ({ label, delay }) => {
  const frame = useCurrentFrame();

  const progress = spring({
    frame: Math.max(0, frame - delay),
    fps: 30,
    config: { damping: 200 },
  });

  return (
    <div
      style={{
        transform: `scale(${progress})`,
        opacity: progress,
        backgroundColor: '#FFFFFF',
        borderRadius: 9999,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <span style={{ color: INDIGO, fontSize: 14, fontWeight: 600 }}>{label}</span>
    </div>
  );
};

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();

  const ctaProgress = spring({
    frame: Math.max(0, frame - 80),
    fps: 30,
    config: { damping: 200 },
  });

  const pills = [
    { label: '🤖 AI-Powered', delay: 30 },
    { label: '📧 Email Campaigns', delay: 50 },
    { label: '📊 Smart Analytics', delay: 70 },
  ];

  return (
    <SceneWrapper
      icon="🚀"
      title="Ready to grow?"
      subtitle="Start your free trial at brandmonkz.com"
    >
      {/* Feature pills */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
        {pills.map((p) => (
          <PillBadge key={p.label} label={p.label} delay={p.delay} />
        ))}
      </div>

      {/* CTA line */}
      <div
        style={{
          marginTop: 20,
          opacity: ctaProgress,
          color: ORANGE,
          fontSize: 16,
          fontWeight: 500,
        }}
      >
        Questions? Contact support@brandmonkz.com
      </div>
    </SceneWrapper>
  );
};
