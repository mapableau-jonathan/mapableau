#!/usr/bin/env tsx
/**
 * Interactive script to sync markdown documentation to Notion
 * Prompts for API key if not provided via environment variable
 */

import { readFileSync } from 'fs';
import * as readline from 'readline';

// Simple readline interface for prompts
function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Convert markdown to Notion blocks (simplified version)
function markdownToNotionBlocks(markdown: string): any[] {
  const lines = markdown.split('\n');
  const blocks: any[] = [];
  let inCodeBlock = false;
  let codeLanguage = '';
  let codeContent: string[] = [];
  let inList = false;
  let listItems: string[] = [];
  let listType: 'bulleted_list_item' | 'numbered_list_item' | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Handle code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({
          object: 'block',
          type: 'code',
          code: {
            rich_text: [{ type: 'text', text: { content: codeContent.join('\n') } }],
            language: codeLanguage || 'plain text',
          },
        });
        codeContent = [];
        codeLanguage = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLanguage = trimmed.slice(3).trim() || 'plain text';
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // Handle lists
    if (trimmed.match(/^[-*]\s/)) {
      if (!inList || listType !== 'bulleted_list_item') {
        if (inList) {
          listItems.forEach((item) => {
            blocks.push({
              object: 'block',
              type: listType!,
              [listType!]: {
                rich_text: parseRichText(item),
              },
            });
          });
          listItems = [];
        }
        inList = true;
        listType = 'bulleted_list_item';
      }
      listItems.push(trimmed.slice(2).trim());
      continue;
    }

    if (trimmed.match(/^\d+\.\s/)) {
      if (!inList || listType !== 'numbered_list_item') {
        if (inList) {
          listItems.forEach((item) => {
            blocks.push({
              object: 'block',
              type: listType!,
              [listType!]: {
                rich_text: parseRichText(item),
              },
            });
          });
          listItems = [];
        }
        inList = true;
        listType = 'numbered_list_item';
      }
      listItems.push(trimmed.replace(/^\d+\.\s/, '').trim());
      continue;
    }

    // Flush list
    if (inList) {
      listItems.forEach((item) => {
        blocks.push({
          object: 'block',
          type: listType!,
          [listType!]: {
            rich_text: parseRichText(item),
          },
        });
      });
      listItems = [];
      inList = false;
      listType = null;
    }

    if (!trimmed) continue;

    // Headings
    if (trimmed.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: parseRichText(trimmed.slice(2)),
        },
      });
      continue;
    }

    if (trimmed.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: parseRichText(trimmed.slice(3)),
        },
      });
      continue;
    }

    if (trimmed.startsWith('### ')) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: parseRichText(trimmed.slice(4)),
        },
      });
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      blocks.push({
        object: 'block',
        type: 'heading_4',
        heading_4: {
          rich_text: parseRichText(trimmed.slice(5)),
        },
      });
      continue;
    }

    // Tables (basic - convert to paragraphs)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c);
      
      if (cells.every((c) => c.match(/^[-:]+$/))) {
        continue;
      }

      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: parseRichText(cells.join(' | ')),
        },
      });
      continue;
    }

    // Regular paragraphs
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: parseRichText(trimmed),
      },
    });
  }

  if (inList) {
    listItems.forEach((item) => {
      blocks.push({
        object: 'block',
        type: listType!,
        [listType!]: {
          rich_text: parseRichText(item),
        },
      });
    });
  }

  if (inCodeBlock && codeContent.length > 0) {
    blocks.push({
      object: 'block',
      type: 'code',
      code: {
        rich_text: [{ type: 'text', text: { content: codeContent.join('\n') } }],
        language: codeLanguage || 'plain text',
      },
    });
  }

  return blocks;
}

function parseRichText(text: string): any[] {
  const result: any[] = [];
  let current = { type: 'text', text: { content: '' }, annotations: {} as any };
  let i = 0;

  while (i < text.length) {
    if (text.slice(i, i + 2) === '**' && text.indexOf('**', i + 2) !== -1) {
      const end = text.indexOf('**', i + 2);
      if (current.text.content) {
        result.push(current);
        current = { type: 'text', text: { content: '' }, annotations: {} };
      }
      result.push({
        type: 'text',
        text: { content: text.slice(i + 2, end) },
        annotations: { bold: true },
      });
      i = end + 2;
      continue;
    }

    if (text[i] === '*' && text.indexOf('*', i + 1) !== -1 && text[i + 1] !== '*') {
      const end = text.indexOf('*', i + 1);
      if (current.text.content) {
        result.push(current);
        current = { type: 'text', text: { content: '' }, annotations: {} };
      }
      result.push({
        type: 'text',
        text: { content: text.slice(i + 1, end) },
        annotations: { italic: true },
      });
      i = end + 1;
      continue;
    }

    if (text[i] === '`' && text.indexOf('`', i + 1) !== -1) {
      const end = text.indexOf('`', i + 1);
      if (current.text.content) {
        result.push(current);
        current = { type: 'text', text: { content: '' }, annotations: {} };
      }
      result.push({
        type: 'text',
        text: { content: text.slice(i + 1, end) },
        annotations: { code: true },
      });
      i = end + 1;
      continue;
    }

    current.text.content += text[i];
    i++;
  }

  if (current.text.content) {
    result.push(current);
  }

  return result.length > 0 ? result : [{ type: 'text', text: { content: text } }];
}

function extractPageId(url: string): string {
  const match = url.match(/-([a-f0-9]{32})/);
  if (match) {
    const id = match[1];
    return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
  }
  throw new Error('Could not extract page ID from URL');
}

// Retry helper for API calls
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  retryDelay = 2000
): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    
    if (response.status === 503 && attempt < maxRetries) {
      console.log(`⚠️  Service unavailable (503), retrying in ${retryDelay}ms... (attempt ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      continue;
    }
    
    return response;
  }
  
  // Final attempt
  return fetch(url, options);
}

async function syncToNotion(markdownFile: string, notionPageId: string, apiKey: string) {
  const markdown = readFileSync(markdownFile, 'utf-8');
  const blocks = markdownToNotionBlocks(markdown);

  const notionApiUrl = `https://api.notion.com/v1/blocks/${notionPageId}/children`;
  const apiVersion = '2022-06-28'; // Using stable version
  
  // Get and delete existing blocks
  try {
    const getResponse = await fetchWithRetry(notionApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': apiVersion,
      },
    });

    if (getResponse.ok) {
      const data = await getResponse.json();
      if (data.results && data.results.length > 0) {
        console.log(`🗑️  Deleting ${data.results.length} existing blocks...`);
        for (const block of data.results) {
          await fetchWithRetry(`https://api.notion.com/v1/blocks/${block.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Notion-Version': apiVersion,
            },
          });
        }
      }
    } else if (getResponse.status === 401) {
      throw new Error('401 Unauthorized - Check your API key');
    } else if (getResponse.status === 403) {
      throw new Error('403 Forbidden - Make sure the integration is shared with the page');
    }
  } catch (error: any) {
    if (error.message.includes('401') || error.message.includes('403')) {
      throw error;
    }
    console.warn('⚠️  Could not clear existing blocks:', error.message);
  }

  // Add new blocks in chunks
  const chunkSize = 100;
  console.log(`📤 Uploading ${blocks.length} blocks in chunks of ${chunkSize}...`);
  
  for (let i = 0; i < blocks.length; i += chunkSize) {
    const chunk = blocks.slice(i, i + chunkSize);
    
    const response = await fetchWithRetry(notionApiUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': apiVersion,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        children: chunk,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Notion API error: ${response.status} ${errorText}`;
      
      if (response.status === 401) {
        errorMessage = '401 Unauthorized - Check that your API key is correct';
      } else if (response.status === 403) {
        errorMessage = '403 Forbidden - Make sure the integration is shared with the page. Go to page → "..." → "Add connections"';
      } else if (response.status === 503) {
        errorMessage = '503 Service Unavailable - Notion API is temporarily down. Please try again in a few minutes.';
      }
      
      throw new Error(errorMessage);
    }
    
    console.log(`✅ Uploaded chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(blocks.length / chunkSize)}`);
  }

  console.log(`\n✨ Successfully synced ${blocks.length} blocks to Notion!`);
  console.log(`🔗 Page: https://www.notion.so/ausdis/MapAble-${notionPageId.replace(/-/g, '')}`);
}

// Main execution
async function main() {
  console.log('📝 Notion Sync Tool\n');

  const args = process.argv.slice(2);
  const markdownFile = args[0] || 'docs/ENDPOINT_STRATEGY_SUMMARY.md';
  
  // API key can be: env var, 2nd arg, or 3rd arg (if page URL is 2nd)
  let apiKey = process.env.NOTION_API_KEY || args.find(arg => arg.startsWith('secret_'));
  
  if (!apiKey) {
    console.log('To get your Notion API key:');
    console.log('1. Go to: https://www.notion.so/my-integrations');
    console.log('2. Click "New integration"');
    console.log('3. Give it a name and copy the "Internal Integration Token"');
    console.log('4. Share the Notion page with your integration\n');
    console.log('Usage:');
    console.log('  pnpm tsx scripts/sync-to-notion-interactive.ts <markdown-file> [notion-page-url] [api-key]');
    console.log('  OR set NOTION_API_KEY environment variable\n');
    
    // Try to prompt only if stdin is a TTY
    if (process.stdin.isTTY) {
      apiKey = await askQuestion('Enter your Notion API key (or press Ctrl+C to cancel): ');
      if (!apiKey.trim()) {
        console.error('❌ API key is required');
        process.exit(1);
      }
      apiKey = apiKey.trim();
    } else {
      console.error('❌ API key is required. Set NOTION_API_KEY env var or pass as argument.');
      console.error('   Example: NOTION_API_KEY=secret_... pnpm tsx scripts/sync-to-notion-interactive.ts docs/file.md');
      process.exit(1);
    }
  }

  // Page URL/ID: 2nd arg (if not an API key) or 3rd arg (if API key is 2nd)
  const notionPageArg = args.find((arg, idx) => 
    idx > 0 && !arg.startsWith('secret_') && (arg.includes('notion.so') || arg.includes('-'))
  ) || process.env.NOTION_PAGE_ID || process.env.NOTION_PAGE_URL;
  
  let pageId: string;

  if (!notionPageArg) {
    if (process.stdin.isTTY) {
      const url = await askQuestion('Enter Notion page URL or ID: ');
      pageId = url.includes('notion.so') ? extractPageId(url) : url;
    } else {
      console.error('❌ Notion page URL or ID is required');
      process.exit(1);
    }
  } else {
    pageId = notionPageArg.includes('notion.so') 
      ? extractPageId(notionPageArg)
      : notionPageArg;
  }

  try {
    await syncToNotion(markdownFile, pageId, apiKey);
  } catch (error: any) {
    console.error('\n❌ Error syncing to Notion:', error.message);
    if (error.message.includes('401')) {
      console.error('💡 Check that your API key is correct');
    } else if (error.message.includes('403')) {
      console.error('💡 Make sure the integration is shared with the page');
      console.error('   Go to the page → "..." → "Add connections" → Select your integration');
    }
    process.exit(1);
  }
}

main();
