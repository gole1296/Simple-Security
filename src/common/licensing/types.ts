export type LicenseStatus = {
  licensed: boolean;
  validTo: string;
  productId: string;
  message: string;
};

export type LicenseService = {
  checkLicenseStatus: (licenseKey?: string, forceRefresh?: boolean) => Promise<LicenseStatus>;
};

export type LicenseStorageKeys = {
  key: string;
  status: string;
  checkedAt: string;
};
