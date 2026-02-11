import React from 'react';
import { useLicense } from './LicenseContext';
import { LicenseSettingsModal } from './SettingsModal';
import './licensing.css';

export type LicenseGateProps = {
  children: React.ReactNode;
  title?: string;
  description?: string;
  showStatusBox?: boolean;
};

export function LicenseGate({
  children,
  title = 'License Information',
  description = 'A valid license is required to use this app.',
  showStatusBox = true,
}: LicenseGateProps) {
  const { status, licenseKey } = useLicense();
  const [modalOpen, setModalOpen] = React.useState(false);

  const isLicensed = Boolean(status?.licensed);

  return (
    <>
      {children}
      {!isLicensed && (
        <div className="license-overlay" role="dialog" aria-modal="true">
          <div className="license-card">
            <h2>{title}</h2>
            <p className="license-description">{description}</p>
            {showStatusBox && (
              <div className="license-status-box">
                <div className="license-status-row">
                  <span className="license-label">Status</span>
                  <span className={isLicensed ? 'license-value ok' : 'license-value fail'}>
                    {isLicensed ? 'Licensed' : 'Not Licensed'}
                  </span>
                </div>
                {status?.validTo && (
                  <div className="license-status-row">
                    <span className="license-label">Valid Until</span>
                    <span className="license-value">{status.validTo}</span>
                  </div>
                )}
                {status?.productId && (
                  <div className="license-status-row">
                    <span className="license-label">Product</span>
                    <span className="license-value">{status.productId}</span>
                  </div>
                )}
                {licenseKey && (
                  <div className="license-status-row">
                    <span className="license-label">License Key</span>
                    <span className="license-value mono">{licenseKey}</span>
                  </div>
                )}
              </div>
            )}
            {status?.message && !isLicensed && (
              <p className="license-message">{status.message}</p>
            )}
            <button className="license-primary" onClick={() => setModalOpen(true)}>
              Update License Key
            </button>
          </div>
        </div>
      )}
      <LicenseSettingsModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
