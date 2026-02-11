import React from 'react';
import { useLicense } from './LicenseContext';
import './licensing.css';

export type LicenseSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function LicenseSettingsModal({ isOpen, onClose }: LicenseSettingsModalProps) {
  const { status, licenseKey, updateLicenseKey, checkLicense, loading, error } = useLicense();
  const [licenseKeyInput, setLicenseKeyInput] = React.useState(licenseKey || '');
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setLicenseKeyInput(licenseKey || '');
      setSuccess(false);
    }
  }, [isOpen, licenseKey]);

  if (!isOpen) return null;

  const handleUpdate = async () => {
    const key = licenseKeyInput.trim();
    if (!key) return;
    const result = await updateLicenseKey(key);
    setSuccess(result.licensed);
  };

  const handleVerify = async () => {
    const result = await checkLicense(true);
    setSuccess(result.licensed);
  };

  return (
    <div className="license-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="license-modal">
        <h3>Settings</h3>
        <div className="license-status-box compact">
          <div className="license-status-row">
            <span className="license-label">Status</span>
            <span className={status?.licensed ? 'license-value ok' : 'license-value fail'}>
              {status?.licensed ? 'Licensed' : 'Not Licensed'}
            </span>
          </div>
          {status?.validTo && (
            <div className="license-status-row">
              <span className="license-label">Valid Until</span>
              <span className="license-value">{status.validTo}</span>
            </div>
          )}
          {status?.message && (
            <div className="license-status-row">
              <span className="license-label">Message</span>
              <span className="license-value">{status.message}</span>
            </div>
          )}
        </div>

        <label className="license-input-label">Current License Key</label>
        <div className="license-key-box">
          {licenseKey || '(No key set)'}
        </div>

        <label className="license-input-label">Update with New Key</label>
        <input
          className="license-input"
          type="text"
          value={licenseKeyInput}
          onChange={(event) => setLicenseKeyInput(event.target.value)}
          placeholder="Paste a new license key"
          disabled={loading}
        />

        <div className="license-modal-actions">
          <button className="license-secondary" onClick={handleVerify} disabled={loading || !licenseKey}>
            {loading ? 'Verifying...' : 'Verify Current Key'}
          </button>
          <button className="license-primary" onClick={handleUpdate} disabled={loading || !licenseKeyInput.trim()}>
            {loading ? 'Verifying...' : 'Update and Verify'}
          </button>
        </div>

        {error && <p className="license-message">{error}</p>}
        {success && <p className="license-success">License verified successfully.</p>}

        <div className="license-modal-actions end">
          <button className="license-secondary" onClick={onClose} disabled={loading}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
