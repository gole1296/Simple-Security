# Shared License + Theme Starter

This folder contains reusable licensing and theming building blocks.

## Quick start

1. Import the styles:

```ts
import './common/theme/theme.css';
import './common/licensing/licensing.css';
```

2. Wrap your app:

```tsx
<ThemeProvider storageKey="simple-security-theme">
  <LicenseProvider
    storagePrefix="simple-security"
    service={{
      checkLicenseStatus: async (key) => {
        // Call your connector or API here.
        return { licensed: false, validTo: '', productId: '', message: 'Not configured' };
      },
    }}
  >
    <LicenseGate>
      <App />
    </LicenseGate>
  </LicenseProvider>
</ThemeProvider>
```

3. Drop in a theme switcher where you want it:

```tsx
<ThemeSwitcher className="theme-select" />
```
