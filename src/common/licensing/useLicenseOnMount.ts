import { useEffect } from 'react';
import { useLicense } from './LicenseContext';

export function useLicenseOnMount() {
  const { checkLicense } = useLicense();

  useEffect(() => {
    void checkLicense(false);
  }, [checkLicense]);
}
