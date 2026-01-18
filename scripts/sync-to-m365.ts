#!/usr/bin/env tsx
/**
 * Sync markdown documentation to Microsoft 365 / Exchange
 * Supports: OneDrive, SharePoint, Outlook Email, Teams
 * 
 * Usage:
 *   pnpm tsx scripts/sync-to-m365.ts <markdown-file> <target> [options]
 * 
 * Targets:
 *   onedrive:<folder-path>  - Upload to OneDrive
 *   sharepoint:<site>/<path> - Upload to SharePoint
 *   email:<recipient>        - Email via Outlook
 *   teams:<channel-id>       - Post to Teams channel
 * 
 * Environment variables:
 *   MS_CLIENT_ID - Azure AD App Client ID
 *   MS_CLIENT_SECRET - Azure AD App Client Secret
 *   MS_TENANT_ID - Azure AD Tenant ID
 *   MS_ACCESS_TOKEN - Direct access token (optional, for testing)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';

interface GraphApiOptions {
  accessToken: string;
  retries?: number;
  retryDelay?: number;
}

// Retry helper for Graph API calls
async function graphApiCall(
  url: string,
  options: RequestInit & { accessToken: string },
  maxRetries = 3,
  retryDelay = 2000
): Promise<Response> {
  const { accessToken, ...fetchOptions } = options;
  
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, { ...fetchOptions, headers });
    
    // Retry on 429 (rate limit) or 503 (service unavailable)
    if ((response.status === 429 || response.status === 503) && attempt < maxRetries) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay * attempt;
      console.log(`⚠️  Rate limited or service unavailable, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }
    
    return response;
  }
  
  return fetch(url, { ...fetchOptions, headers });
}

// Get access token using client credentials flow
async function getAccessToken(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  scopes: string[] = ['https://graph.microsoft.com/.default']
): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: scopes.join(' '),
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

// Convert markdown to HTML for email/Teams
function markdownToHtml(markdown: string): string {
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`(.*?)`/gim, '<code>$1</code>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    // Paragraphs
    .replace(/\n\n/gim, '</p><p>')
    .replace(/^(?!<[h|u|l|p|d|/])(.+)$/gim, '<p>$1</p>');

  // Wrap lists
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/gim, '');
  html = html.replace(/<p>(<[h|u|l|p|d])/gim, '$1');
  html = html.replace(/(<\/[h|u|l|p|d]>)<\/p>/gim, '$1');

  return `<html><body>${html}</body></html>`;
}

// Upload to OneDrive
async function uploadToOneDrive(
  filePath: string,
  content: string,
  folderPath: string,
  accessToken: string
): Promise<string> {
  // Get user's OneDrive root
  const driveResponse = await graphApiCall(
    'https://graph.microsoft.com/v1.0/me/drive',
    { method: 'GET', accessToken }
  );

  if (!driveResponse.ok) {
    throw new Error(`Failed to get OneDrive: ${driveResponse.status}`);
  }

  const drive = await driveResponse.json();
  const fileName = filePath.split('/').pop() || 'document.md';
  
  // Create folder path if needed
  const folderParts = folderPath.split('/').filter(p => p);
  let currentPath = 'root:';
  
  for (const folder of folderParts) {
    const folderUrl = `https://graph.microsoft.com/v1.0/me/drive/${currentPath}/children`;
    const folderResponse = await graphApiCall(folderUrl, {
      method: 'GET',
      accessToken,
    });

    const children = await folderResponse.json();
    const existingFolder = children.value?.find((item: any) => item.name === folder && item.folder);

    if (!existingFolder) {
      // Create folder
      const createResponse = await graphApiCall(folderUrl, {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          name: folder,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename',
        }),
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create folder: ${createResponse.status}`);
      }

      const newFolder = await createResponse.json();
      currentPath = `items/${newFolder.id}:`;
    } else {
      currentPath = `items/${existingFolder.id}:`;
    }
  }

  // Upload file
  const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/${currentPath}:/${fileName}:/content`;
  const uploadResponse = await graphApiCall(uploadUrl, {
    method: 'PUT',
    accessToken,
    headers: {
      'Content-Type': 'text/markdown',
    },
    body: content,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`Failed to upload to OneDrive: ${uploadResponse.status} ${error}`);
  }

  const uploadedFile = await uploadResponse.json();
  return uploadedFile.webUrl;
}

// Upload to SharePoint
async function uploadToSharePoint(
  filePath: string,
  content: string,
  sitePath: string,
  accessToken: string
): Promise<string> {
  // Parse site and path: "site-name/path/to/folder"
  const [siteName, ...pathParts] = sitePath.split('/');
  const folderPath = pathParts.join('/');
  const fileName = filePath.split('/').pop() || 'document.md';

  // Get site
  const siteResponse = await graphApiCall(
    `https://graph.microsoft.com/v1.0/sites/${siteName}`,
    { method: 'GET', accessToken }
  );

  if (!siteResponse.ok) {
    throw new Error(`Failed to get SharePoint site: ${siteResponse.status}. Make sure site name is correct.`);
  }

  const site = await siteResponse.json();
  const driveId = site.drive?.id || site.drives?.value?.[0]?.id;

  if (!driveId) {
    throw new Error('No drive found for SharePoint site');
  }

  // Navigate to folder
  let currentPath = driveId;
  if (folderPath) {
    const folderParts = folderPath.split('/').filter(p => p);
    for (const folder of folderParts) {
      const folderUrl = `https://graph.microsoft.com/v1.0/drives/${currentPath}/root/children`;
      const folderResponse = await graphApiCall(folderUrl, {
        method: 'GET',
        accessToken,
      });

      const children = await folderResponse.json();
      const existingFolder = children.value?.find((item: any) => item.name === folder && item.folder);

      if (!existingFolder) {
        // Create folder
        const createResponse = await graphApiCall(
          `https://graph.microsoft.com/v1.0/drives/${currentPath}/root/children`,
          {
            method: 'POST',
            accessToken,
            body: JSON.stringify({
              name: folder,
              folder: {},
            }),
          }
        );

        if (!createResponse.ok) {
          throw new Error(`Failed to create folder: ${createResponse.status}`);
        }

        const newFolder = await createResponse.json();
        currentPath = newFolder.id;
      } else {
        currentPath = existingFolder.id;
      }
    }
  }

  // Upload file
  const uploadUrl = `https://graph.microsoft.com/v1.0/drives/${currentPath}/root:/${fileName}:/content`;
  const uploadResponse = await graphApiCall(uploadUrl, {
    method: 'PUT',
    accessToken,
    headers: {
      'Content-Type': 'text/markdown',
    },
    body: content,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`Failed to upload to SharePoint: ${uploadResponse.status} ${error}`);
  }

  const uploadedFile = await uploadResponse.json();
  return uploadedFile.webUrl;
}

// Send email via Outlook
async function sendEmail(
  content: string,
  recipient: string,
  subject: string,
  accessToken: string
): Promise<void> {
  const htmlContent = markdownToHtml(content);
  
  const emailResponse = await graphApiCall(
    'https://graph.microsoft.com/v1.0/me/sendMail',
    {
      method: 'POST',
      accessToken,
      body: JSON.stringify({
        message: {
          subject,
          body: {
            contentType: 'HTML',
            content: htmlContent,
          },
          toRecipients: [
            {
              emailAddress: {
                address: recipient,
              },
            },
          ],
        },
      }),
    }
  );

  if (!emailResponse.ok) {
    const error = await emailResponse.text();
    throw new Error(`Failed to send email: ${emailResponse.status} ${error}`);
  }
}

// Post to Teams channel
async function postToTeams(
  content: string,
  channelId: string,
  teamId: string,
  accessToken: string
): Promise<void> {
  const htmlContent = markdownToHtml(content);
  
  const messageResponse = await graphApiCall(
    `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages`,
    {
      method: 'POST',
      accessToken,
      body: JSON.stringify({
        body: {
          contentType: 'html',
          content: htmlContent,
        },
      }),
    }
  );

  if (!messageResponse.ok) {
    const error = await messageResponse.text();
    throw new Error(`Failed to post to Teams: ${messageResponse.status} ${error}`);
  }
}

// Main execution
async function main() {
  console.log('📧 Microsoft 365 / Exchange Sync Tool\n');

  const args = process.argv.slice(2);
  const markdownFile = args[0] || 'docs/ENDPOINT_STRATEGY_SUMMARY.md';
  const target = args[1];

  if (!target) {
    console.error('❌ Target is required');
    console.log('\nUsage:');
    console.log('  pnpm tsx scripts/sync-to-m365.ts <markdown-file> <target>');
    console.log('\nTargets:');
    console.log('  onedrive:<folder-path>     - Upload to OneDrive');
    console.log('  sharepoint:<site>/<path>       - Upload to SharePoint');
    console.log('  email:<recipient>              - Email via Outlook');
    console.log('  teams:<team-id>/<channel-id>   - Post to Teams channel');
    console.log('\nExample:');
    console.log('  pnpm tsx scripts/sync-to-m365.ts docs/file.md onedrive:/Documents');
    console.log('  pnpm tsx scripts/sync-to-m365.ts docs/file.md email:user@example.com');
    process.exit(1);
  }

  // Get access token
  let accessToken = process.env.MS_ACCESS_TOKEN;
  
  if (!accessToken) {
    // Support both MS_* and AZURE_AD_* environment variable names
    const clientId = process.env.MS_CLIENT_ID || process.env.AZURE_AD_CLIENT_ID;
    const clientSecret = process.env.MS_CLIENT_SECRET || process.env.AZURE_AD_CLIENT_SECRET;
    const tenantId = process.env.MS_TENANT_ID || process.env.AZURE_AD_TENANT_ID;

    if (!clientId || !clientSecret || !tenantId) {
      console.error('❌ Microsoft credentials required');
      console.log('\nSet environment variables:');
      console.log('  MS_CLIENT_ID (or AZURE_AD_CLIENT_ID) - Azure AD App Client ID');
      console.log('  MS_CLIENT_SECRET (or AZURE_AD_CLIENT_SECRET) - Azure AD App Client Secret');
      console.log('  MS_TENANT_ID (or AZURE_AD_TENANT_ID) - Azure AD Tenant ID');
      console.log('\nOR set MS_ACCESS_TOKEN for direct token usage');
      console.log('\nNote: For M365 sync, you may need additional API permissions');
      console.log('      See scripts/M365_SYNC_README.md for setup instructions');
      process.exit(1);
    }

    console.log('🔐 Getting access token...');
    accessToken = await getAccessToken(clientId, clientSecret, tenantId);
    console.log('✅ Access token obtained\n');
  }

  // Read markdown file
  const content = readFileSync(markdownFile, 'utf-8');
  const fileName = markdownFile.split('/').pop() || 'document.md';

  try {
    if (target.startsWith('onedrive:')) {
      const folderPath = target.slice('onedrive:'.length) || '/';
      console.log(`📤 Uploading to OneDrive: ${folderPath}...`);
      const url = await uploadToOneDrive(markdownFile, content, folderPath, accessToken);
      console.log(`✅ Successfully uploaded to OneDrive!`);
      console.log(`🔗 ${url}`);
    } else if (target.startsWith('sharepoint:')) {
      const sitePath = target.slice('sharepoint:'.length);
      if (!sitePath) {
        throw new Error('SharePoint target must include site name: sharepoint:site-name/path');
      }
      console.log(`📤 Uploading to SharePoint: ${sitePath}...`);
      const url = await uploadToSharePoint(markdownFile, content, sitePath, accessToken);
      console.log(`✅ Successfully uploaded to SharePoint!`);
      console.log(`🔗 ${url}`);
    } else if (target.startsWith('email:')) {
      const recipient = target.slice('email:'.length);
      if (!recipient) {
        throw new Error('Email recipient required: email:user@example.com');
      }
      console.log(`📧 Sending email to ${recipient}...`);
      await sendEmail(content, recipient, `Documentation: ${fileName}`, accessToken);
      console.log(`✅ Email sent successfully!`);
    } else if (target.startsWith('teams:')) {
      const [teamId, channelId] = target.slice('teams:'.length).split('/');
      if (!teamId || !channelId) {
        throw new Error('Teams target must include team and channel: teams:team-id/channel-id');
      }
      console.log(`💬 Posting to Teams channel...`);
      await postToTeams(content, channelId, teamId, accessToken);
      console.log(`✅ Posted to Teams successfully!`);
    } else {
      throw new Error(`Unknown target: ${target}. Use onedrive:, sharepoint:, email:, or teams:`);
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('401')) {
      console.error('💡 Check your access token or credentials');
    } else if (error.message.includes('403')) {
      console.error('💡 Check that your app has the required permissions');
    } else if (error.message.includes('404')) {
      console.error('💡 Check that the target path/site/channel exists');
    }
    process.exit(1);
  }
}

main();
