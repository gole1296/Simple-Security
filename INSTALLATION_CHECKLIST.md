# Simple Security Installation Checklist

Use this checklist to track your installation progress. Check off each item as you complete it.

**Date Started:** ________________  
**Completed By:** ________________  
**Environment Name:** ________________  
**Environment URL:** ________________

---

## Pre-Installation

- [ ] Power Platform CLI (pac) installed
- [ ] Node.js 18+ installed (if building from source)
- [ ] System Administrator access to Power Platform environment confirmed
- [ ] Azure AD admin access confirmed
- [ ] Solution file received from vendor

---

## Azure App Registration Setup

- [ ] Signed into Azure Portal (portal.azure.com)
- [ ] Created new App Registration: "Simple Security Connector"
- [ ] Recorded Application (client) ID: `_______________________________`
- [ ] Recorded Directory (tenant) ID: `_______________________________`
- [ ] Created client secret
- [ ] Recorded client secret value: `_______________________________`
- [ ] Recorded client secret expiration date: `_______________________________`
- [ ] Added API permission: Dynamics CRM → user_impersonation
- [ ] Granted admin consent for API permissions
- [ ] Configured authentication settings (Access tokens + ID tokens enabled)

---

## Power Platform CLI Authentication

- [ ] Opened PowerShell/Terminal
- [ ] Ran: `pac auth create --environment https://[your-org].crm.dynamics.com`
- [ ] Successfully authenticated
- [ ] Verified authentication with: `pac auth list`

---

## Solution Import

- [ ] Navigated to Power Apps Maker Portal (make.powerapps.com)
- [ ] Selected correct environment
- [ ] Clicked Solutions → Import solution
- [ ] Selected SimpleSecurity_managed.zip file
- [ ] Clicked Next and Import
- [ ] Waited for import to complete
- [ ] Verified custom API `ope_simplesecurityaction` exists in solution
- [ ] Verified Canvas app "Simple Security" exists in solution

---

## Custom Connector Creation

- [ ] Navigated to Custom connectors
- [ ] Created new connector from blank
- [ ] Set Name: `SimpleSecurityAction`
- [ ] Set Host: `[your-org].api.crm.dynamics.com`
- [ ] Set Base URL: `/`
- [ ] Configured Security:
  - [ ] Set Authentication type: OAuth 2.0
  - [ ] Set Identity Provider: Azure Active Directory
  - [ ] Entered Client ID
  - [ ] Entered Client secret
  - [ ] Set Resource URL: `https://[your-org].api.crm.dynamics.com`
- [ ] Added action definition:
  - [ ] Operation ID: `SimpleSecurityAction`
  - [ ] Verb: POST
  - [ ] URL configured
  - [ ] Request body sample imported
  - [ ] Response sample imported
- [ ] Clicked Create connector
- [ ] Copied Redirect URL from Security tab: `_______________________________`
- [ ] Added Redirect URL to Azure App Registration (Authentication → Web platform)

---

## Connection Creation

- [ ] Navigated to Connections
- [ ] Clicked + New connection
- [ ] Selected SimpleSecurityAction connector
- [ ] Clicked Create
- [ ] Signed in and authorized
- [ ] Verified connection status shows "Connected"
- [ ] Recorded connection name (for reference): `_______________________________`

---

## App Configuration

- [ ] Opened Simple Security solution
- [ ] Located Simple Security canvas app
- [ ] Verified connection reference is mapped to SimpleSecurityAction connection
- [ ] Published app (if required)

---

## User Access & Security

- [ ] Created/identified security role for app users: `_______________________________`
- [ ] Verified security role includes:
  - [ ] Read access to: systemuser, team, role, fieldsecurityprofile, privilege
  - [ ] Appropriate permissions for role/profile assignments
- [ ] Shared app with users/security groups:
  - [ ] User/Group 1: `_______________________________`
  - [ ] User/Group 2: `_______________________________`
  - [ ] User/Group 3: `_______________________________`
- [ ] Assigned security roles to shared users

---

## Testing & Verification

- [ ] Signed in as System Administrator
  - [ ] App loads successfully
  - [ ] Can view users
  - [ ] Can view teams
  - [ ] Can view security roles
  - [ ] Can view field security profiles
  - [ ] Can assign a role to a user (if applicable)
  - [ ] Can remove a role from a user (if applicable)

- [ ] Signed in as test end user
  - [ ] App loads successfully
  - [ ] Can view data appropriate to permissions
  - [ ] No unexpected errors in browser console (F12)

- [ ] Reviewed logs/errors (if any): `_______________________________`

---

## Documentation & Handoff

- [ ] Documented configuration values in secure location:
  - [ ] Azure App Registration Client ID
  - [ ] Azure App Registration Tenant ID
  - [ ] Client Secret expiration date
  - [ ] Environment URL
  - [ ] Custom Connector Name
  - [ ] Connection Name
- [ ] Notified users that app is available
- [ ] Provided app URL or instructions to access: `_______________________________`
- [ ] Scheduled client secret renewal reminder (before expiration)

---

## Post-Installation Tasks

- [ ] Set reminder for Azure client secret renewal (Date: `_____________`)
- [ ] Filed installation documentation in appropriate location
- [ ] Communicated vendor contact information to support team
- [ ] Scheduled follow-up training session (if applicable)

---

## Notes / Issues Encountered

```
_________________________________________________________________________
_________________________________________________________________________
_________________________________________________________________________
_________________________________________________________________________
_________________________________________________________________________
```

---

## Sign-Off

**Installed By:** _______________________________  
**Date:** _______________________________  
**Signature:** _______________________________  

**Verified By:** _______________________________  
**Date:** _______________________________  
**Signature:** _______________________________  

---

**Installation Status:** ✅ Complete / ⚠️ Incomplete / ❌ Failed

**Next Steps:**
- [ ] _____________________________________________________________________
- [ ] _____________________________________________________________________
- [ ] _____________________________________________________________________

---

*For detailed installation instructions, refer to INSTALLATION_GUIDE.md*  
*For quick reference, see QUICK_START_GUIDE.md*
