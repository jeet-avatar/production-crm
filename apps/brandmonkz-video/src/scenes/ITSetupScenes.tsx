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
const GREEN   = '#22C55E';
const TEAL    = '#14B8A6';
const YELLOW  = '#F59E0B';
const RED     = '#EF4444';
const DARK    = '#1A1A2E';
const DARKER  = '#0F0F1E';
const GRAY    = '#B0B0C3';
const WHITE   = '#F8F8FF';
const BLUE    = '#3B82F6';

interface Scene {
  emoji: string;
  title: string;
  subtitle: string;
  bullets: string[];
  accent: string;
  tip?: string;
  mockup?: 'what-needed' | 'm365-steps' | 'custom-smtp' | 'credentials-card' | 'whitelist-ip' | 'test-result' | 'google-ws';
}

const SERVER_IP = '100.24.213.224';

const SCENES: Scene[] = [
  {
    emoji: '📋',
    title: 'Hello TechCloudPro IT Team',
    subtitle: 'Quick task — takes about 15 minutes',
    bullets: [
      '🌐  BrandMonkz CRM needs to send emails',
      '📧  Emails must come FROM techcloudpro.com domain',
      '🔑  We need SMTP access for rajesh@techcloudpro.com',
      '✅  Once done — all client emails show your domain',
    ],
    accent: INDIGO,
    tip: '💡 This is a standard IT task — enabling Outbound SMTP Auth',
    mockup: 'what-needed',
  },
  {
    emoji: '❓',
    title: 'What Email Server Do You Use?',
    subtitle: 'Pick your platform below',
    bullets: [
      '🪟  Microsoft 365 / Outlook → watch Scene 3',
      '🟢  Google Workspace / Gmail → watch Scene 4',
      '🖥️   Custom / cPanel mail server → watch Scene 5',
      '📞  Not sure? → check with your mail admin',
    ],
    accent: YELLOW,
    tip: '💡 Most companies use Microsoft 365 or Google Workspace',
  },
  {
    emoji: '🪟',
    title: 'Microsoft 365 Setup',
    subtitle: 'Enable SMTP AUTH for rajesh@techcloudpro.com',
    bullets: [
      '1️⃣   Go to admin.microsoft.com → Users → Active Users',
      '2️⃣   Click rajesh@techcloudpro.com → Mail tab',
      '3️⃣   Click "Manage email apps" → enable SMTP AUTH ☑️',
      '4️⃣   Host: smtp.office365.com  Port: 587',
    ],
    accent: BLUE,
    tip: '💡 Also check: Security → Multi-factor Auth — may need App Password',
    mockup: 'm365-steps',
  },
  {
    emoji: '🟢',
    title: 'Google Workspace Setup',
    subtitle: 'Create an App Password for rajesh@',
    bullets: [
      '1️⃣   Sign in as rajesh@techcloudpro.com',
      '2️⃣   Go to myaccount.google.com → Security',
      '3️⃣   2-Step Verification → App Passwords',
      '4️⃣   Select "Mail" → Generate → copy the 16-char password',
    ],
    accent: GREEN,
    tip: '💡 Host: smtp.gmail.com  Port: 587  — use App Password NOT regular password',
    mockup: 'google-ws',
  },
  {
    emoji: '🖥️',
    title: 'Custom Mail Server Setup',
    subtitle: 'cPanel, Plesk, or self-hosted Postfix',
    bullets: [
      '1️⃣   Enable SMTP AUTH in your mail server config',
      '2️⃣   Allow outbound port 587 (STARTTLS)',
      '3️⃣   Whitelist this IP to relay mail: ' + SERVER_IP,
      '4️⃣   Host is usually: mail.techcloudpro.com',
    ],
    accent: ORANGE,
    tip: '💡 cPanel: Email → Email Accounts → Configure Mail Client for SMTP settings',
    mockup: 'custom-smtp',
  },
  {
    emoji: '📤',
    title: 'Whitelist BrandMonkz Server IP',
    subtitle: 'Allow our server to send through your domain',
    bullets: [
      '🌐  BrandMonkz server IP: ' + SERVER_IP,
      '📝  Add to SPF record: include ip4:' + SERVER_IP,
      '🔒  SPF in GoDaddy DNS → TXT record on @',
      '⏱️   Current SPF: v=spf1 include:_spf.techcloudpro.com ~all',
    ],
    accent: RED,
    tip: '💡 Without SPF → emails from our server may land in spam',
    mockup: 'whitelist-ip',
  },
  {
    emoji: '📋',
    title: 'Send These Details to Rajesh',
    subtitle: 'Copy this exact info and email to rajesh@techcloudpro.com',
    bullets: [
      '🌐  SMTP Host: smtp.office365.com (or mail.techcloudpro.com)',
      '🔢  Port: 587',
      '👤  Username: rajesh@techcloudpro.com',
      '🔑  Password: (the app password or SMTP password)',
    ],
    accent: TEAL,
    tip: '💡 Rajesh enters these into BrandMonkz → Settings → Email Servers',
    mockup: 'credentials-card',
  },
  {
    emoji: '✅',
    title: 'Rajesh Will Test & Confirm',
    subtitle: 'Once IT sends credentials — Rajesh does this in 2 minutes',
    bullets: [
      '🖥️   Rajesh logs into brandmonkz.com',
      '⚙️   Settings → Email Servers → New Server',
      '📋  Pastes the credentials IT provided',
      '🧪  Clicks Test → ✅ Connected — done!',
    ],
    accent: GREEN,
    tip: '🎉 All team invite emails and campaigns now send from techcloudpro.com!',
    mockup: 'test-result',
  },
];

// ── Mockup components ─────────────────────────────────────────────────────────

const WhatNeededMockup: React.FC<{ frame: number }> = ({ frame }) => {
  const op = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ opacity: op, width: 320 }}>
      <div style={{ fontSize: 12, color: GRAY, marginBottom: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Info needed from IT</div>
      {[
        { icon: '🌐', label: 'SMTP Host',     val: 'mail.techcloudpro.com', color: BLUE },
        { icon: '🔢', label: 'Port',          val: '587',                   color: TEAL },
        { icon: '👤', label: 'Username',      val: 'rajesh@techcloudpro.com', color: ORANGE },
        { icon: '🔑', label: 'Password',      val: '••••••••••••',          color: INDIGO },
      ].map((r, i) => {
        const rOp = interpolate(frame, [30 + i * 12, 48 + i * 12], [0, 1], { extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', borderLeft: `3px solid ${r.color}`, borderRadius: 8, padding: '8px 12px', marginBottom: 6, opacity: rOp }}>
            <span style={{ fontSize: 18 }}>{r.icon}</span>
            <span style={{ flex: 1, fontSize: 12, color: GRAY }}>{r.label}</span>
            <span style={{ fontSize: 13, color: WHITE, fontWeight: 700 }}>{r.val}</span>
          </div>
        );
      })}
    </div>
  );
};

const M365Mockup: React.FC<{ frame: number }> = ({ frame }) => {
  const op   = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: 'clamp' });
  const step = frame < 50 ? 0 : frame < 80 ? 1 : frame < 110 ? 2 : 3;
  const steps = [
    'admin.microsoft.com',
    'Users → rajesh@techcloudpro.com',
    'Mail → Manage email apps',
    '☑️  SMTP AUTH enabled',
  ];
  return (
    <div style={{ opacity: op, width: 320 }}>
      <div style={{ background: '#0078d4', borderRadius: '8px 8px 0 0', padding: '8px 14px', fontSize: 13, color: WHITE, fontWeight: 700 }}>
        🪟 Microsoft 365 Admin Center
      </div>
      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '0 0 8px 8px', padding: '10px 14px' }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none',
            opacity: i <= step ? 1 : 0.25,
          }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: i <= step ? '#0078d4' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: WHITE, fontWeight: 700, flexShrink: 0 }}>
              {i < step ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 13, color: i <= step ? WHITE : GRAY }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const GoogleWSMockup: React.FC<{ frame: number }> = ({ frame }) => {
  const op = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: 'clamp' });
  const appPasswordReveal = interpolate(frame, [90, 120], [0, 1], { extrapolateRight: 'clamp' });
  const appPass = 'xkzp wnqr tmbe jpvs';
  const visible = Math.floor(appPasswordReveal * appPass.length);
  return (
    <div style={{ opacity: op, width: 320 }}>
      <div style={{ background: '#4285F4', borderRadius: '8px 8px 0 0', padding: '8px 14px', fontSize: 13, color: WHITE, fontWeight: 700 }}>
        🟢 Google Account → Security
      </div>
      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '0 0 8px 8px', padding: '14px' }}>
        <div style={{ fontSize: 12, color: GRAY, marginBottom: 8 }}>App Passwords → Mail → Generate</div>
        <div style={{ background: '#111827', borderRadius: 8, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 11, color: GRAY, marginBottom: 4 }}>Your App Password:</div>
          <div style={{ fontSize: 20, fontFamily: 'monospace', color: GREEN, letterSpacing: 3, fontWeight: 700 }}>
            {appPass.slice(0, visible)}{appPasswordReveal < 1 && <span style={{ opacity: frame % 20 < 10 ? 1 : 0, color: GREEN }}>|</span>}
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: YELLOW }}>⚠️ Copy this — you won't see it again</div>
      </div>
    </div>
  );
};

const CustomSmtpMockup: React.FC<{ frame: number }> = ({ frame }) => {
  const op = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ opacity: op, width: 320 }}>
      <div style={{ background: ORANGE, borderRadius: '8px 8px 0 0', padding: '8px 14px', fontSize: 13, color: WHITE, fontWeight: 700 }}>
        🖥️ cPanel / Custom Server
      </div>
      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '0 0 8px 8px', padding: '14px' }}>
        {[
          { label: 'SMTP Host',  val: 'mail.techcloudpro.com' },
          { label: 'Port',       val: '587 (STARTTLS)' },
          { label: 'Auth',       val: 'SMTP AUTH LOGIN' },
          { label: 'Relay IP',   val: SERVER_IP + ' ← whitelist this' },
        ].map((r, i) => {
          const rOp = interpolate(frame, [35 + i * 12, 55 + i * 12], [0, 1], { extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none', opacity: rOp }}>
              <span style={{ fontSize: 12, color: GRAY }}>{r.label}</span>
              <span style={{ fontSize: 12, color: WHITE, fontWeight: 600 }}>{r.val}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const WhitelistMockup: React.FC<{ frame: number }> = ({ frame }) => {
  const op     = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: 'clamp' });
  const reveal = interpolate(frame, [60, 110], [0, 1], { extrapolateRight: 'clamp' });
  const spf = `v=spf1 include:_spf.techcloudpro.com ip4:${SERVER_IP} ~all`;
  const visible = Math.floor(reveal * spf.length);
  return (
    <div style={{ opacity: op, width: 340 }}>
      <div style={{ fontSize: 12, color: GRAY, marginBottom: 8 }}>GoDaddy DNS → TXT Record → @</div>
      <div style={{ background: '#111827', borderRadius: 10, padding: 14, border: `1px solid ${RED}44` }}>
        <div style={{ fontSize: 11, color: RED, marginBottom: 8, fontWeight: 700 }}>⚠️  UPDATE YOUR SPF RECORD</div>
        <div style={{ fontSize: 13, fontFamily: 'monospace', color: GREEN, wordBreak: 'break-all', lineHeight: 1.8 }}>
          {spf.slice(0, visible)}
          {reveal < 1 && <span style={{ opacity: frame % 20 < 10 ? 1 : 0, color: GREEN }}>|</span>}
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: YELLOW }}>
        💡 Add ip4:{SERVER_IP} to your existing SPF record
      </div>
    </div>
  );
};

const CredentialsMockup: React.FC<{ frame: number }> = ({ frame }) => {
  const op = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ opacity: op, width: 340 }}>
      <div style={{ background: `linear-gradient(135deg, ${TEAL}, ${INDIGO})`, borderRadius: '10px 10px 0 0', padding: '10px 16px', fontSize: 14, color: WHITE, fontWeight: 800 }}>
        📋 Email This to Rajesh
      </div>
      <div style={{ background: '#0F172A', borderRadius: '0 0 10px 10px', padding: 16, fontFamily: 'monospace', border: `1px solid ${TEAL}44` }}>
        {[
          ['SMTP_HOST',  'smtp.office365.com'],
          ['SMTP_PORT',  '587'],
          ['SMTP_USER',  'rajesh@techcloudpro.com'],
          ['SMTP_PASS',  '← your app password here'],
        ].map(([k, v], i) => {
          const rOp = interpolate(frame, [30 + i * 14, 50 + i * 14], [0, 1], { extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, opacity: rOp }}>
              <span style={{ color: TEAL, fontSize: 12, minWidth: 100 }}>{k}=</span>
              <span style={{ color: WHITE, fontSize: 12 }}>{v}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TestResultMockup: React.FC<{ frame: number }> = ({ frame }) => {
  const op    = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: 'clamp' });
  const pulse = Math.sin(frame / 8) * 0.15 + 0.85;
  const done  = frame > 100;
  return (
    <div style={{ opacity: op, width: 300, textAlign: 'center' }}>
      <div style={{
        width: 120, height: 120, borderRadius: '50%', margin: '0 auto 16px',
        background: done ? `${GREEN}22` : `${ORANGE}22`,
        border: `4px solid ${done ? GREEN : ORANGE}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 56,
        transform: done ? 'scale(1)' : `scale(${pulse})`,
        transition: 'all 0.3s',
      }}>
        {done ? '✅' : '🧪'}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: done ? GREEN : ORANGE }}>
        {done ? 'Connection Successful!' : 'Testing SMTP…'}
      </div>
      <div style={{ fontSize: 14, color: GRAY, marginTop: 8 }}>
        {done ? 'rajesh@techcloudpro.com is ready to send' : 'Connecting to mail.techcloudpro.com:587'}
      </div>
      {done && (
        <div style={{ marginTop: 14, fontSize: 13, color: WHITE, background: `${GREEN}18`, borderRadius: 8, padding: '8px 16px', border: `1px solid ${GREEN}44` }}>
          All team invites + campaigns will now<br />send from <span style={{ color: GREEN, fontWeight: 700 }}>techcloudpro.com</span>
        </div>
      )}
    </div>
  );
};

// ── Scene wrapper ─────────────────────────────────────────────────────────────

const ITScene: React.FC<{ idx: number; total: number }> = ({ idx, total }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scene = SCENES[idx];

  const bgFlash = interpolate(frame, [0, 8], [1, 0], { extrapolateRight: 'clamp' });
  const emojiSc = spring({ frame, fps, config: { mass: 0.4, stiffness: 220, damping: 10 } });
  const barW    = interpolate(frame, [5, 35], [0, 440], { extrapolateRight: 'clamp' });
  const titleY  = interpolate(frame, [8, 22], [40, 0],  { extrapolateRight: 'clamp' });
  const titleOp = interpolate(frame, [8, 22], [0, 1],   { extrapolateRight: 'clamp' });
  const subOp   = interpolate(frame, [18, 30], [0, 1],  { extrapolateRight: 'clamp' });
  const tipOp   = interpolate(frame, [90, 110], [0, 1], { extrapolateRight: 'clamp' });

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
      <div style={{ position: 'absolute', inset: 0, background: scene.accent, opacity: bgFlash * 0.12, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', height: 5, width: barW, background: `linear-gradient(90deg, ${scene.accent}, ${INDIGO})`, borderRadius: '0 0 4px 4px' }} />

      {/* header */}
      <div style={{ position: 'absolute', top: 22, left: 36, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: WHITE, letterSpacing: 1 }}>Brand<span style={{ color: ORANGE }}>Monkz</span></span>
        <span style={{ fontSize: 11, color: TEAL, background: `${TEAL}22`, borderRadius: 6, padding: '2px 10px', fontWeight: 700, letterSpacing: 0.5 }}>FOR IT TEAM</span>
      </div>
      <div style={{ position: 'absolute', top: 22, right: 36, background: `${scene.accent}22`, border: `2px solid ${scene.accent}`, borderRadius: 20, padding: '4px 16px', color: scene.accent, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
        STEP {idx + 1} / {total}
      </div>

      {/* main layout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 48, maxWidth: 1100, width: '100%', padding: '0 56px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: hasMockup ? 'flex-start' : 'center' }}>
          <div style={{ fontSize: hasMockup ? 70 : 86, transform: `scale(${emojiSc})`, marginBottom: 10, lineHeight: 1, filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))' }}>
            {scene.emoji}
          </div>
          <div style={{ fontSize: hasMockup ? 34 : 42, fontWeight: 900, color: WHITE, lineHeight: 1.15, opacity: titleOp, transform: `translateY(${titleY}px)`, marginBottom: 6, textShadow: `0 2px 20px ${scene.accent}44` }}>
            {scene.title}
          </div>
          <div style={{ fontSize: 17, color: scene.accent, fontWeight: 600, opacity: subOp, marginBottom: 20 }}>
            {scene.subtitle}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            {scene.bullets.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderLeft: `4px solid ${scene.accent}`, borderRadius: 10, padding: '9px 16px', opacity: bulletOps[i], transform: `translateX(${bulletXs[i]}px)` }}>
                <span style={{ fontSize: 15, color: WHITE, fontWeight: 500, lineHeight: 1.4 }}>{b}</span>
              </div>
            ))}
          </div>
          {scene.tip && (
            <div style={{ marginTop: 14, background: `${scene.accent}16`, border: `1px solid ${scene.accent}44`, borderRadius: 10, padding: '8px 16px', fontSize: 13, color: GRAY, opacity: tipOp, fontStyle: 'italic' }}>
              {scene.tip}
            </div>
          )}
        </div>

        {hasMockup && (
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 380 }}>
            {scene.mockup === 'what-needed'      && <WhatNeededMockup   frame={frame} />}
            {scene.mockup === 'm365-steps'       && <M365Mockup         frame={frame} />}
            {scene.mockup === 'google-ws'        && <GoogleWSMockup     frame={frame} />}
            {scene.mockup === 'custom-smtp'      && <CustomSmtpMockup   frame={frame} />}
            {scene.mockup === 'whitelist-ip'     && <WhitelistMockup    frame={frame} />}
            {scene.mockup === 'credentials-card' && <CredentialsMockup  frame={frame} />}
            {scene.mockup === 'test-result'      && <TestResultMockup   frame={frame} />}
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', bottom: 26, display: 'flex', gap: 8 }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{ width: i === idx ? 24 : 8, height: 8, borderRadius: 4, background: i === idx ? scene.accent : 'rgba(255,255,255,0.18)' }} />
        ))}
      </div>
    </div>
  );
};

const FRAMES_PER_SCENE = 150;

export const ITSetupVideo: React.FC = () => (
  <>
    {SCENES.map((_, idx) => (
      <Sequence key={idx} from={idx * FRAMES_PER_SCENE} durationInFrames={FRAMES_PER_SCENE}>
        <ITScene idx={idx} total={SCENES.length} />
      </Sequence>
    ))}
  </>
);
