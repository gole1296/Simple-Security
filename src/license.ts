// src/license.ts
// License validation utility for Simple Security app

import { _8035LicenseService } from './generated/services/_8035LicenseService';
import { getContext } from '@microsoft/power-apps/app';

const LICENSE_KEY_STORAGE = 'simple-security-license-key';
const LICENSE_STATUS_STORAGE = 'simple-security-license-status';
const LICENSE_STATUS_TIMESTAMP = 'simple-security-license-checked-at';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export type LicenseStatus = {
  licensed: boolean;
  validTo: string;
  productId: string;
  message: string;
};

export function getStoredLicenseKey(): string | null {
  return window.localStorage.getItem(LICENSE_KEY_STORAGE);
}

export function setStoredLicenseKey(key: string) {
  window.localStorage.setItem(LICENSE_KEY_STORAGE, key);
}

export function clearLicenseCache() {
  window.localStorage.removeItem(LICENSE_STATUS_STORAGE);
  window.localStorage.removeItem(LICENSE_STATUS_TIMESTAMP);
}

export function deleteLicenseKey() {
  window.localStorage.removeItem(LICENSE_KEY_STORAGE);
  clearLicenseCache();
}

export function getCachedLicenseStatus(): LicenseStatus | null {
  const raw = window.localStorage.getItem(LICENSE_STATUS_STORAGE);
  const ts = window.localStorage.getItem(LICENSE_STATUS_TIMESTAMP);
  if (!raw || !ts) return null;
  const age = Date.now() - Number(ts);
  if (age > CACHE_TTL_MS) return null;
  try {
    return JSON.parse(raw) as LicenseStatus;
  } catch {
    return null;
  }
}

export function setCachedLicenseStatus(status: LicenseStatus) {
  window.localStorage.setItem(LICENSE_STATUS_STORAGE, JSON.stringify(status));
  window.localStorage.setItem(LICENSE_STATUS_TIMESTAMP, String(Date.now()));
}


export async function checkLicenseStatus(key?: string, forceRefresh?: boolean): Promise<LicenseStatus> {
  const licenseKey = key ?? getStoredLicenseKey();
  
  console.log('[License] checkLicenseStatus called with key:', licenseKey ? `${licenseKey.substring(0, 10)}...` : 'none', 'forceRefresh:', forceRefresh);
  
  // If new key provided or force refresh, clear cache
  if (key || forceRefresh) {
    console.log('[License] Clearing cache due to new key or forceRefresh');
    clearLicenseCache();
  }
  
  // Check cache first (unless force refresh requested)
  if (!forceRefresh && !key) {
    const cached = getCachedLicenseStatus();
    if (cached) {
      console.log('[License] Using cached status:', cached);
      return cached;
    }
  }
  
  // Must have a key to check
  if (!licenseKey) {
    console.log('[License] No license key available, returning unlicensed');
    return {
      licensed: false,
      validTo: '',
      productId: '',
      message: 'No license key provided',
    };
  }
  
  // Get tenant ID from Power Apps context
  let tenantId: string | undefined;
  try {
    const ctx = await getContext();
    tenantId = ctx.user.tenantId;
    console.log('[License] Retrieved tenant ID from context:', tenantId);
  } catch (contextError) {
    console.warn('[License] Failed to get context, proceeding without tenant ID:', contextError);
  }

  // Call connector
  try {
    console.log('[License] Calling _8035LicenseService.CheckLicenseStatus with params:', {
      licenseKey: licenseKey ? `${licenseKey.substring(0, 10)}...` : 'none',
      tenantId: tenantId || '(empty string)',
      productId: 'SimpleSecurity'
    });
    const result = await _8035LicenseService.CheckLicenseStatus(licenseKey, tenantId || '', "SimpleSecurity");
    console.log('[License] Raw service response:', result);
    
    // Extract the actual license data from nested response structure
    // Azure Function returns: { success: true, data: { licensed: boolean, ... } }
    let value: any = result;
    
    // Try result.data first (common for Azure Functions)
    if ((result as any)?.data) {
      console.log('[License] Found data in result.data');
      value = (result as any).data;
    } else if ((result as any)?.value) {
      console.log('[License] Found data in result.value');
      value = (result as any).value;
    }
    
    console.log('[License] Extracted value from response:', value);
    
    const status: LicenseStatus = {
      licensed: !!value?.licensed,
      validTo: value?.validTo || '',
      productId: value?.productId || '',
      message: value?.message || 'License verified',
    };
    
    console.log('[License] Final status object:', status);
    setCachedLicenseStatus(status);
    return status;
  } catch (e: any) {
    console.error('[License] Error during check:', e);
    const errorStatus = {
      licensed: false,
      validTo: '',
      productId: '',
      message: e?.message || 'License check failed',
    };
    console.log('[License] Returning error status:', errorStatus);
    return errorStatus;
  }
}
