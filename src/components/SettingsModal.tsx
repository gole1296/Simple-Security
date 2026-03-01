import React from 'react';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'earth' | 'night' | 'clean-slate';
}

export function SettingsModal({
  isOpen,
  onClose,
  theme,
}: SettingsModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'var(--color-overlay)',
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          position: 'relative',
          background: 'var(--color-surface-strong)',
          color: 'var(--color-text)',
          padding: '32px',
          borderRadius: '8px',
          minWidth: '400px',
          maxWidth: '500px',
          boxShadow: 'var(--shadow-floating)',
          border: '1px solid var(--color-border)',
        }}
        onClick={(e) => e.stopPropagation()}
        data-theme={theme}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close about dialog"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '32px',
            height: '32px',
            borderRadius: '999px',
            border: '1px solid var(--color-border-strong)',
            background: 'var(--color-surface-alt)',
            color: 'var(--color-text)',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>

        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>About</h3>

        <p style={{ marginBottom: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          Developed by <strong>Tom Gioielli</strong>.
        </p>

        <p style={{ marginBottom: '20px', color: 'var(--color-text-subtle)', lineHeight: 1.5 }}>
          This application is offered free of charge under the MIT License. You may use, modify,
          and share it under MIT terms, but it is intended to remain freely available to the
          community and should not be repackaged and sold as a standalone paid product.
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <a
            href="https://buymeacoffee.com/tomgioielli"
            target="_blank"
            rel="noreferrer"
            className="ghost-button"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 6h11a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V7a1 1 0 0 1 1-1Z"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M16 9h2a2 2 0 0 1 0 4h-2"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d="M7 3c0 1 .8 1.6.8 2.6S7 7.2 7 8"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d="M11 3c0 1 .8 1.6.8 2.6S11 7.2 11 8"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            <span>Buy Me a Coffee</span>
          </a>

          <a
            href="https://github.com/gole1296/Simple-Security/tree/main"
            target="_blank"
            rel="noreferrer"
            className="ghost-button"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.21.68-.48l-.01-1.7c-2.78.6-3.37-1.18-3.37-1.18-.46-1.14-1.11-1.44-1.11-1.44-.9-.62.07-.61.07-.61 1 .07 1.52 1.02 1.52 1.02.89 1.5 2.34 1.07 2.9.82.09-.63.35-1.07.64-1.31-2.22-.25-4.56-1.09-4.56-4.87 0-1.08.39-1.96 1.03-2.65-.11-.25-.45-1.26.1-2.62 0 0 .84-.26 2.75 1.01A9.66 9.66 0 0 1 12 6.84a9.7 9.7 0 0 1 2.51.34c1.91-1.27 2.75-1.01 2.75-1.01.55 1.36.2 2.37.1 2.62.64.69 1.03 1.57 1.03 2.65 0 3.79-2.34 4.61-4.57 4.86.36.3.68.9.68 1.83l-.01 2.71c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
            </svg>
            <span>View Project</span>
          </a>

          <a
            href="https://www.linkedin.com/in/tom-gioielli/"
            target="_blank"
            rel="noreferrer"
            className="ghost-button"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M6.94 8.5H3.56V20h3.38V8.5Zm.24-3.55a1.95 1.95 0 1 0-3.9 0 1.95 1.95 0 0 0 3.9 0ZM20.72 13.35c0-3.07-1.64-4.5-3.83-4.5-1.77 0-2.56.97-3 1.66v-1.42h-3.38c.04.94 0 10.91 0 10.91h3.38v-6.1c0-.33.02-.66.12-.9.26-.66.86-1.34 1.87-1.34 1.32 0 1.85 1.01 1.85 2.5V20h3.38v-6.65Z" />
            </svg>
            <span>Connect with Me</span>
          </a>
        </div>
      </div>
    </div>
  );
}
