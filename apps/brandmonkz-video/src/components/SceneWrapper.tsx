import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

const ORANGE = '#FF6B35';
const INDIGO = '#4F46E5';
const BG_DARK = '#1E1B4B';
const WHITE = '#FFFFFF';

interface SceneWrapperProps {
  icon: string;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}

export const SceneWrapper: React.FC<SceneWrapperProps> = ({
  icon,
  title,
  subtitle,
  children,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: BG_DARK,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        opacity,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* BrandMonkz wordmark top-left */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 32,
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '-0.5px',
        }}
      >
        <span style={{ color: WHITE }}>Brand</span>
        <span style={{ color: ORANGE }}>Monkz</span>
      </div>

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          paddingBottom: 40,
        }}
      >
        {/* Icon */}
        <div style={{ fontSize: 72, lineHeight: 1 }}>{icon}</div>

        {/* Title */}
        <div
          style={{
            color: ORANGE,
            fontSize: 52,
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            color: WHITE,
            fontSize: 28,
            fontWeight: 400,
            textAlign: 'center',
            opacity: 0.9,
          }}
        >
          {subtitle}
        </div>

        {/* Scene-specific children */}
        {children && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            {children}
          </div>
        )}
      </div>

      {/* Bottom accent bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: 8,
          backgroundColor: ORANGE,
        }}
      />

      {/* Subtle top accent dot */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 32,
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: INDIGO,
          opacity: 0.6,
        }}
      />
    </div>
  );
};
