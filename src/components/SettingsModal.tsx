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
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Settings</h3>

        <p style={{ marginBottom: '20px', color: 'var(--color-text-subtle)', lineHeight: 1.5 }}>
          App developed by 8035 Solutions.
        </p>

        {/* Close Button */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>

        {/* Developer Branding */}
        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          justifyContent: 'center',
          opacity: 0.7,
        }}>
          <img 
            src={logo8035} 
            alt="8035 Solutions" 
            style={{ height: '32px', width: 'auto' }}
          />
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            App developed by <strong>8035 Solutions</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
