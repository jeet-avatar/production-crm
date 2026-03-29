import React from 'react';
import { useCurrentFrame, spring } from 'remotion';
import { SceneWrapper } from '../components/SceneWrapper';

const INDIGO = '#4F46E5';

const contacts = [
  { initials: 'RK', name: 'Rajesh Kumar', email: 'rajesh@example.com', delay: 30 },
  { initials: 'PP', name: 'Priya Patel', email: 'priya@example.com', delay: 60 },
  { initials: 'AS', name: 'Amit Shah', email: 'amit@example.com', delay: 90 },
];

interface ContactCardProps {
  initials: string;
  name: string;
  email: string;
  delay: number;
}

const ContactCard: React.FC<ContactCardProps> = ({ initials, name, email, delay }) => {
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
        borderRadius: 40,
        padding: '10px 16px',
        width: 280,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          backgroundColor: INDIGO,
          borderRadius: '50%',
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 700 }}>{initials}</span>
      </div>

      {/* Name + email */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{name}</span>
        <span style={{ fontSize: 11, color: '#6B7280' }}>{email}</span>
      </div>
    </div>
  );
};

export const ContactsScene: React.FC = () => (
  <SceneWrapper
    icon="👥"
    title="Step 2: Import Contacts"
    subtitle="Upload your CSV or add contacts manually"
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {contacts.map((c) => (
        <ContactCard key={c.email} {...c} />
      ))}
    </div>
  </SceneWrapper>
);
