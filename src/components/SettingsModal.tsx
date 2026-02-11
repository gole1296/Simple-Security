import React from 'react';
import { getStoredLicenseKey, clearLicenseCache, checkLicenseStatus } from '../license';
import type { LicenseStatus } from '../license';
import logo8035 from '../assets/8035-solutions-logo.png';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  licenseStatus: LicenseStatus | null;
  onLicenseUpdated: (status: LicenseStatus) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  licenseStatus,
  onLicenseUpdated,
}: SettingsModalProps) {
  const [licenseKeyInput, setLicenseKeyInput] = React.useState(() => getStoredLicenseKey() || '');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Show license key update form
  const handleUpdateLicense = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const key = licenseKeyInput.trim();
      if (!key) {
        setError('Please enter a license key');
        setLoading(false);
        return;
      }

      // Update the stored key and check license
      window.localStorage.setItem('simple-security-license-key', key);
      clearLicenseCache(); // Clear cache to force fresh check
      
      const status = await checkLicenseStatus(key, true);
      onLicenseUpdated(status);
      setSuccess(true);
      
      if (status.licensed) {
        setTimeout(() => onClose(), 1500);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to update license');
    } finally {
      setLoading(false);
    }
  };

  // Verify Now button - force re-check without changing key
  const handleVerifyNow = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      clearLicenseCache();
      const status = await checkLicenseStatus(undefined, true);
      onLicenseUpdated(status);
      setSuccess(true);
    } catch (e: any) {
      setError(e?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!loading && e.target === e.currentTarget) {
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
        background: 'rgba(0,0,0,0.5)',
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          background: '#fff',
          padding: '32px',
          borderRadius: '8px',
          minWidth: '400px',
          maxWidth: '500px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Settings</h3>

        {/* License Information Section */}
        <div style={{ marginBottom: '24px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
          <h4 style={{ marginTop: 0, marginBottom: '8px' }}>License Status</h4>
          <p style={{ margin: '4px 0', fontSize: '14px' }}>
            <strong>Status:</strong> {licenseStatus?.licensed ? '✓ Licensed' : '✗ Not Licensed'}
          </p>
          {licenseStatus?.validTo && (
            <p style={{ margin: '4px 0', fontSize: '14px' }}>
              <strong>Valid Until:</strong> {licenseStatus.validTo}
            </p>
          )}
          {licenseStatus?.message && (
            <p style={{ margin: '4px 0', fontSize: '14px', color: licenseStatus.licensed ? '#080' : '#b00' }}>
              <strong>Message:</strong> {licenseStatus.message}
            </p>
          )}
        </div>

        {/* License Key Update Section */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
            Current License Key
          </label>
          <div style={{
            width: '100%',
            padding: '8px',
            marginBottom: '12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            background: '#f9f9f9',
            fontFamily: 'monospace',
            fontSize: '12px',
            wordBreak: 'break-all',
            minHeight: '32px',
            display: 'flex',
            alignItems: 'center',
            color: getStoredLicenseKey() ? '#000' : '#999',
          }}>
            {getStoredLicenseKey() || '(No key set)'}
          </div>
          
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, marginTop: '16px' }}>
            Update with New Key
          </label>
          <input
            type="text"
            value={licenseKeyInput}
            onChange={(e) => setLicenseKeyInput(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box',
              fontFamily: 'monospace',
            }}
            disabled={loading}
            placeholder="Paste a new license key to update"
          />
          <button
            onClick={handleUpdateLicense}
            disabled={loading || !licenseKeyInput.trim()}
            style={{
              padding: '8px 16px',
              marginRight: '8px',
              background: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || !licenseKeyInput.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !licenseKeyInput.trim() ? 0.6 : 1,
            }}
          >
            {loading ? 'Verifying...' : 'Update & Verify'}
          </button>

          <button
            onClick={handleVerifyNow}
            disabled={loading || !getStoredLicenseKey()}
            style={{
              padding: '8px 16px',
              background: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || !getStoredLicenseKey() ? 'not-allowed' : 'pointer',
              opacity: loading || !getStoredLicenseKey() ? 0.6 : 1,
            }}
          >
            {loading ? 'Verifying...' : 'Verify Current Key'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <p style={{ color: '#b00', marginBottom: '12px', padding: '8px', background: '#ffe6e6', borderRadius: '4px' }}>
            {error}
          </p>
        )}

        {/* Success Message */}
        {success && (
          <p style={{ color: '#080', marginBottom: '12px', padding: '8px', background: '#e6ffe6', borderRadius: '4px' }}>
            ✓ License verified successfully!
          </p>
        )}

        {/* Close Button */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            Close
          </button>
        </div>

        {/* Developer Branding */}
        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #e0e0e0',
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
          <span style={{ fontSize: '13px', color: '#666' }}>
            App developed by <strong>8035 Solutions</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
