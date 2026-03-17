interface TopbarProps {
  title?: string;
}

export function Topbar({ title }: TopbarProps) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        padding: '16px 32px',
        background: 'rgba(15, 15, 26, 0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div className="flex items-center justify-between">
        {title && (
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h1>
        )}
      </div>
    </header>
  );
}
