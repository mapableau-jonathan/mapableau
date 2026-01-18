# Quick Sync to Microsoft 365

## Prerequisites

You need Azure AD app credentials. If you already have `AZURE_AD_*` variables set for authentication, you can use those, but you may need additional API permissions.

## Quick Setup

### 1. Use Existing Azure AD Credentials (If Available)

If you already have Azure AD set up for authentication:

```powershell
# These should already be set if Microsoft auth is configured
$env:AZURE_AD_CLIENT_ID="your-existing-client-id"
$env:AZURE_AD_CLIENT_SECRET="your-existing-secret"
$env:AZURE_AD_TENANT_ID="your-existing-tenant-id"
```

**Note:** You'll need to add additional API permissions for M365 sync (see below).

### 2. Add Required API Permissions

1. Go to [Azure Portal](https://portal.azure.com) → Your App Registration
2. **API permissions** → **Add a permission** → **Microsoft Graph**
3. Select **Application permissions** (not Delegated)
4. Add:
   - `Files.ReadWrite.All` (OneDrive/SharePoint)
   - `Mail.Send` (Email)
   - `ChannelMessage.Send` (Teams)
   - `Sites.ReadWrite.All` (SharePoint)
5. Click **Grant admin consent**

### 3. Sync Commands

```powershell
# Upload to OneDrive
pnpm tsx scripts/sync-to-m365.ts docs/ENDPOINT_STRATEGY_SUMMARY.md "onedrive:/Documents"

# Upload to SharePoint (replace with your site name)
pnpm tsx scripts/sync-to-m365.ts docs/ENDPOINT_STRATEGY_SUMMARY.md "sharepoint:your-site-name/Documents"

# Send via Email
pnpm tsx scripts/sync-to-m365.ts docs/ENDPOINT_STRATEGY_SUMMARY.md "email:user@example.com"

# Post to Teams (requires team and channel IDs)
pnpm tsx scripts/sync-to-m365.ts docs/ENDPOINT_STRATEGY_SUMMARY.md "teams:team-id/channel-id"
```

## Finding Team/Channel IDs

Use [Graph Explorer](https://developer.microsoft.com/graph/graph-explorer):

1. Sign in
2. `GET https://graph.microsoft.com/v1.0/me/joinedTeams` → Get team ID
3. `GET https://graph.microsoft.com/v1.0/teams/{team-id}/channels` → Get channel ID

## Troubleshooting

**401/403 Errors:**
- Verify API permissions are granted
- Check admin consent was given
- Ensure using Application permissions (not Delegated)

**404 Errors:**
- OneDrive: Check folder path
- SharePoint: Verify site name matches exactly
- Teams: Verify team/channel IDs

See `scripts/M365_SYNC_README.md` for detailed setup.
