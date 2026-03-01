import React from 'react';
import logo8035 from '../assets/8035-solutions-logo.png';

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
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>About</h3>

        <div
          style={{
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <img
            src={logo8035}
            alt="8035 Solutions"
            style={{ height: '34px', width: 'auto' }}
          />
          <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            Developed by <strong>8035 Solutions</strong>
          </span>
        </div>

        <p style={{ marginBottom: '20px', color: 'var(--color-text-subtle)', lineHeight: 1.5 }}>
          This application is developed by 8035 Solutions and offered free of charge under the MIT
          License. You may use, modify, and share it under MIT terms, but it should remain free for
          the community and not be resold as a paid product on its own.
        </p>

        <p style={{ marginBottom: '0', color: 'var(--color-text-subtle)', lineHeight: 1.5 }}>
          GitHub and “Buy Me a Coffee” links will be added here in a future update.
        </p>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
