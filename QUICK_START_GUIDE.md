# Simple Security - Quick Start Guide

A condensed installation guide for experienced Power Platform administrators.

---

## Prerequisites Checklist
- [ ] Power Platform CLI installed (`pac`)
- [ ] System Admin access to target environment
- [ ] Azure AD admin access
- [ ] Solution file (`SimpleSecurity_managed.zip`)

---

## Installation Steps (Summary)

### 1. Azure App Registration (5 mins)
```
1. Create new App Registration: "Simple Security Connector"
2. Record: Client ID, Tenant ID
3. Create client secret → Record secret value
4. API Permissions: Add "Dynamics CRM" → "user_impersonation" → Grant admin consent
5. Authentication: Enable "Access tokens" and "ID tokens"
6. Redirect URI: Add after connector creation (Step 4)
```

### 2. Authenticate PAC CLI (2 mins)
```powershell
pac auth create --environment https://[your-org].crm.dynamics.com
pac auth list  # Verify
```

### 3. Import Solution (5 mins)
```
1. make.powerapps.com → Solutions → Import solution
2. Upload SimpleSecurity_managed.zip
3. Import (skip connection references for now)
4. Verify: Custom API "ope_simplesecurityaction" exists
```

### 4. Create Custom Connector (10 mins)
```
1. Custom connectors → New → Create from blank
2. General:
   - Name: SimpleSecurityAction
   - Host: [your-org].api.crm.dynamics.com
   - Base URL: /

3. Security:
   - OAuth 2.0 / Azure AD
   - Client ID: [from Step 1]
   - Client secret: [from Step 1]
   - Resource URL: https://[your-org].api.crm.dynamics.com

4. Definition → New action:
   - Operation ID: SimpleSecurityAction
   - Verb: POST
   - URL: https://[your-org].api.crm.dynamics.com/api/data/v9.2/ope_simplesecurityaction
   - Request body:
     {
       "ope_Operation": "associate",
       "ope_PrincipalType": "systemuser",
       "ope_PrincipalId": "00000000-0000-0000-0000-000000000000",
       "ope_RelatedType": "role",
       "ope_RelatedId": "00000000-0000-0000-0000-000000000000"
     }
   - Response: { "ope_Success": true }

5. Create connector
6. Copy Redirect URL → Add to Azure App Registration Authentication
```

### 5. Create Connection (2 mins)
```
1. Connections → New connection → SimpleSecurityAction
2. Sign in and authorize
3. Verify: Status shows "Connected"
```

### 6. Configure App (3 mins)
```
1. Open Simple Security solution → Canvas app
2. Map connection reference to SimpleSecurityAction connection
3. Publish if needed
```

### 7. Share & Test (5 mins)
```
1. Launch app and verify it loads successfully
2. Apps → Simple Security → Share
3. Add users/groups + assign security roles
4. Test: Sign in as user and verify functionality
```

---

## Critical Configuration Values

**Azure App Registration:**
- Client ID: `____________________`
- Tenant ID: `____________________`
- Client Secret: `____________________` (expires: `______`)

**Environment:**
- Org URL: `https://____________.crm.dynamics.com`

**Connector:**
- Name: `SimpleSecurityAction`
- Redirect URI: `____________________`

---

## Quick Troubleshooting

| Issue | Fix |
|-------|-----|
| "Connection failed" | Check Azure permissions & admin consent granted |
| "Access denied" | Verify user security roles & custom API permissions |
| "Redirect URI mismatch" | Sync connector redirect URL with Azure App Registration |

---

## Multi-Environment Deployment

**Source → Target:**
1. Export solution as Managed
2. Create connector in target (use target org URL)
3. Create connection in target
4. Import solution → Map connection reference
5. Test and validate access

---

**Total Time: ~30-40 minutes**

For detailed instructions, see [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md).
