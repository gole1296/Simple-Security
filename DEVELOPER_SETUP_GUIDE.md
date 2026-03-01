# Simple Security - Developer Setup Guide

This guide is for developers who want to build, modify, or extend Simple Security from source code.

---

## Prerequisites

### Development Tools
- **Node.js** 18+ and **npm** - [Download](https://nodejs.org/)
- **Power Platform CLI (pac)** - [Download](https://aka.ms/PowerAppsCLI)
- **Git** (recommended) - [Download](https://git-scm.com/)
- **VS Code** (recommended) with extensions:
  - Power Platform VS Code Extension
  - ESLint
  - TypeScript Vue Plugin

### Power Platform Requirements
- Development environment with Dataverse
- System Administrator access
- Custom connector configured (see [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md))

---

## Project Setup

### 1. Clone/Download the Repository
```powershell
# If using Git
git clone [repository-url]
cd simple-security

# Or extract from ZIP file
```

### 2. Install Dependencies
```powershell
npm install
```

This installs:
- React 19.2.0
- TypeScript 5.9.3
- Vite 7.2.4 (build tool)
- Power Apps SDK 1.0.3
- Development tools (ESLint, etc.)

### 3. Authenticate with Power Platform
```powershell
# Authenticate to your development environment
pac auth create --environment https://[your-org].crm.dynamics.com

# Verify authentication
pac auth list
```

### 4. Review Configuration Files

#### `power.config.json`
- Contains app metadata and Dataverse connections
- **Key fields**:
  - `appId`: Unique ID of your app (auto-generated)
  - `environmentId`: Your development environment GUID
  - `databaseReferences`: Dataverse tables used by the app

#### `package.json`
- npm scripts and dependencies
- **Available scripts**:
  - `npm run dev`: Start development server
  - `npm run build`: Build for production
  - `npm run lint`: Run ESLint
  - `npm run preview`: Preview production build

---

## Development Workflow

### Local Development

1. **Start the Development Server**
   ```powershell
   npm run dev
   ```
   - App runs at `http://localhost:3000/` (or next available port)
   - Hot Module Replacement (HMR) enabled for fast refresh

2. **Open in Browser**
   - Navigate to `http://localhost:3000/`
   - Changes to `.tsx`, `.ts`, `.css` files will auto-reload

3. **Development Tips**
   - React DevTools browser extension recommended
   - Check browser console (F12) for errors
   - Vite provides fast rebuild times

### Working with Dataverse Data

The app uses generated models and services from `src/generated/`:

```typescript
// Example: Using SystemUsersService
import { SystemusersService } from './generated/services/SystemusersService';

const usersService = new SystemusersService();
const users = await usersService.getAll();
```

#### Available Services
All services are in `src/generated/services/`:
- **SystemusersService**: User operations
- **TeamsService**: Team operations
- **RolesService**: Security role operations
- **FieldsecurityprofilesService**: Field security profile operations
- **Ope_simplesecurityactionsService**: Custom action operations
- And more...

#### Available Models
All models/types are in `src/generated/models/`:
- **SystemusersModel**: User entity
- **TeamsModel**: Team entity
- **RolesModel**: Role entity
- **FieldsecurityprofilesModel**: Field security profile entity
- And more...

### Adding New Data Sources

If you need to add a new Dataverse table:

```powershell
# For standard Dataverse tables
pac code add-data-source -a "default.cds" -t "[tablename]"

# For custom connectors
pac code add-data-source -a "[apiId]" -c "[connectionId]"
```

This will:
1. Update `power.config.json`
2. Generate new models in `src/generated/models/`
3. Generate new services in `src/generated/services/`

### Project Structure

```
simple-security/
├── public/                   # Static assets
├── src/
│   ├── assets/              # Images, icons, etc.
│   ├── common/              # Shared utilities
│   │   └── theme/           # Theme context and switcher
│   ├── components/          # React components
│   │   └── SettingsModal.tsx
│   ├── generated/           # ⚠️ AUTO-GENERATED - Do not edit manually
│   │   ├── models/          # TypeScript interfaces for Dataverse entities
│   │   └── services/        # Service classes for CRUD operations
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # App entry point
│   └── simpleSecurityAction.ts  # Custom action helper
├── .power/                  # Power Platform metadata (do not edit)
├── power.config.json        # Power Platform configuration
├── package.json             # npm configuration
├── vite.config.ts           # Vite bundler configuration
├── tsconfig.json            # TypeScript configuration
└── eslint.config.js         # ESLint configuration
```

### Key Files to Know

#### `src/App.tsx`
- Main application component
- Entry point for your UI

#### `src/main.tsx`
- Bootstraps React app
- Includes Power Apps context provider

#### `src/simpleSecurityAction.ts`
- Helper for calling the custom `ope_simplesecurityaction` API
- Used for role/profile assignments

---

## Building and Deployment

### Build for Production

```powershell
npm run build
```

This creates an optimized build in the `dist/` folder:
- Minified JavaScript and CSS
- Tree-shaken to remove unused code
- Optimized for performance

### Deploy to Power Platform

```powershell
pac code push
```

This:
1. Uploads the built app from `dist/` to your Power Platform environment
2. Publishes the app
3. Makes it available to users

### Preview Production Build Locally

```powershell
npm run build
npm run preview
```

Access at `http://localhost:4173/` (or next available port)

---

## Common Development Tasks

### Adding a New Component

1. Create in `src/components/`:
   ```typescript
   // src/components/MyComponent.tsx
   export function MyComponent() {
     return <div>Hello World</div>;
   }
   ```

2. Import and use in `App.tsx` or other components:
   ```typescript
   import { MyComponent } from './components/MyComponent';
   ```

### Calling Dataverse APIs

Use generated services:
```typescript
import { SystemusersService } from './generated/services/SystemusersService';

// In your component
const loadUsers = async () => {
  const service = new SystemusersService();
  const users = await service.getAll();
  return users;
};
```

### Using the Custom Action

```typescript
import { executeSimpleSecurityAction } from './simpleSecurityAction';

// Assign a role to a user
await executeSimpleSecurityAction({
  ope_Operation: 'associate',
  ope_PrincipalType: 'systemuser',
  ope_PrincipalId: userId,
  ope_RelatedType: 'role',
  ope_RelatedId: roleId
});

// Remove a role from a user
await executeSimpleSecurityAction({
  ope_Operation: 'disassociate',
  ope_PrincipalType: 'systemuser',
  ope_PrincipalId: userId,
  ope_RelatedType: 'role',
  ope_RelatedId: roleId
});
```

### Styling

The app uses CSS modules and standard CSS:
- Global styles: `src/index.css`
- Component styles: Inline or separate `.css` files
- Theme support: `src/common/theme/`

---

## Debugging

### Browser DevTools
- Open DevTools (F12)
- **Console**: Check for errors and warnings
- **Network**: Inspect API calls to Dataverse
- **React DevTools**: Inspect component hierarchy

### Power Apps Integration
When running in Power Apps context:
- Use `window.powerApps` API (see Power Apps SDK docs)
- Check Power Apps Monitor for detailed traces

### Common Issues

#### Issue: "Module not found" errors
```powershell
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Issue: TypeScript errors in generated files
```powershell
# Regenerate models/services
pac code add-data-source -a "default.cds"
```

#### Issue: Build fails
```powershell
# Check TypeScript compilation
npx tsc --noEmit

# Check for linting issues
npm run lint
```

---

## Testing

### Manual Testing
1. Start dev server: `npm run dev`
2. Test functionality in browser
3. Use React DevTools to inspect state

### Linting
```powershell
npm run lint
```

### Type Checking
```powershell
npx tsc --noEmit
```

---

## Code Quality & Best Practices

### TypeScript
- Use strict type checking (enabled in `tsconfig.json`)
- Avoid `any` types; use proper interfaces
- Leverage generated models for type safety

### React
- Use functional components and hooks
- Follow React naming conventions (PascalCase for components)
- Keep components small and focused

### Power Platform
- **Never edit `src/generated/` manually** - changes will be overwritten
- Use services for Dataverse operations (don't call Web API directly)
- Follow Power Apps best practices for performance

### Source Control
- Commit `power.config.json` (app configuration)
- **Do NOT commit**:
  - `node_modules/`
  - `dist/`
  - `.env` files with secrets

---

## Upgrading Dependencies

### Check for Updates
```powershell
npm outdated
```

### Update Packages
```powershell
# Update all (use with caution)
npm update

# Update specific package
npm install [package-name]@latest
```

### Power Apps SDK
```powershell
npm install @microsoft/power-apps@latest
```

---

## Additional Resources

### Documentation
- [Power Apps SDK Docs](https://learn.microsoft.com/power-apps/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vite.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Power Platform CLI
```powershell
# Get help
pac code --help
pac code push --help
pac code add-data-source --help
```

---

## Support

For development issues:
1. Check browser console for errors
2. Review Power Platform CLI logs
3. Verify authentication: `pac auth list`
4. Check generated code in `src/generated/`
5. Review Dataverse API responses in Network tab

For production deployment, see [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md).

---

**Happy Coding!** 🚀
