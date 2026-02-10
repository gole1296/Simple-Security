# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

It is preconfigured to work with Power Apps Code Apps.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Deployment and Configuration

### Prerequisites
- Power Platform environment with Dataverse.
- The custom API `ope_simplesecurityaction` deployed in the target environment (included in the solution with this app).
- Power Platform CLI installed and authenticated (`pac auth create`).

### Azure App Registration (for Custom Connector OAuth)
The custom connector uses Azure AD OAuth to call Dataverse in the current user context.

1. Create or use an Azure App Registration.
2. Add a Web redirect URI for the connector (shown in the connector security screen). Example:
   - `https://global.consent.azure-apim.net/redirect/simplesecurityaction-<connector-guid>`
3. Ensure the App Registration has delegated permissions for Dataverse:
   - Resource: `https://<org>.api.crm.dynamics.com/.default`

### Create the Custom Connector
1. Power Apps Maker Portal -> Custom connectors -> New custom connector -> Create from blank.
2. Name: `SimpleSecurityAction`.
3. Host: `<org>.api.crm.dynamics.com` (no protocol or path).
4. Base URL: `/`.
5. Security: OAuth 2.0 (Azure AD) using the App Registration above.
6. Definition -> Add action:
   - Operation ID: `SimpleSecurityAction`
   - Verb: `POST`
   - URL: `https://<org>.api.crm.dynamics.com/api/data/v9.2/ope_simplesecurityaction`
   - Body example:
     ```json
     {
       "ope_Operation": "associate",
       "ope_PrincipalType": "systemuser",
       "ope_PrincipalId": "00000000-0000-0000-0000-000000000000",
       "ope_RelatedType": "role",
       "ope_RelatedId": "00000000-0000-0000-0000-000000000000"
     }
     ```
   - Response example:
     ```json
     { "ope_Success": true }
     ```
7. Save and test the connector.

### Register the Connector in the Code App
After creating the connector and connection:

1. Get the connector apiId and the connectionId from the maker portal URLs.
2. Register it in the code app:
   ```bash
   pac code add-data-source -a "<connectorApiId>" -c "<connectionId>"
   ```

### Build and Push
```bash
npm run build
pac code push
```

### Deployment to Another Tenant/Environment
- Import the solution that contains the app and the `ope_simplesecurityaction` custom API.
- Create the custom connector in the target environment using the target org host.
- Create a connection for the custom connector.
- Map the connection reference during import.

The app uses the connector to call `ope_simplesecurityaction` in the current user context, so users must have Dataverse privileges for the association/disassociation actions.

## License Key Setup and Validation

This app requires a valid license key to function. If the app is not licensed, you will see a blocking message and will not be able to use its features.

### How to Enter or Update Your License Key

1. Open the app. If not licensed, a message will appear with a button to enter or update your license key.
2. Click the "Enter/Update License Key" button.
3. Paste your license key and click Save. The app will validate the key and unlock if valid.
4. You can update the license key at any time from the same dialog.

### How Licensing Works
- The app checks your license key against a central service once per day.
- If the license is expired or invalid, the app will block access until a valid key is entered.
- No secrets or credentials are stored in the app; only the license key is needed.

### Troubleshooting
- If you see a message about license status not being active, contact your vendor to renew or check your license.
- If you update your license key, the app will re-validate immediately.

---

For more information, contact support or your vendor.
