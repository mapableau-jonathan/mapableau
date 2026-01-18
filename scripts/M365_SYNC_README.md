# Microsoft 365 / Exchange Sync Guide

Sync markdown documentation to Microsoft 365 services (OneDrive, SharePoint, Outlook, Teams).

## Setup

### 1. Register Azure AD Application

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Name it: "MapAble Docs Sync" (or any name)
5. Select supported account types
6. Click **Register**
7. Note down:
   - **Application (client) ID** → `MS_CLIENT_ID`
   - **Directory (tenant) ID** → `MS_TENANT_ID`

### 2. Create Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add description and expiration
4. Click **Add**
5. **Copy the secret value immediately** (you won't see it again) → `MS_CLIENT_SECRET`

### 3. Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Application permissions** (not Delegated)
5. Add the following permissions:
   - `Files.ReadWrite.All` (for OneDrive/SharePoint)
   - `Mail.Send` (for Outlook email)
   - `ChannelMessage.Send` (for Teams)
   - `Sites.ReadWrite.All` (for SharePoint)
6. Click **Grant admin consent** (requires admin)

### 4. Set Environment Variables

```powershell
# Option 1: Set in PowerShell session
$env:MS_CLIENT_ID="your-client-id"
$env:MS_CLIENT_SECRET="your-client-secret"
$env:MS_TENANT_ID="your-tenant-id"

# Option 2: Add to .env file (don't commit!)
MS_CLIENT_ID=your-client-id
MS_CLIENT_SECRET=your-client-secret
MS_TENANT_ID=your-tenant-id
```

## Usage

### Upload to OneDrive

```powershell
pnpm tsx scripts/sync-to-m365.ts docs/ENDPOINT_STRATEGY_SUMMARY.md "onedrive:/Documents"
```

- Creates folders if they don't exist
- Uploads markdown file to specified path
- Returns shareable link

### Upload to SharePoint

```powershell
pnpm tsx scripts/sync-to-m365.ts docs/ENDPOINT_STRATEGY_SUMMARY.md "sharepoint:my-site-name/Documents/Project"
```

- Site name should match your SharePoint site
- Creates folders if needed
- Returns document link

### Send via Email (Outlook)

```powershell
pnpm tsx scripts/sync-to-m365.ts docs/ENDPOINT_STRATEGY_SUMMARY.md "email:user@example.com"
```

- Converts markdown to HTML
- Sends via your Outlook account
- Subject: "Documentation: [filename]"

### Post to Teams Channel

```powershell
pnpm tsx scripts/sync-to-m365.ts docs/ENDPOINT_STRATEGY_SUMMARY.md "teams:team-id/channel-id"
```

- Converts markdown to HTML
- Posts as message in Teams channel
- To find team/channel IDs, use Graph Explorer or Teams API

## Finding Team and Channel IDs

### Using Graph Explorer

1. Go to [Graph Explorer](https://developer.microsoft.com/graph/graph-explorer)
2. Sign in and grant permissions
3. Run: `GET https://graph.microsoft.com/v1.0/me/joinedTeams`
4. Find your team ID
5. Run: `GET https://graph.microsoft.com/v1.0/teams/{team-id}/channels`
6. Find your channel ID

### Using PowerShell

```powershell
# Install Microsoft.Graph module
Install-Module Microsoft.Graph

# Connect
Connect-MgGraph -Scopes "Team.ReadBasic.All"

# List teams
Get-MgTeam | Select-Object Id, DisplayName

# List channels
Get-MgTeamChannel -TeamId "your-team-id" | Select-Object Id, DisplayName
```

## Troubleshooting

### 401 Unauthorized
- Check that credentials are correct
- Verify app registration exists
- Check token expiration

### 403 Forbidden
- Verify API permissions are granted
- Check that admin consent was given
- Ensure correct permission type (Application vs Delegated)

### 404 Not Found
- **OneDrive**: Check folder path exists or is accessible
- **SharePoint**: Verify site name is correct
- **Teams**: Verify team and channel IDs

### Rate Limiting (429)
- Script automatically retries with exponential backoff
- Wait a few minutes and try again

## Advanced: Using Direct Access Token

For testing or if you already have a token:

```powershell
$env:MS_ACCESS_TOKEN="your-token-here"
pnpm tsx scripts/sync-to-m365.ts docs/file.md "onedrive:/"
```

## Security Notes

- **Never commit** `.env` files with secrets
- Client secrets expire - rotate regularly
- Use least privilege permissions
- Consider using Azure Key Vault for production

## Supported Formats

- Markdown files (`.md`)
- Automatically converts to HTML for email/Teams
- Preserves formatting (headers, lists, code blocks, etc.)
