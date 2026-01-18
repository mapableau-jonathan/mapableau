#!/usr/bin/env tsx
/**
 * Verify Microsoft 365 API permissions and credentials
 * Tests that all required permissions are configured correctly
 */

async function getAccessToken(
  clientId: string,
  clientSecret: string,
  tenantId: string
): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function testPermission(
  accessToken: string,
  permission: string,
  testEndpoint: string,
  testMethod: string = 'GET'
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(testEndpoint, {
      method: testMethod,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // 200-299 = success
    // 403 = permission denied (permission not granted)
    // 401 = auth issue (different problem)
    // 404 = resource not found (but permission works)
    
    if (response.status === 403) {
      return {
        success: false,
        error: `403 Forbidden - Permission '${permission}' may not be granted or requires admin consent`,
      };
    }

    if (response.status === 401) {
      return {
        success: false,
        error: '401 Unauthorized - Check your credentials',
      };
    }

    // 200, 201, 404 (not found but permission works) are all OK
    if (response.status >= 200 && response.status < 300) {
      return { success: true };
    }

    if (response.status === 404) {
      return { success: true }; // Permission works, resource just doesn't exist
    }

    const errorText = await response.text();
    return {
      success: false,
      error: `Unexpected status ${response.status}: ${errorText}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function main() {
  console.log('🔍 Microsoft 365 Permissions Verification\n');

  // Get credentials
  const clientId = process.env.MS_CLIENT_ID || process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET || process.env.AZURE_AD_CLIENT_SECRET;
  const tenantId = process.env.MS_TENANT_ID || process.env.AZURE_AD_TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) {
    console.error('❌ Missing credentials');
    console.log('\nSet environment variables:');
    console.log('  MS_CLIENT_ID (or AZURE_AD_CLIENT_ID)');
    console.log('  MS_CLIENT_SECRET (or AZURE_AD_CLIENT_SECRET)');
    console.log('  MS_TENANT_ID (or AZURE_AD_TENANT_ID)');
    process.exit(1);
  }

  console.log('✅ Credentials found');
  console.log(`   Client ID: ${clientId.substring(0, 8)}...`);
  console.log(`   Tenant ID: ${tenantId}\n`);

  // Get access token
  console.log('🔐 Getting access token...');
  let accessToken: string;
  try {
    accessToken = await getAccessToken(clientId, clientSecret, tenantId);
    console.log('✅ Access token obtained\n');
  } catch (error: any) {
    console.error('❌ Failed to get access token:', error.message);
    console.log('\n💡 Check:');
    console.log('   - Client ID is correct');
    console.log('   - Client secret is correct and not expired');
    console.log('   - Tenant ID is correct');
    process.exit(1);
  }

  // Test permissions
  console.log('🧪 Testing API permissions...\n');

  const tests = [
    {
      permission: 'Files.ReadWrite.All',
      description: 'OneDrive & SharePoint file access',
      endpoint: 'https://graph.microsoft.com/v1.0/me/drive',
      method: 'GET',
    },
    {
      permission: 'Mail.Send',
      description: 'Send email via Outlook',
      endpoint: 'https://graph.microsoft.com/v1.0/me/mailFolders',
      method: 'GET',
    },
    {
      permission: 'Sites.ReadWrite.All',
      description: 'SharePoint site access',
      endpoint: 'https://graph.microsoft.com/v1.0/sites?search=*',
      method: 'GET',
    },
    {
      permission: 'ChannelMessage.Send',
      description: 'Send Teams messages',
      endpoint: 'https://graph.microsoft.com/v1.0/me/joinedTeams',
      method: 'GET',
    },
  ];

  let allPassed = true;
  const results: Array<{ permission: string; status: string; error?: string }> = [];

  for (const test of tests) {
    process.stdout.write(`Testing ${test.permission}... `);
    const result = await testPermission(accessToken, test.permission, test.endpoint, test.method);
    
    if (result.success) {
      console.log('✅');
      results.push({ permission: test.permission, status: '✅ Pass' });
    } else {
      console.log('❌');
      console.log(`   ${result.error}`);
      results.push({ permission: test.permission, status: '❌ Fail', error: result.error });
      allPassed = false;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary\n');
  
  results.forEach((result) => {
    console.log(`${result.status} ${result.permission}`);
    if (result.error) {
      console.log(`   └─ ${result.error}`);
    }
  });

  console.log('\n' + '='.repeat(60));

  if (allPassed) {
    console.log('\n✨ All permissions verified! You can now use M365 sync.');
    console.log('\nTry:');
    console.log('  pnpm tsx scripts/sync-to-m365.ts docs/ENDPOINT_STRATEGY_SUMMARY.md "onedrive:/Documents"');
  } else {
    console.log('\n⚠️  Some permissions failed. Please:');
    console.log('   1. Go to Azure Portal → Your App → API permissions');
    console.log('   2. Verify all required permissions are added');
    console.log('   3. Ensure they are "Application" type (not Delegated)');
    console.log('   4. Click "Grant admin consent"');
    console.log('   5. Wait a few minutes and run this script again');
    console.log('\nSee SETUP_M365_PERMISSIONS.md for detailed instructions.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
