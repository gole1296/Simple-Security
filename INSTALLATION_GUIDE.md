# Simple Security - Client Installation Guide

## Overview

Simple Security is a comprehensive security management application for Microsoft Dataverse that simplifies user, team, and role administration. This guide provides step-by-step instructions for installing and configuring the application in your Power Platform environment.

---

## Prerequisites

Before beginning the installation, ensure you have the following:

### Required Tools
- **Power Platform CLI (pac)** - [Download here](https://aka.ms/PowerAppsCLI)
- **Node.js** (version 18 or later) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)

### Required Access and Permissions
- **System Administrator** or **System Customizer** role in the target Power Platform environment
- **Azure Active Directory** administrative access (for app registration)
- Access to create Custom Connectors in Power Platform
- Dataverse environment with required capacity and permissions

---

## Installation Steps

### Step 1: Azure App Registration Setup

The Simple Security application uses a custom connector with OAuth 2.0 authentication to access Dataverse APIs.

1. **Sign in to Azure Portal**
   - Navigate to [https://portal.azure.com](https://portal.azure.com)
   - Use credentials with permissions to create app registrations

2. **Create a New App Registration**
   - Go to **Azure Active Directory** > **App registrations** > **New registration**
   - Enter the following details:
     - **Name**: `Simple Security Connector`
     - **Supported account types**: Accounts in this organizational directory only (Single tenant)
     - **Redirect URI**: Leave blank for now (will be added later)
   - Click **Register**

3. **Record Important Values**
   - Copy and save the following values (you'll need them later):
     - **Application (client) ID**
     - **Directory (tenant) ID**

4. **Create a Client Secret**
   - Go to **Certificates & secrets** > **Client secrets** > **New client secret**
   - Enter a description: `Simple Security Connector Secret`
   - Choose an expiration period (recommended: 24 months)
   - Click **Add**
   - **IMPORTANT**: Copy the secret **Value** immediately (it won't be shown again)

5. **Configure API Permissions**
   - Go to **API permissions** > **Add a permission**
   - Select **APIs my organization uses**
   - Search for and select **Dynamics CRM** (or **Common Data Service**)
   - Select **Delegated permissions**
   - Check **user_impersonation**
   - Click **Add permissions**
   - Click **Grant admin consent for [Your Organization]** and confirm

6. **Configure Authentication** (Redirect URI will be added after connector creation)
   - Go to **Authentication** > **Add a platform** > **Web**
   - Leave the redirect URI blank for now
   - Under **Implicit grant and hybrid flows**, check:
     - ✅ **Access tokens**
     - ✅ **ID tokens**
   - Click **Configure**

---

### Step 2: Install and Configure Power Platform CLI

1. **Install Power Platform CLI**
   ```powershell
   # Download and install from: https://aka.ms/PowerAppsCLI
   # Or use winget:
   winget install Microsoft.PowerPlatformCLI
   ```

2. **Verify Installation**
   ```powershell
   pac --version
   ```

3. **Authenticate to Your Environment**
   ```powershell
   pac auth create --environment https://[your-org].crm.dynamics.com
   ```
   - Replace `[your-org]` with your organization name
   - A browser window will open for authentication
   - Sign in with your System Administrator credentials

4. **Verify Authentication**
   ```powershell
   pac auth list
   ```
   - Confirm your environment is shown with an asterisk (*) indicating it's active

---

### Step 3: Import the Simple Security Solution

1. **Obtain the Solution File**
   - Contact your vendor to receive the `SimpleSecurity_managed.zip` solution file
   - Save it to a known location on your computer

2. **Import the Solution**
   - Navigate to [Power Apps Maker Portal](https://make.powerapps.com)
   - Select your target environment from the top-right dropdown
   - Go to **Solutions** in the left navigation
   - Click **Import solution**
   - Click **Browse** and select the `SimpleSecurity_managed.zip` file
   - Click **Next**

3. **Configure Solution Settings**
   - Review the solution details
   - If prompted for connection references, skip for now (we'll configure them after creating the connector)
   - Click **Import**
   - Wait for the import to complete (this may take several minutes)

4. **Verify Solution Import**
   - Once imported, open the **Simple Security** solution
   - Verify the following components are present:
     - Custom API: `ope_simplesecurityaction`
     - Canvas App: `Simple Security`
     - Any additional tables or components

---

### Step 4: Create the Custom Connector

The custom connector enables the app to perform security operations in the user's context.

1. **Navigate to Custom Connectors**
   - In [Power Apps Maker Portal](https://make.powerapps.com)
   - Go to **Dataverse** > **Custom connectors** (or **Data** > **Custom connectors**)
   - Click **+ New custom connector** > **Create from blank**

2. **General Information**
   - **Connector name**: `SimpleSecurityAction`
   - **Description**: `Connector for Simple Security app to perform role and profile assignments`
   - **Host**: `[your-org].api.crm.dynamics.com`
     - Replace `[your-org]` with your organization name (e.g., `contoso.api.crm.dynamics.com`)
     - **Do not include** `https://` or any paths
   - **Base URL**: `/`
   - Click **Security** to continue

3. **Configure Security (OAuth 2.0)**
   - **Authentication type**: OAuth 2.0
   - **Identity Provider**: Azure Active Directory
   - **Client ID**: Paste the Application (client) ID from Step 1
   - **Client secret**: Paste the client secret value from Step 1
   - **Resource URL**: `https://[your-org].api.crm.dynamics.com`
     - Replace `[your-org]` with your organization name
   - Click **Definition** to continue

4. **Add the Action Definition**
   - Click **+ New action**
   - **General**:
     - **Summary**: Simple Security Action
     - **Description**: Execute security operations for Simple Security app
     - **Operation ID**: `SimpleSecurityAction`
   - **Request**:
     - Click **+ Import from sample**
     - **Verb**: POST
     - **URL**: `https://[your-org].api.crm.dynamics.com/api/data/v9.2/ope_simplesecurityaction`
     - **Headers**: Leave empty
     - **Body**:
       ```json
       {
         "ope_Operation": "associate",
         "ope_PrincipalType": "systemuser",
         "ope_PrincipalId": "00000000-0000-0000-0000-000000000000",
         "ope_RelatedType": "role",
         "ope_RelatedId": "00000000-0000-0000-0000-000000000000"
       }
       ```
     - Click **Import**
   - **Response**:
     - Click **+ Add default response**
     - **Body**:
       ```json
       {
         "ope_Success": true
       }
       ```
     - Click **Import**

5. **Save the Connector**
   - Click **Create connector** (top-right)
   - Wait for the connector to be created

6. **Update Azure App Registration with Redirect URI**
   - After saving, go to the **Security** tab of your connector
   - Copy the **Redirect URL** shown (it will look like: `https://global.consent.azure-apim.net/redirect/simplesecurityaction-[guid]`)
   - Return to **Azure Portal** > **App registrations** > **Simple Security Connector**
   - Go to **Authentication** > **Web platform**
   - Click **Add URI** and paste the redirect URL
   - Click **Save**

---

### Step 5: Create a Connection

1. **Create a New Connection**
   - In Power Apps Maker Portal, go to **Connections** (under **Dataverse** or **Data**)
   - Click **+ New connection**
   - Find and select **SimpleSecurityAction** (the connector you just created)
   - Click **Create**
   - You'll be redirected to sign in and authorize the connection
   - Sign in with your credentials and grant consent

2. **Verify the Connection**
   - After authorization, you should see the connection listed as **Connected**
   - Note the connection name (you may need this for troubleshooting)

---

### Step 6: Configure the Simple Security App

1. **Link the Connection to the App**
   - Open the **Simple Security** solution in Power Apps Maker Portal
   - Find the **Simple Security** canvas app
   - Click on the app name to view details
   - If there's a **Connection References** section, make sure it's mapped to the `SimpleSecurityAction` connection you created
   - If prompted, select the connection and save

2. **Publish the App** (if needed)
   - If the app requires publishing after connection mapping, click **Publish**
   - Wait for publishing to complete

---

### Step 7: Configure User Access

1. **Assign Security Roles**
   - Users of Simple Security must have appropriate Dataverse security roles
   - At minimum, users need:
     - Read access to: `systemuser`, `team`, `role`, `fieldsecurityprofile`, `privilege`
     - Write access to: Role associations, profile assignments (via the custom API)
   - Recommended: Create a custom security role for Simple Security users or assign **System Administrator** for full access

2. **Share the App**
   - In Power Apps Maker Portal, go to **Apps**
   - Select **Simple Security** > **Share**
   - Add users or security groups
   - Assign the appropriate security role
   - Click **Share**

3. **Notify Users**
   - Inform users that the app is available
   - Provide them with the app URL or instruct them to find it in their Power Apps home

---

## Verification and Testing

### Test the Application

1. **Sign in as a Test User**
   - Open the Simple Security app
   - Verify the app loads successfully

2. **Test Core Functionality**
   - **View Users**: Verify you can see system users
   - **View Teams**: Verify you can see teams
   - **View Security Roles**: Verify security roles are listed
   - **View Field Security Profiles**: Verify profiles are displayed
   - **Assign a Role** (if you have permissions):
     - Select a user or team
     - Assign a security role
     - Verify the assignment completes without errors

3. **Review Logs** (if issues occur)
   - Check the browser console for JavaScript errors (F12 > Console)
   - Verify the custom connector is functioning by checking connection history

---

## Troubleshooting

### Common Issues

#### Issue: "Failed to connect to SimpleSecurityAction"
- **Solution**: 
  - Verify the custom connector is created correctly
  - Check that the connection is established and authorized
  - Ensure the Azure App Registration has the correct API permissions and admin consent

#### Issue: "Access denied" when performing operations
- **Solution**: 
  - Ensure the user has appropriate Dataverse security roles
  - Verify the custom API `ope_simplesecurityaction` is working (check in Dataverse Advanced Settings)
  - Check that the user has permissions for role/profile assignments

#### Issue: "Redirect URI mismatch" when creating connection
- **Solution**: 
  - Verify the redirect URI in Azure App Registration matches the one shown in the connector's Security tab
  - Ensure there are no extra spaces or characters

#### Issue: App doesn't load or shows errors
- **Solution**:
  - Clear browser cache and cookies
  - Try a different browser or incognito/private mode
  - Check browser console for errors
  - Verify the solution was imported successfully

---

## Deployment to Additional Environments

To deploy Simple Security to another environment (e.g., from Dev to Production):

1. **Export the Solution** (from source environment)
   - Go to **Solutions** > **Simple Security**
   - Click **Export**
   - Choose **Managed** (recommended for production)
   - Click **Export** and download the file

2. **Import to Target Environment**
   - Follow **Step 3** (Import Solution) in the target environment

3. **Create Custom Connector** (in target environment)
   - Follow **Step 4** using the target environment's organization URL
   - Use the same Azure App Registration or create a new one (recommended for production)

4. **Create Connection**
   - Follow **Step 5** in the target environment

5. **Map Connection References**
   - When importing, map connection references to the target environment's connections

6. **Test and Verify**
   - Follow the **Verification and Testing** steps in the target environment

---

## Support and Maintenance

### Getting Help
- **Vendor Support**: Contact your Simple Security vendor for:
  - Application bugs or feature requests
  - Upgrade assistance

- **Power Platform Support**: Contact Microsoft support for:
  - Power Platform environment issues
  - Dataverse connectivity problems
  - Custom connector technical issues

### Maintenance Tasks
- **Azure App Secret Renewal**: Client secrets expire; update them before expiration
- **Solution Updates**: Check with your vendor for application updates and new features
- **User Management**: Regularly review user access and security role assignments

---

## Appendix: Quick Reference

### Key URLs
- Power Apps Maker Portal: [https://make.powerapps.com](https://make.powerapps.com)
- Azure Portal: [https://portal.azure.com](https://portal.azure.com)
- Power Platform CLI: [https://aka.ms/PowerAppsCLI](https://aka.ms/PowerAppsCLI)

### Important Configuration Values
Document these values during setup for future reference:

| Item | Value | Location |
|------|-------|----------|
| Azure App Registration Client ID | `[your-client-id]` | Azure Portal > App registrations |
| Azure App Registration Tenant ID | `[your-tenant-id]` | Azure Portal > App registrations |
| Environment URL | `https://[your-org].crm.dynamics.com` | Power Platform Admin Center |
| Custom Connector Name | `SimpleSecurityAction` | Power Apps Maker Portal > Custom connectors |
| Connection Name | `[connection-name]` | Power Apps Maker Portal > Connections |

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | [Date] | Initial release |

---

**End of Installation Guide**

For additional assistance, please contact your Simple Security vendor or Microsoft Power Platform support.
