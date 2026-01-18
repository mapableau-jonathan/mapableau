# Setting Up Microsoft 365 API Permissions - Step by Step

This guide walks you through adding the required API permissions for M365 sync.

## Prerequisites

- Access to [Azure Portal](https://portal.azure.com)
- Admin rights (for granting consent)
- Your Azure AD app registration (or create a new one)

## Step 1: Navigate to Your App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Sign in with your admin account
3. In the search bar, type: **"App registrations"**
4. Click on **App registrations** from the results
5. Find your app (or the one you want to use for M365 sync)
   - If you don't have one, click **New registration** and create it
   - Name it: "MapAble M365 Sync" (or any name)
   - Select account types (usually "Accounts in this organizational directory only")
   - Click **Register**

## Step 2: Note Your App Details

From the app's **Overview** page, copy:
- **Application (client) ID** → This is your `MS_CLIENT_ID` or `AZURE_AD_CLIENT_ID`
- **Directory (tenant) ID** → This is your `MS_TENANT_ID` or `AZURE_AD_TENANT_ID`

Save these somewhere safe!

## Step 3: Create Client Secret (If Needed)

If you don't have a client secret yet:

1. In the left sidebar, click **Certificates & secrets**
2. Under **Client secrets**, click **+ New client secret**
3. Add a description: "M365 Sync Secret"
4. Choose expiration (24 months recommended)
5. Click **Add**
6. **IMMEDIATELY copy the secret value** (you won't see it again!)
   - This is your `MS_CLIENT_SECRET` or `AZURE_AD_CLIENT_SECRET`
7. Save it securely (password manager, etc.)

⚠️ **Important**: If you lose this, you'll need to create a new one.

## Step 4: Add API Permissions

1. In the left sidebar, click **API permissions**
2. You'll see a list of existing permissions (if any)
3. Click **+ Add a permission**
4. In the **Request API permissions** panel:
   - Select **Microsoft Graph**
   - Click **Application permissions** (NOT Delegated permissions)
     - Application permissions = app-only access (what we need)
     - Delegated permissions = user context (not suitable for scripts)

## Step 5: Select Required Permissions

In the **Select permissions** section, search for and add each of these:

### For OneDrive & SharePoint File Operations:
1. Type: **Files.ReadWrite.All**
   - Description: "Read and write all files that the app can access"
   - Click the checkbox
   - Click **Add permissions**

### For Email (Outlook):
2. Type: **Mail.Send**
   - Description: "Send mail as any user"
   - Click the checkbox
   - Click **Add permissions**

### For Teams:
3. Type: **ChannelMessage.Send**
   - Description: "Send channel messages"
   - Click the checkbox
   - Click **Add permissions**

### For SharePoint Sites:
4. Type: **Sites.ReadWrite.All**
   - Description: "Read and write items in all site collections"
   - Click the checkbox
   - Click **Add permissions**

After adding all permissions, click **Add permissions** button at the bottom.

## Step 6: Grant Admin Consent

⚠️ **This step requires admin privileges!**

1. Back on the **API permissions** page, you'll see all the permissions you added
2. Look for a yellow warning banner that says:
   - "Grant admin consent for [Your Organization]"
   - Or: "Admin consent required"
3. Click **Grant admin consent for [Your Organization]**
4. Confirm the action in the popup
5. Wait a few seconds for the status to update
6. All permissions should now show a green checkmark ✅ with "Granted for [Your Organization]"

**If you don't have admin rights:**
- Ask your Azure AD administrator to grant consent
- Or use a different account with admin privileges

## Step 7: Verify Permissions

You should now see:

| Permission | Type | Status |
|------------|------|--------|
| Files.ReadWrite.All | Application | ✅ Granted for [Org] |
| Mail.Send | Application | ✅ Granted for [Org] |
| ChannelMessage.Send | Application | ✅ Granted for [Org] |
| Sites.ReadWrite.All | Application | ✅ Granted for [Org] |

All should show:
- **Type**: Application
- **Status**: ✅ Granted for [Your Organization]

## Step 8: Set Environment Variables

Now set these in your environment:

```powershell
# Option 1: PowerShell (temporary, for this session)
$env:MS_CLIENT_ID="your-application-client-id"
$env:MS_CLIENT_SECRET="your-client-secret-value"
$env:MS_TENANT_ID="your-tenant-id"

# Or use existing AZURE_AD_* variables if you prefer
$env:AZURE_AD_CLIENT_ID="your-application-client-id"
$env:AZURE_AD_CLIENT_SECRET="your-client-secret-value"
$env:AZURE_AD_TENANT_ID="your-tenant-id"
```

Or add to your `.env` file (don't commit!):

```env
MS_CLIENT_ID=your-application-client-id
MS_CLIENT_SECRET=your-client-secret-value
MS_TENANT_ID=your-tenant-id
```

## Step 9: Test the Setup

Run the verification script:

```powershell
pnpm tsx scripts/verify-m365-permissions.ts
```

Or test with a simple sync:

```powershell
# Test OneDrive upload
pnpm tsx scripts/sync-to-m365.ts docs/ENDPOINT_STRATEGY_SUMMARY.md "onedrive:/Documents"
```

## Troubleshooting

### "Insufficient privileges to complete the operation"
- You need admin rights to grant consent
- Contact your Azure AD administrator

### "AADSTS70011: The provided value for the input parameter 'scope' is not valid"
- Make sure you selected **Application permissions**, not Delegated
- Re-add the permissions with the correct type

### "403 Forbidden" when running sync
- Verify admin consent was granted (green checkmarks)
- Check that permissions are **Application** type, not Delegated
- Wait a few minutes after granting consent (propagation delay)

### "401 Unauthorized"
- Verify client ID, secret, and tenant ID are correct
- Check that the client secret hasn't expired
- Make sure you're using Application permissions (not Delegated)

### Permissions show "Not granted"
- Click **Grant admin consent** button
- Ensure you have admin rights
- Wait a few seconds and refresh the page

## Alternative: Using Existing App Registration

If you already have an Azure AD app for authentication:

1. Go to that app's **API permissions** page
2. Add the same permissions listed above
3. Grant admin consent
4. Use your existing `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, and `AZURE_AD_TENANT_ID`

The sync script will automatically detect these variables.

## Security Best Practices

1. **Rotate secrets regularly** - Set expiration and create new secrets before old ones expire
2. **Use least privilege** - Only grant permissions you actually need
3. **Monitor usage** - Check Azure AD sign-in logs for unusual activity
4. **Store secrets securely** - Use Azure Key Vault for production
5. **Never commit secrets** - Add `.env` to `.gitignore`

## Next Steps

Once permissions are set up:
- See `QUICK_M365_SYNC.md` for usage examples
- See `M365_SYNC_README.md` for detailed documentation
- Test with a small file first before syncing large documents
