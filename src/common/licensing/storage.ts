import type { LicenseStatus, LicenseStorageKeys } from './types';

export const createLicenseStorageKeys = (prefix: string): LicenseStorageKeys => ({
  key: `${prefix}-license-key`,
  status: `${prefix}-license-status`,
  checkedAt: `${prefix}-license-checked-at`,
});

export const getStoredLicenseKey = (keys: LicenseStorageKeys): string | null =>
  window.localStorage.getItem(keys.key);

export const setStoredLicenseKey = (keys: LicenseStorageKeys, value: string) => {
  window.localStorage.setItem(keys.key, value);
};

export const deleteStoredLicenseKey = (keys: LicenseStorageKeys) => {
  window.localStorage.removeItem(keys.key);
};

export const getCachedLicenseStatus = (
  keys: LicenseStorageKeys,
  cacheTtlMs: number
): LicenseStatus | null => {
  const raw = window.localStorage.getItem(keys.status);
  const ts = window.localStorage.getItem(keys.checkedAt);
  if (!raw || !ts) return null;

  const age = Date.now() - Number(ts);
  if (age > cacheTtlMs) return null;

  try {
    return JSON.parse(raw) as LicenseStatus;
  } catch {
    return null;
  }
};

export const setCachedLicenseStatus = (
  keys: LicenseStorageKeys,
  status: LicenseStatus
) => {
  window.localStorage.setItem(keys.status, JSON.stringify(status));
  window.localStorage.setItem(keys.checkedAt, String(Date.now()));
};

export const clearLicenseCache = (keys: LicenseStorageKeys) => {
  window.localStorage.removeItem(keys.status);
  window.localStorage.removeItem(keys.checkedAt);
};
