import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { LicenseService, LicenseStatus } from './types';
import {
  clearLicenseCache,
  createLicenseStorageKeys,
  deleteStoredLicenseKey,
  getCachedLicenseStatus,
  getStoredLicenseKey,
  setCachedLicenseStatus,
  setStoredLicenseKey,
} from './storage';

export type LicenseContextValue = {
  status: LicenseStatus | null;
  loading: boolean;
  error: string | null;
  licenseKey: string | null;
  checkLicense: (forceRefresh?: boolean) => Promise<LicenseStatus>;
  updateLicenseKey: (key: string) => Promise<LicenseStatus>;
  deleteLicenseKey: () => void;
};

const LicenseContext = createContext<LicenseContextValue | null>(null);

export type LicenseProviderProps = {
  children: React.ReactNode;
  service: LicenseService;
  storagePrefix?: string;
  cacheTtlMs?: number;
  onStatusChange?: (status: LicenseStatus) => void;
};

const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function LicenseProvider({
  children,
  service,
  storagePrefix = 'app',
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  onStatusChange,
}: LicenseProviderProps) {
  const storageKeys = useMemo(() => createLicenseStorageKeys(storagePrefix), [storagePrefix]);
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkLicense = useCallback(
    async (forceRefresh?: boolean) => {
      setLoading(true);
      setError(null);

      const licenseKey = getStoredLicenseKey(storageKeys);
      if (!licenseKey) {
        const unlicensed = {
          licensed: false,
          validTo: '',
          productId: '',
          message: 'No license key provided',
        } satisfies LicenseStatus;
        setStatus(unlicensed);
        setLoading(false);
        return unlicensed;
      }

      if (!forceRefresh) {
        const cached = getCachedLicenseStatus(storageKeys, cacheTtlMs);
        if (cached) {
          setStatus(cached);
          setLoading(false);
          return cached;
        }
      } else {
        clearLicenseCache(storageKeys);
      }

      try {
        const next = await service.checkLicenseStatus(licenseKey, forceRefresh);
        setCachedLicenseStatus(storageKeys, next);
        setStatus(next);
        onStatusChange?.(next);
        return next;
      } catch (e: any) {
        const fallback = {
          licensed: false,
          validTo: '',
          productId: '',
          message: e?.message || 'License check failed',
        } satisfies LicenseStatus;
        setStatus(fallback);
        setError(fallback.message);
        return fallback;
      } finally {
        setLoading(false);
      }
    },
    [cacheTtlMs, onStatusChange, service, storageKeys]
  );

  const updateLicenseKey = useCallback(
    async (key: string) => {
      setStoredLicenseKey(storageKeys, key.trim());
      clearLicenseCache(storageKeys);
      return checkLicense(true);
    },
    [checkLicense, storageKeys]
  );

  const deleteLicense = useCallback(() => {
    deleteStoredLicenseKey(storageKeys);
    clearLicenseCache(storageKeys);
    setStatus({ licensed: false, validTo: '', productId: '', message: 'No license key provided' });
  }, [storageKeys]);

  const licenseKey = getStoredLicenseKey(storageKeys);

  const value: LicenseContextValue = {
    status,
    loading,
    error,
    licenseKey,
    checkLicense,
    updateLicenseKey,
    deleteLicenseKey: deleteLicense,
  };

  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
}

export const useLicense = () => {
  const ctx = useContext(LicenseContext);
  if (!ctx) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return ctx;
};
