import React from 'react';
import {
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// ── Step data ───────────────────────────────────────────────────────────────

interface StepData {
  emoji: string;
  title: string;
  desc: string;
}

const STEPS: StepData[] = [
  { emoji: '🔑', title: 'Login & Enter',      desc: 'Sign in at app.brandmonkz.com with your email' },
  { emoji: '📧', title: 'Setup Email Server', desc: 'Connect your Gmail or SMTP so emails actually land' },
  { emoji: '📣', title: 'Go To Campaigns',    desc: 'Click Campaigns in the left menu' },
  { emoji: '✏️', title: 'Create Campaign',   desc: 'Hit New Campaign, give it a name and subject line' },
  { emoji: '🤖', title: 'Write With AI',      desc: 'Click AI Write — describe your goal in one sentence' },
  { emoji: '👥', title: 'Add Your Contacts',  desc: 'Pick a contact group or paste a list of emails' },
  { emoji: '🚀', title: 'Review & Launch',    desc: 'Check preview, hit Send — your campaign is live' },
  { emoji: '📊', title: 'Track Your Results', desc: 'Watch opens, clicks, and replies roll in' },
];

const ORANGE = '#FF6B35';
const DARK   = '#1A1A2E';
const GRAY   = '#B0B0C3';

// ── Single scene component ────────────────────────────────────────────────

interface SceneProps {
  stepIndex: number; // 0-based
}

const CampaignStepScene: React.FC<SceneProps> = ({ stepIndex }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const step = STEPS[stepIndex];

  // Emoji bounce-in
  const emojiScale = spring({
    frame,
    fps,
    config: { mass: 0.5, stiffness: 200, damping: 12 },
  });

  // Step pill slides in from left + fades
  const pillOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const pillX       = interpolate(frame, [0, 15], [-40, 0], { extrapolateRight: 'clamp' });

  // Title slides up + fades
  const titleOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: 'clamp' });
  const titleY       = interpolate(frame, [10, 25], [30, 0], { extrapolateRight: 'clamp' });

  // Description fades in
  const descOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' });

  // Progress bar width: 0% → (stepIndex+1)/8 × 100%
  const targetPct = ((stepIndex + 1) / 8) * 100;
  const barWidth  = interpolate(frame, [0, 60], [0, targetPct], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        width: 1280,
        height: 720,
        background: DARK,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Step pill */}
      <div
        style={{
          opacity: pillOpacity,
          transform: `translateX(${pillX}px)`,
          background: ORANGE,
          color: '#fff',
          fontSize: 16,
          fontWeight: 700,
          padding: '8px 20px',
          borderRadius: 24,
          letterSpacing: 1,
          marginBottom: 32,
          textTransform: 'uppercase',
        }}
      >
        Step {stepIndex + 1} of 8
      </div>

      {/* Emoji */}
      <div
        style={{
          fontSize: 120,
          lineHeight: 1,
          marginBottom: 28,
          transform: `scale(${emojiScale})`,
          display: 'block',
        }}
      >
        {step.emoji}
      </div>

      {/* Title */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontSize: 52,
          fontWeight: 800,
          color: '#fff',
          marginBottom: 18,
          textAlign: 'center',
          maxWidth: 800,
        }}
      >
        {step.title}
      </div>

      {/* Description */}
      <div
        style={{
          opacity: descOpacity,
          fontSize: 26,
          color: GRAY,
          textAlign: 'center',
          maxWidth: 700,
          lineHeight: 1.5,
        }}
      >
        {step.desc}
      </div>

      {/* Progress bar at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 6,
          background: 'rgba(255,255,255,0.1)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${barWidth}%`,
            background: ORANGE,
            borderRadius: '0 3px 3px 0',
            transition: 'none',
          }}
        />
      </div>
    </div>
  );
};

// ── Named scene exports (one per step) ────────────────────────────────────

export const Scene1Login:          React.FC = () => <CampaignStepScene stepIndex={0} />;
export const Scene2EmailSetup:     React.FC = () => <CampaignStepScene stepIndex={1} />;
export const Scene3Campaigns:      React.FC = () => <CampaignStepScene stepIndex={2} />;
export const Scene4CreateCampaign: React.FC = () => <CampaignStepScene stepIndex={3} />;
export const Scene5WriteAI:        React.FC = () => <CampaignStepScene stepIndex={4} />;
export const Scene6Contacts:       React.FC = () => <CampaignStepScene stepIndex={5} />;
export const Scene7Launch:         React.FC = () => <CampaignStepScene stepIndex={6} />;
export const Scene8Results:        React.FC = () => <CampaignStepScene stepIndex={7} />;

// ── Master video (sequences all 8 scenes) ─────────────────────────────────

const FRAMES_PER_SCENE = 150; // 5s at 30fps

export const CampaignTutorialVideo: React.FC = () => {
  const scenes = [
    Scene1Login,
    Scene2EmailSetup,
    Scene3Campaigns,
    Scene4CreateCampaign,
    Scene5WriteAI,
    Scene6Contacts,
    Scene7Launch,
    Scene8Results,
  ];

  return (
    <>
      {scenes.map((SceneComponent, i) => (
        <Sequence
          key={i}
          from={i * FRAMES_PER_SCENE}
          durationInFrames={FRAMES_PER_SCENE}
        >
          <SceneComponent />
        </Sequence>
      ))}
    </>
  );
};
