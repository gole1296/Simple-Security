# Simple Security - Troubleshooting Guide

This guide helps you diagnose and resolve common issues with Simple Security installation and operation.

---

## Table of Contents

1. [Connection & Authentication Issues](#connection--authentication-issues)
2. [Custom Connector Issues](#custom-connector-issues)
3. [App Loading & Performance Issues](#app-loading--performance-issues)
4. [Permission & Access Issues](#permission--access-issues)
5. [Data & Display Issues](#data--display-issues)
6. [Deployment Issues](#deployment-issues)
7. [Development Issues](#development-issues)

---

## Connection & Authentication Issues

### Issue: "Failed to connect to SimpleSecurityAction"

**Symptoms:**
- App shows connection error on startup
- "Unable to connect to data source" message
- Operations fail with connection errors

**Diagnosis:**
```
1. Navigate to Power Apps Maker Portal → Connections
2. Find SimpleSecurityAction connection
3. Check connection status
```

**Solutions:**

**If connection shows "Error" or "Fix connection":**
1. Click on the connection
2. Click "Fix connection"
3. Sign in and re-authorize
4. Test the connection

**If connection doesn't exist:**
1. Go to Connections → + New connection
2. Select SimpleSecurityAction connector
3. Create and authorize

**If connection exists but app won't connect:**
1. Open Simple Security solution
2. Verify connection reference is mapped correctly
3. Re-publish the app
4. Clear browser cache and reload

---

### Issue: OAuth redirect URI mismatch

**Symptoms:**
- Error: "AADSTS50011: The redirect URI specified in the request does not match..."
- Cannot create connection to custom connector

**Diagnosis:**
```
1. Get redirect URI from Custom Connector:
   - Open SimpleSecurityAction connector
   - Go to Security tab
   - Copy the Redirect URL

2. Check Azure App Registration:
   - Open Azure Portal → App registrations
   - Find "Simple Security Connector"
   - Go to Authentication → Web platform
   - Verify redirect URI matches
```

**Solutions:**
1. **Copy exact redirect URI** from connector Security tab
2. **Add to Azure App Registration**:
   - Azure Portal → App registrations → Simple Security Connector
   - Authentication → Web platform
   - Click "Add URI"
   - Paste redirect URI exactly as shown
   - Click Save
3. **Wait 2-3 minutes** for Azure changes to propagate
4. **Try creating connection again**

---

### Issue: "Unauthorized" or "Access denied" during connection creation

**Symptoms:**
- 401 Unauthorized error
- Cannot authorize connection
- "You do not have permission" message

**Diagnosis:**
```
1. Check Azure App Registration API permissions
2. Verify admin consent was granted
3. Check user's Dataverse permissions
```

**Solutions:**
1. **Verify API Permissions**:
   - Azure Portal → App registrations → Simple Security Connector
   - API permissions
   - Ensure "Dynamics CRM" → "user_impersonation" exists
   - Verify "Status" shows green checkmark (admin consent granted)

2. **Grant Admin Consent** (if not granted):
   - Click "Grant admin consent for [Your Organization]"
   - Confirm
   - Wait 2-3 minutes

3. **Check User Permissions**:
   - User creating connection must have Dataverse access
   - Verify user has appropriate security role in environment

4. **Re-create Client Secret** (if secret expired):
   - Azure Portal → App registrations → Simple Security Connector
   - Certificates & secrets → New client secret
   - Copy secret value
   - Update custom connector with new secret

---

## Custom Connector Issues

### Issue: Custom connector not found or doesn't appear

**Symptoms:**
- SimpleSecurityAction connector missing from connector list
- Cannot create connection

**Diagnosis:**
```
1. Check environment: make.powerapps.com (top-right dropdown)
2. Go to Custom connectors
3. Search for "SimpleSecurityAction"
```

**Solutions:**
- **Verify correct environment** - ensure you're in the target environment
- **Re-create connector** - follow Step 4 in INSTALLATION_GUIDE.md
- **Check permissions** - you need System Administrator or appropriate role to create connectors

---

### Issue: Custom connector test fails

**Symptoms:**
- Connector test returns error
- "Failed to execute request" message

**Diagnosis:**
```
1. Open SimpleSecurityAction connector
2. Go to Test tab
3. Create a connection (if not already connected)
4. Try to test an operation
```

**Solutions:**
1. **Verify Host URL**:
   - General tab → Host: `[your-org].api.crm.dynamics.com`
   - Ensure no `https://` prefix
   - Ensure correct organization name

2. **Verify Operation URL**:
   - Definition tab → SimpleSecurityAction operation
   - URL should be: `https://[your-org].api.crm.dynamics.com/api/data/v9.2/ope_simplesecurityaction`

3. **Check Custom API**:
   - Verify `ope_simplesecurityaction` exists in Dataverse
   - Advanced settings → Custom APIs
   - Should be included in imported solution

4. **Test with valid GUIDs**:
   - Use real systemuser GUID and role GUID
   - Example test body:
     ```json
     {
       "ope_Operation": "associate",
       "ope_PrincipalType": "systemuser",
       "ope_PrincipalId": "<real-user-guid>",
       "ope_RelatedType": "role",
       "ope_RelatedId": "<real-role-guid>"
     }
     ```

---

## App Loading & Performance Issues

### Issue: App won't load / shows blank screen

**Symptoms:**
- White/blank screen when opening app
- Loading spinner never completes
- App crashes immediately

**Diagnosis:**
```
1. Open browser developer tools (F12)
2. Check Console tab for JavaScript errors
3. Check Network tab for failed requests
```

**Solutions:**

**Common fixes:**
1. **Clear browser cache**:
   - Ctrl + Shift + Delete (Chrome/Edge)
   - Clear cached images and files
   - Reload app

2. **Try different browser**:
   - Test in Chrome, Edge, or Firefox
   - Try incognito/private mode

3. **Check for errors in Console (F12)**:
   - Look for red error messages
   - Common issues:
     - Connection failures → See Connection Issues section
     - JavaScript errors → May indicate app corruption

4. **Re-publish the app**:
   - Power Apps Maker Portal → Apps
   - Select Simple Security → Publish

5. **Verify app package**:
   - Check if app was fully imported
   - Re-import solution if necessary

---

### Issue: App is slow or unresponsive

**Symptoms:**
- Long load times
- Operations take too long to complete
- UI freezes or lags

**Diagnosis:**
```
1. Check network latency to Dataverse
2. Check browser performance (Task Manager)
3. Monitor Network tab in browser DevTools (F12)
```

**Solutions:**
1. **Check network connection** - ensure stable internet
2. **Reduce data volume**:
   - Apply filters to reduce records loaded
   - Paginate large result sets
3. **Clear browser cache** - accumulated cache can slow performance
4. **Close unnecessary browser tabs** - free up memory
5. **Check Dataverse performance** - may be environment-wide issue
6. **Contact Microsoft support** - if Dataverse itself is slow

---

## Permission & Access Issues

### Issue: "Access denied" when performing operations

**Symptoms:**
- Can view data but cannot assign roles
- "You don't have permission" error
- Operations fail with 403 Forbidden

**Diagnosis:**
```
1. Check user's security roles in Power Platform
2. Verify custom API permissions
3. Test with System Administrator account
```

**Solutions:**

**For Users:**
1. **Verify Security Role Assignment**:
   - Power Platform Admin Center → Environments → [Your Environment]
   - Settings → Users + permissions → Users
   - Find user → Manage security roles
   - Ensure appropriate role is assigned

2. **Required Permissions**:
   - Read: systemuser, team, role, fieldsecurityprofile, privilege
   - Execute: Custom API `ope_simplesecurityaction`
   - Append/AppendTo: For role and profile associations

3. **Test with System Administrator**:
   - If works as admin but not as regular user → permission issue
   - Adjust security role or assign System Administrator (for testing)

**For Custom API:**
1. **Verify Custom API exists**:
   - Advanced settings → Customizations → Custom APIs
   - Find `ope_simplesecurityaction`

2. **Check Custom API privileges**:
   - Ensure security role grants Execute privilege
   - May need to modify security role

---

### Issue: Cannot see teams/users/roles

**Symptoms:**
- Empty lists where data should appear
- "No records found" for existing data
- Some users can see data, others cannot

**Diagnosis:**
```
1. Sign in as different users to compare
2. Check security role assignments
3. Verify business unit access
```

**Solutions:**
1. **Check Read permissions**:
   - Security role must include Read privilege for:
     - SystemUser
     - Team
     - Role
     - FieldSecurityProfile

2. **Verify business unit access**:
   - Users can only see records in their business unit scope
   - Check security role's "Organization" vs "Business Unit" access level

3. **Test with global data**:
   - Sign in as System Administrator
   - If data appears for admin → permission issue
   - Adjust user's security role

---

## Data & Display Issues

### Issue: Data doesn't update / shows stale information

**Symptoms:**
- Changes not reflected immediately
- Old data still showing after updates
- Assigned roles don't appear

**Diagnosis:**
```
1. Check if operation completed successfully
2. Verify no errors in browser console
3. Check Dataverse directly (Advanced settings)
```

**Solutions:**
1. **Refresh the app** - F5 or refresh button
2. **Clear cache** - Ctrl + F5 for hard refresh
3. **Wait 30 seconds** - Dataverse may have replication delay
4. **Check operation result**:
   - Look for success/error message
   - Check browser console for errors (F12)
5. **Verify in Dataverse**:
   - Advanced settings → Navigate to record
   - Confirm change was saved
6. **Re-publish app** - if issue persists across all users

---

### Issue: UI displays incorrect or garbled text

**Symptoms:**
- Labels show technical names instead of display names
- Text appears corrupted
- Formatting is broken

**Diagnosis:**
```
1. Check browser language settings
2. Verify Dataverse language packs installed
3. Check for JavaScript errors in console
```

**Solutions:**
1. **Clear browser cache**
2. **Check language settings**:
   - Power Platform environment language
   - Browser language
   - User's personal language preference
3. **Reinstall area be an issue the app**:
   - Delete and re-import solution
   - Verify solution package integrity

---

## Deployment Issues

### Issue: Solution import fails

**Symptoms:**
- "Import failed" error
- Missing dependencies warning
- Solution import stuck/never completes

**Diagnosis:**
```
1. Check solution import log
2. Review error messages
3. Verify environment version
```

**Solutions:**

**Missing Dependencies:**
- Import any required prerequisite solutions first
- Contact vendor for dependency information

**Version Mismatch:**
- Ensure target environment is same or higher version
- Update environment if needed

**Import Errors:**
1. **Check import log**:
   - Click on failed import
   - Download and review log file
2. **Remove old version** (if upgrading):
   - Delete existing solution first (if unmanaged)
   - For managed solutions, import directly (will upgrade)
3. **Try again**:
   - Re-download solution file from vendor
   - Verify file isn't corrupted
4. **Contact vendor** - provide import log

---

### Issue: pac code push fails

**Symptoms:**
- `pac code push` returns error
- Build completes but push fails
- Authentication errors

**Diagnosis:**
```
1. Verify authentication: pac auth list
2. Check build output: npm run build
3. Review error message
```

**Solutions:**
1. **Re-authenticate**:
   ```powershell
   pac auth clear
   pac auth create --environment https://[your-org].crm.dynamics.com
   ```

2. **Verify build succeeded**:
   ```powershell
   npm run build
   # Check for errors
   ```

3. **Check power.config.json**:
   - Verify `environmentId` is correct
   - Verify `appId` exists

4. **Check permissions**:
   - User must have System Administrator or System Customizer role

5. **Try verbose logging**:
   ```powershell
   pac code push --verbose
   ```

---

## Development Issues

### Issue: npm install fails

**Symptoms:**
- Dependency installation errors
- "Cannot find module" errors
- Version conflicts

**Solutions:**
1. **Use correct Node.js version**:
   ```powershell
   node --version  # Should be 18+
   ```

2. **Clear npm cache**:
   ```powershell
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check network connection** - ensure npm registry is accessible

4. **Use npm instead of yarn** - project uses npm

---

### Issue: npm run dev fails / Vite errors

**Symptoms:**
- Dev server won't start
- Port already in use
- Build errors

**Solutions:**
1. **Check port availability**:
   - Default port: 3000
   - If busy, Vite will try next port
   - Or kill process using port 3000

2. **Clear dist folder**:
   ```powershell
   rm -rf dist
   npm run dev
   ```

3. **Check for TypeScript errors**:
   ```powershell
   npx tsc --noEmit
   ```

4. **Reinstall dependencies** (see npm install section above)

---

### Issue: TypeScript errors in generated files

**Symptoms:**
- Errors in `src/generated/` folder
- "Cannot find type" errors
- Build fails due to generated code

**Solutions:**
1. **Regenerate models/services**:
   ```powershell
   pac code add-data-source -a "default.cds"
   ```

2. **Never edit generated files** - changes will be overwritten

3. **Check Power Apps SDK version**:
   ```powershell
   npm list @microsoft/power-apps
   # Update if needed:
   npm install @microsoft/power-apps@latest
   ```

---

## Getting Additional Help

If you've tried everything and still have issues:

### 1. Gather Diagnostic Information
- Error messages (exact text or screenshots)
- Browser console output (F12 → Console tab)
- Network tab output for failed requests (F12 → Network tab)
- Power Platform environment version
- Simple Security solution version
- Steps to reproduce the issue

### 2. Check Resources
- Review [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md)
- Review [DEVELOPER_SETUP_GUIDE.md](DEVELOPER_SETUP_GUIDE.md)
- Check Microsoft Power Platform documentation
- Search Power Platform Community forums

### 3. Contact Support

**For Installation/Technical Issues:**
- Contact your Simple Security vendor
- Provide: Diagnostic information from step 1

**For Power Platform Issues:**
- Contact Microsoft Support
- Provide: Environment ID, error message, reproduction steps

---

## Useful Commands & Links

### Power Platform CLI Commands
```powershell
# Check authentication
pac auth list

# Re-authenticate
pac auth create --environment https://[your-org].crm.dynamics.com

# Get help
pac --help
pac code --help
```

### Browser Troubleshooting
```
F12                 - Open Developer Tools
Ctrl + Shift + Delete - Clear browsing data
Ctrl + F5           - Hard refresh (clear cache)
Ctrl + Shift + N    - Open incognito/private mode (Chrome/Edge)
```

### Development Commands
```powershell
npm install         - Install dependencies
npm run dev         - Start development server
npm run build       - Build for production
npm run lint        - Run linter
npx tsc --noEmit    - Check TypeScript errors
```

### Key URLs
- Power Apps Maker: [https://make.powerapps.com](https://make.powerapps.com)
- Azure Portal: [https://portal.azure.com](https://portal.azure.com)
- Power Platform Admin: [https://admin.powerplatform.microsoft.com](https://admin.powerplatform.microsoft.com)

---

**Last Updated:** [Date]

For complete installation instructions, see [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md).
