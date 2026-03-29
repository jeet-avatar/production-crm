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
const PURPLE  = '#A855F7';
const YELLOW  = '#F59E0B';
const GRAY    = '#B0B0C3';
const WHITE   = '#F8F8FF';

interface Scene {
  emoji: string;
  title: string;
  subtitle: string;
  bullets: string[];
  accent: string;
  tip?: string;
  mockup?: 'editor' | 'preview' | 'subject' | 'personalize' | 'library';
}

const SCENES: Scene[] = [
  {
    emoji: '📄',
    title: 'What Is a Template?',
    subtitle: 'Write once → send to thousands',
    bullets: [
      '📝  A template is a ready-made email you saved',
      '♻️   Use the same template for many campaigns',
      '🔤  It has a subject line + email body already written',
      '🤖  AI can write it for you in 10 seconds',
    ],
    accent: INDIGO,
    tip: '💡 Think of it like a Google Doc you reuse every time',
  },
  {
    emoji: '🗂️',
    title: 'Where To Find Templates',
    subtitle: 'Left menu → Email Templates',
    bullets: [
      '🖱️  Log in → look at the LEFT side menu',
      '📧  Click "Email Templates" (near the bottom)',
      '📚  You will see all saved templates listed',
      '➕  Click "New Template" to create one from scratch',
    ],
    accent: ORANGE,
    tip: '💡 Tip: You can also access templates from inside a campaign',
    mockup: 'library',
  },
  {
    emoji: '✏️',
    title: 'Write the Subject Line',
    subtitle: 'This is the FIRST thing people see',
    bullets: [
      '👀  Subject = the text in the inbox before opening',
      '📏  Keep it SHORT — under 50 characters',
      '🎯  Make it about THEM, not you',
      '✅  Good: "Quick question about your IT hiring"',
    ],
    accent: YELLOW,
    tip: '💡 Avoid words like FREE, URGENT, CLICK HERE — triggers spam filters',
    mockup: 'subject',
  },
  {
    emoji: '🤖',
    title: 'Let AI Write the Body',
    subtitle: 'Describe your goal — AI does the rest',
    bullets: [
      '🔘  Click "Generate with AI" button',
      '💬  Type: "Email for IT staffing, $2/hr contract fee"',
      '⚡  AI writes a full professional email in 5 seconds',
      '✏️   Read it, tweak it, make it yours',
    ],
    accent: PURPLE,
    tip: '💡 Tip: Always read what AI wrote — add your personal touch',
  },
  {
    emoji: '🪄',
    title: 'Add Personal Touch',
    subtitle: 'Use variables so every email feels 1-to-1',
    bullets: [
      '👤  Type {{firstName}} → shows "John" for each person',
      '🏢  Type {{company}} → shows "Microsoft" for each client',
      '📧  Type {{email}} → shows their own email back',
      '✍️   Example: "Hi {{firstName}}, I saw {{company}} is hiring..."',
    ],
    accent: GREEN,
    tip: '💡 Personal emails get 3x more replies than generic blasts',
    mockup: 'personalize',
  },
  {
    emoji: '👁️',
    title: 'Preview Before Saving',
    subtitle: 'See exactly what your client will see',
    bullets: [
      '🖥️  Click "Preview" tab to see desktop view',
      '📱  Click "Mobile" tab to see phone view',
      '🔤  Check: does {{firstName}} show a real name?',
      '🔗  Click every link — does it go to the right place?',
    ],
    accent: INDIGO,
    tip: '💡 60% of emails are opened on phones — always check mobile view',
    mockup: 'preview',
  },
  {
    emoji: '💾',
    title: 'Save Your Template',
    subtitle: 'Give it a name you will remember',
    bullets: [
      '🏷️  Name it clearly: "IT Staffing - Contract Intro"',
      '🗂️  Add a category: Placement / Outreach / Follow-up',
      '💾  Click "Save Template" — it is now in your library',
      '🔁  Use it in any campaign with one click',
    ],
    accent: ORANGE,
    tip: '💡 Good naming saves you time — you will have 20+ templates soon',
  },
  {
    emoji: '🚀',
    title: 'Use Template in Campaign',
    subtitle: 'Attach your saved template to any campaign',
    bullets: [
      '📣  Go to your Campaign → Edit Campaign',
      '📋  Click "Load Template" or "Select Template"',
      '☑️   Pick your saved template from the list',
      '✅  Subject and body are filled in automatically!',
    ],
    accent: GREEN,
    tip: '🎉 Your professional email is ready to send to 18,000+ contacts!',
    mockup: 'editor',
  },
];

// ── Mock UI components ─────────────────────────────────────────────────────

const LibraryMockup: React.FC<{ frame: number; accent: string }> = ({ frame, accent }) => {
  const op = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: 'clamp' });
  const templates = ['IT Staffing - Intro', 'Follow-up #1', 'Contract Offer'];
  return (
    <div style={{ opacity: op, background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 16px', width: 320 }}>
      {templates.map((t, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none',
        }}>
          <span style={{ fontSize: 18 }}>📄</span>
          <span style={{ color: WHITE, fontSize: 14, flex: 1 }}>{t}</span>
          <span style={{ fontSize: 11, color: accent, background: `${accent}22`, borderRadius: 6, padding: '2px 8px' }}>USE</span>
        </div>
      ))}
    </div>
  );
};

const SubjectMockup: React.FC<{ frame: number; accent: string }> = ({ frame, accent }) => {
  const op   = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: 'clamp' });
  const text = 'Quick question about your IT hiring';
  const visible = Math.floor(interpolate(frame, [50, 100], [0, text.length], { extrapolateRight: 'clamp' }));
  return (
    <div style={{ opacity: op, width: 360 }}>
      <div style={{ fontSize: 12, color: GRAY, marginBottom: 4 }}>Subject Line</div>
      <div style={{
        background: 'rgba(255,255,255,0.07)', border: `2px solid ${accent}`,
        borderRadius: 10, padding: '10px 14px',
        fontSize: 16, color: WHITE, letterSpacing: 0.2,
        minHeight: 42, display: 'flex', alignItems: 'center',
      }}>
        {text.slice(0, visible)}
        <span style={{ opacity: frame % 30 < 15 ? 1 : 0, color: accent }}>|</span>
      </div>
      <div style={{ fontSize: 12, color: visible < 50 ? GREEN : '#F59E0B', marginTop: 4 }}>
        {visible} / 50 chars {visible < 50 ? '✅ Good length' : '⚠️ A bit long'}
      </div>
    </div>
  );
};

const PersonalizeMockup: React.FC<{ frame: number; accent: string }> = ({ frame, accent }) => {
  const op = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ opacity: op, width: 380, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 13, color: GRAY, marginBottom: 8 }}>Email Body Preview</div>
      <div style={{ fontSize: 15, color: WHITE, lineHeight: 1.8 }}>
        Hi <span style={{ background: `${accent}33`, color: accent, padding: '0 6px', borderRadius: 4, fontWeight: 700 }}>{'{{firstName}}'}</span>,
        <br />
        I noticed <span style={{ background: `${INDIGO}33`, color: '#818CF8', padding: '0 6px', borderRadius: 4, fontWeight: 700 }}>{'{{company}}'}</span> is
        growing fast…
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        {[['{{firstName}}', 'John'], ['{{company}}', 'Microsoft']].map(([v, ex], i) => (
          <div key={i} style={{ fontSize: 12, color: GRAY, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '4px 10px' }}>
            {v} → <span style={{ color: accent }}>{ex}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const PreviewMockup: React.FC<{ frame: number; accent: string }> = ({ frame, accent }) => {
  const op = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ opacity: op, width: 320 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {['🖥️ Desktop', '📱 Mobile'].map((label, i) => (
          <div key={i} style={{
            flex: 1, textAlign: 'center', padding: '6px 0',
            borderRadius: 8, fontSize: 13, fontWeight: 700,
            background: i === 0 ? accent : 'rgba(255,255,255,0.06)',
            color: i === 0 ? WHITE : GRAY,
          }}>{label}</div>
        ))}
      </div>
      <div style={{
        background: '#ffffff', borderRadius: 10, overflow: 'hidden',
        boxShadow: `0 8px 32px rgba(0,0,0,0.5)`,
      }}>
        <div style={{ background: ORANGE, height: 6 }} />
        <div style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>From: Rajesh · TechCloudPro</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 8 }}>Quick question about your IT hiring</div>
          <div style={{ fontSize: 12, color: '#444', lineHeight: 1.6 }}>
            Hi John,<br />I noticed Microsoft is growing fast and thought you might need…
          </div>
          <div style={{ marginTop: 10, background: ORANGE, borderRadius: 6, padding: '6px 12px', display: 'inline-block', fontSize: 12, color: WHITE, fontWeight: 700 }}>
            Book a Free Call →
          </div>
        </div>
      </div>
    </div>
  );
};

const EditorMockup: React.FC<{ frame: number; accent: string }> = ({ frame, accent }) => {
  const op  = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: 'clamp' });
  const pct = interpolate(frame, [50, 120], [0, 100], { extrapolateRight: 'clamp' });
  return (
    <div style={{ opacity: op, width: 340 }}>
      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: GRAY }}>Selected template</span>
          <span style={{ fontSize: 13, color: accent, fontWeight: 700 }}>✓ Loaded</span>
        </div>
        <div style={{ background: `${accent}22`, border: `2px solid ${accent}55`, borderRadius: 8, padding: '8px 12px' }}>
          <div style={{ fontSize: 14, color: WHITE, fontWeight: 700 }}>📄 IT Staffing - Contract Intro</div>
          <div style={{ fontSize: 12, color: GRAY, marginTop: 2 }}>Subject + body auto-filled</div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: GRAY, marginBottom: 4 }}>
            <span>Campaign ready</span><span>{Math.round(pct)}%</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${accent}, ${GREEN})`, borderRadius: 4 }} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Scene renderer ────────────────────────────────────────────────────────────

const TemplateScene: React.FC<{ idx: number; total: number }> = ({ idx, total }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scene = SCENES[idx];

  const bgFlash  = interpolate(frame, [0, 8], [1, 0], { extrapolateRight: 'clamp' });
  const emojiSc  = spring({ frame, fps, config: { mass: 0.4, stiffness: 220, damping: 10 } });
  const barW     = interpolate(frame, [5, 35], [0, 440], { extrapolateRight: 'clamp' });
  const titleY   = interpolate(frame, [8, 22], [40, 0],  { extrapolateRight: 'clamp' });
  const titleOp  = interpolate(frame, [8, 22], [0, 1],   { extrapolateRight: 'clamp' });
  const subOp    = interpolate(frame, [18, 30], [0, 1],  { extrapolateRight: 'clamp' });
  const tipOp    = interpolate(frame, [90, 110], [0, 1], { extrapolateRight: 'clamp' });

  const bulletOps = scene.bullets.map((_, i) =>
    interpolate(frame, [26 + i * 9, 40 + i * 9], [0, 1], { extrapolateRight: 'clamp' })
  );
  const bulletXs = scene.bullets.map((_, i) =>
    interpolate(frame, [26 + i * 9, 40 + i * 9], [-28, 0], { extrapolateRight: 'clamp' })
  );

  const hasMockup = !!scene.mockup;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: `linear-gradient(145deg, ${DARKER}, ${DARK})`,
      fontFamily: "'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* entry flash */}
      <div style={{ position: 'absolute', inset: 0, background: scene.accent, opacity: bgFlash * 0.12, pointerEvents: 'none' }} />

      {/* top bar */}
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', height: 5, width: barW, background: `linear-gradient(90deg,${scene.accent},${INDIGO})`, borderRadius: '0 0 4px 4px' }} />

      {/* wordmark */}
      <div style={{ position: 'absolute', top: 22, left: 36, fontSize: 15, fontWeight: 800, color: WHITE, letterSpacing: 1 }}>
        Brand<span style={{ color: ORANGE }}>Monkz</span>
      </div>

      {/* step pill */}
      <div style={{ position: 'absolute', top: 22, right: 36, background: `${scene.accent}22`, border: `2px solid ${scene.accent}`, borderRadius: 20, padding: '4px 16px', color: scene.accent, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
        STEP {idx + 1} / {total}
      </div>

      {/* layout: left content + right mockup */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 48, maxWidth: 1100, width: '100%', padding: '0 56px' }}>

        {/* Left: text */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: hasMockup ? 'flex-start' : 'center' }}>
          <div style={{ fontSize: hasMockup ? 76 : 90, transform: `scale(${emojiSc})`, marginBottom: 12, filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))', lineHeight: 1 }}>
            {scene.emoji}
          </div>
          <div style={{ fontSize: hasMockup ? 38 : 44, fontWeight: 900, color: WHITE, lineHeight: 1.15, opacity: titleOp, transform: `translateY(${titleY}px)`, marginBottom: 6, textShadow: `0 2px 20px ${scene.accent}44` }}>
            {scene.title}
          </div>
          <div style={{ fontSize: 18, color: scene.accent, fontWeight: 600, opacity: subOp, marginBottom: 22, letterSpacing: 0.3 }}>
            {scene.subtitle}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            {scene.bullets.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderLeft: `4px solid ${scene.accent}`, borderRadius: 10, padding: '9px 16px', opacity: bulletOps[i], transform: `translateX(${bulletXs[i]}px)` }}>
                <span style={{ fontSize: 16, color: WHITE, fontWeight: 500, lineHeight: 1.4 }}>{b}</span>
              </div>
            ))}
          </div>
          {scene.tip && (
            <div style={{ marginTop: 16, background: `${scene.accent}16`, border: `1px solid ${scene.accent}44`, borderRadius: 10, padding: '8px 16px', fontSize: 14, color: GRAY, opacity: tipOp, fontStyle: 'italic' }}>
              {scene.tip}
            </div>
          )}
        </div>

        {/* Right: mockup */}
        {hasMockup && (
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 380 }}>
            {scene.mockup === 'library'     && <LibraryMockup     frame={frame} accent={scene.accent} />}
            {scene.mockup === 'subject'     && <SubjectMockup     frame={frame} accent={scene.accent} />}
            {scene.mockup === 'personalize' && <PersonalizeMockup frame={frame} accent={scene.accent} />}
            {scene.mockup === 'preview'     && <PreviewMockup     frame={frame} accent={scene.accent} />}
            {scene.mockup === 'editor'      && <EditorMockup      frame={frame} accent={scene.accent} />}
          </div>
        )}
      </div>

      {/* progress dots */}
      <div style={{ position: 'absolute', bottom: 26, display: 'flex', gap: 8 }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{ width: i === idx ? 24 : 8, height: 8, borderRadius: 4, background: i === idx ? scene.accent : 'rgba(255,255,255,0.18)' }} />
        ))}
      </div>
    </div>
  );
};

// ── Composition ───────────────────────────────────────────────────────────────

const FRAMES_PER_SCENE = 150; // 5 s @ 30 fps

export const EmailTemplateVideo: React.FC = () => (
  <>
    {SCENES.map((_, idx) => (
      <Sequence key={idx} from={idx * FRAMES_PER_SCENE} durationInFrames={FRAMES_PER_SCENE}>
        <TemplateScene idx={idx} total={SCENES.length} />
      </Sequence>
    ))}
  </>
);
