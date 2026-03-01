# Shared Theme Starter

This folder contains reusable theming building blocks.

## Quick start

1. Import the theme styles:

```ts
import './common/theme/theme.css';
```

2. Wrap your app:

```tsx
<ThemeProvider storageKey="simple-security-theme">
  <App />
</ThemeProvider>
```

3. Drop in a theme switcher where you want it:

```tsx
<ThemeSwitcher className="theme-select" />
```
