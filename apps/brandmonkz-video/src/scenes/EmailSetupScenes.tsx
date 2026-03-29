import React from 'react';
import {
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const ORANGE  = '#FF6B35';
const INDIGO  = '#4F46E5';
const DARK    = '#1A1A2E';
const DARKER  = '#0F0F1E';
const GREEN   = '#22C55E';
const YELLOW  = '#F59E0B';
const GRAY    = '#B0B0C3';
const WHITE   = '#F8F8FF';

// ── Scene data ────────────────────────────────────────────────────────────────

interface SceneData {
  emoji: string;
  title: string;
  subtitle: string;
  bullets: string[];
  accentColor: string;
  tip?: string;
}

const SCENES: SceneData[] = [
  {
    emoji: '📋',
    title: 'Where Is My Campaign?',
    subtitle: 'Left menu → click Campaigns',
    bullets: [
      '🖱️  Log in → look at the LEFT side menu',
      '📣  Click the word "Campaigns"',
      '✅  You will see all your campaigns listed here',
      '➕  Click "New Campaign" to start a fresh one',
    ],
    accentColor: INDIGO,
    tip: '💡 Tip: Campaigns tab is always in the left menu, 3rd from top',
  },
  {
    emoji: '👥',
    title: 'How To Pick Contacts',
    subtitle: 'Your 18,000+ contacts are already loaded',
    bullets: [
      '🔍  Inside your campaign → click "Add Companies"',
      '🏭  Filter by: industry, city, job title',
      '☑️   Tick the checkboxes next to companies you want',
      '💾  Click "Add Selected" — they join your campaign',
    ],
    accentColor: ORANGE,
    tip: '💡 Tip: Start by targeting ONE industry — e.g. all "Software" companies',
  },
  {
    emoji: '🎯',
    title: 'How Many To Send?',
    subtitle: 'Start small — build up slowly',
    bullets: [
      '🌱  Week 1: send to only 50 contacts (warm up)',
      '📈  Week 2: go up to 200 contacts',
      '🚀  Week 3+: send up to 500 per day safely',
      '⚠️   Never blast 10,000 on Day 1 — gets flagged as spam',
    ],
    accentColor: YELLOW,
    tip: '💡 Tip: Sending too many too fast = your emails go to spam forever',
  },
  {
    emoji: '🧪',
    title: 'Always Test First!',
    subtitle: 'Send to yourself before anyone else',
    bullets: [
      '📨  Click "Send Test Email" inside the campaign',
      '📥  Check YOUR own inbox — does it look good?',
      '🚫  Also check your SPAM folder — is it landing there?',
      '📱  Open it on your phone too — does it look right?',
    ],
    accentColor: GREEN,
    tip: '💡 Tip: NEVER skip the test — broken emails kill your reputation',
  },
  {
    emoji: '📬',
    title: 'Check Your Test Email',
    subtitle: '5 things to look for before going live',
    bullets: [
      '✏️   Is the subject line showing correctly?',
      '👤  Does "[First Name]" show the real name?',
      '🔗  Do all buttons and links work when you click?',
      '📐  Does it look good or is formatting broken?',
    ],
    accentColor: INDIGO,
    tip: '💡 Tip: Send test to Gmail AND Outlook — they look different',
  },
  {
    emoji: '⚙️',
    title: 'Set Your Sending Limits',
    subtitle: 'Protect your domain reputation',
    bullets: [
      '📊  Max 200 emails/day when starting out',
      '⏱️   Space emails out — do NOT send 200 in 1 minute',
      '🔁  Set delay: 30–60 seconds between each email',
      '📅  Use "Schedule" to send over 3–5 days automatically',
    ],
    accentColor: ORANGE,
    tip: '💡 Tip: Slow and steady wins — your emails will land in inbox, not spam',
  },
  {
    emoji: '⏰',
    title: 'Best Time To Send',
    subtitle: 'When do people actually open emails?',
    bullets: [
      '📅  Best days: Tuesday, Wednesday, Thursday',
      '🕘  Best time: 9am–11am in the client\'s timezone',
      '❌  Avoid: Monday mornings and Friday afternoons',
      '🌍  If clients are in USA — send at 9am EST',
    ],
    accentColor: YELLOW,
    tip: '💡 Tip: The AI tab in BrandMonkz suggests optimal send times for you',
  },
  {
    emoji: '🚀',
    title: 'Ready — Hit Launch!',
    subtitle: 'You\'re all set. Here\'s the checklist:',
    bullets: [
      '✅  Test email sent and looks perfect',
      '✅  Right contacts selected (50–200 to start)',
      '✅  Subject line is punchy and clear',
      '✅  Sending time set to Tuesday 9am',
    ],
    accentColor: GREEN,
    tip: '🎉 Click Launch — your campaign is now sending!',
  },
];

// ── Single scene ─────────────────────────────────────────────────────────────

const EmailSetupScene: React.FC<{ idx: number; totalScenes: number }> = ({ idx, totalScenes }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scene = SCENES[idx];

  // background flash on entry
  const bgFlash = interpolate(frame, [0, 8], [1, 0], { extrapolateRight: 'clamp' });

  // emoji pop
  const emojiScale = spring({ frame, fps, config: { mass: 0.4, stiffness: 220, damping: 10 } });

  // accent bar width
  const barWidth = interpolate(frame, [5, 35], [0, 420], { extrapolateRight: 'clamp' });

  // title
  const titleY   = interpolate(frame, [8, 22], [40, 0], { extrapolateRight: 'clamp' });
  const titleOp  = interpolate(frame, [8, 22], [0, 1],  { extrapolateRight: 'clamp' });

  // subtitle
  const subOp    = interpolate(frame, [18, 30], [0, 1], { extrapolateRight: 'clamp' });

  // bullets stagger
  const bulletOps = scene.bullets.map((_, i) =>
    interpolate(frame, [25 + i * 10, 38 + i * 10], [0, 1], { extrapolateRight: 'clamp' })
  );
  const bulletXs = scene.bullets.map((_, i) =>
    interpolate(frame, [25 + i * 10, 38 + i * 10], [-30, 0], { extrapolateRight: 'clamp' })
  );

  // tip fade
  const tipOp = interpolate(frame, [80, 100], [0, 1], { extrapolateRight: 'clamp' });

  // progress dots
  const dots = Array.from({ length: totalScenes }, (_, i) => i);

  return (
    <div style={{
      width: '100%', height: '100%',
      background: `linear-gradient(145deg, ${DARKER} 0%, ${DARK} 100%)`,
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* entry flash */}
      <div style={{
        position: 'absolute', inset: 0,
        background: scene.accentColor,
        opacity: bgFlash * 0.15,
        pointerEvents: 'none',
      }} />

      {/* top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: '50%',
        transform: 'translateX(-50%)',
        height: 5, width: barWidth,
        background: `linear-gradient(90deg, ${scene.accentColor}, ${INDIGO})`,
        borderRadius: '0 0 4px 4px',
      }} />

      {/* step pill */}
      <div style={{
        position: 'absolute', top: 24, right: 36,
        background: `${scene.accentColor}22`,
        border: `2px solid ${scene.accentColor}`,
        borderRadius: 20, padding: '4px 16px',
        color: scene.accentColor, fontSize: 13, fontWeight: 700,
        letterSpacing: 1,
      }}>
        STEP {idx + 1} / {totalScenes}
      </div>

      {/* BrandMonkz wordmark */}
      <div style={{
        position: 'absolute', top: 24, left: 36,
        fontSize: 15, fontWeight: 800, letterSpacing: 1,
        color: WHITE,
      }}>
        Brand<span style={{ color: ORANGE }}>Monkz</span>
      </div>

      {/* Main content */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 0,
        maxWidth: 820, width: '100%', padding: '0 48px',
      }}>

        {/* Emoji */}
        <div style={{
          fontSize: 90,
          transform: `scale(${emojiScale})`,
          marginBottom: 16,
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))',
          lineHeight: 1,
        }}>
          {scene.emoji}
        </div>

        {/* Title */}
        <div style={{
          fontSize: 46, fontWeight: 900, color: WHITE,
          textAlign: 'center', lineHeight: 1.1,
          opacity: titleOp,
          transform: `translateY(${titleY}px)`,
          marginBottom: 8,
          textShadow: `0 2px 20px ${scene.accentColor}44`,
        }}>
          {scene.title}
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 20, color: scene.accentColor,
          fontWeight: 600, textAlign: 'center',
          opacity: subOp, marginBottom: 28,
          letterSpacing: 0.3,
        }}>
          {scene.subtitle}
        </div>

        {/* Bullets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
          {scene.bullets.map((bullet, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center',
              background: `rgba(255,255,255,0.04)`,
              borderLeft: `4px solid ${scene.accentColor}`,
              borderRadius: 10, padding: '10px 18px',
              opacity: bulletOps[i],
              transform: `translateX(${bulletXs[i]}px)`,
            }}>
              <span style={{ fontSize: 18, color: WHITE, fontWeight: 500, lineHeight: 1.4 }}>
                {bullet}
              </span>
            </div>
          ))}
        </div>

        {/* Tip */}
        {scene.tip && (
          <div style={{
            marginTop: 20,
            background: `${scene.accentColor}18`,
            border: `1px solid ${scene.accentColor}55`,
            borderRadius: 12, padding: '10px 20px',
            fontSize: 16, color: GRAY,
            opacity: tipOp,
            textAlign: 'center', fontStyle: 'italic',
          }}>
            {scene.tip}
          </div>
        )}
      </div>

      {/* Progress dots */}
      <div style={{
        position: 'absolute', bottom: 28,
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        {dots.map(i => (
          <div key={i} style={{
            width: i === idx ? 24 : 8,
            height: 8,
            borderRadius: 4,
            background: i === idx ? scene.accentColor : `rgba(255,255,255,0.2)`,
            transition: 'all 0.3s',
          }} />
        ))}
      </div>
    </div>
  );
};

// ── Full video (sequences) ────────────────────────────────────────────────────

const FRAMES_PER_SCENE = 150; // 5 seconds @ 30fps

export const EmailSetupVideo: React.FC = () => (
  <>
    {SCENES.map((_, idx) => (
      <Sequence
        key={idx}
        from={idx * FRAMES_PER_SCENE}
        durationInFrames={FRAMES_PER_SCENE}
      >
        <EmailSetupScene idx={idx} totalScenes={SCENES.length} />
      </Sequence>
    ))}
  </>
);
