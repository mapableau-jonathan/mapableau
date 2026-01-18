#!/usr/bin/env tsx
/**
 * Sync markdown documentation to Notion
 * 
 * Usage:
 *   pnpm tsx scripts/sync-to-notion.ts <markdown-file> <notion-page-id>
 * 
 * Environment variables required:
 *   NOTION_API_KEY - Your Notion integration API key
 *   NOTION_PAGE_ID - The Notion page ID to sync to (optional, can be passed as arg)
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface NotionBlock {
  object: 'block';
  type: string;
  [key: string]: any;
}

// Convert markdown to Notion blocks
function markdownToNotionBlocks(markdown: string): NotionBlock[] {
  const lines = markdown.split('\n');
  const blocks: NotionBlock[] = [];
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
        // End code block
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
        // Start code block
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
          // Flush previous list
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
          // Flush previous list
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

    // Flush list if we hit a non-list item
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

    // Skip empty lines
    if (!trimmed) {
      continue;
    }

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

    // Tables (basic support)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c);
      
      // Skip separator rows
      if (cells.every((c) => c.match(/^[-:]+$/))) {
        continue;
      }

      // For now, convert table rows to paragraphs
      // Full table support would require tracking table state
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

  // Flush any remaining list items
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

  // Flush any remaining code
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

// Parse rich text with formatting
function parseRichText(text: string): any[] {
  const result: any[] = [];
  let current = { type: 'text', text: { content: '' }, annotations: {} as any };
  let i = 0;

  while (i < text.length) {
    // Bold **text**
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

    // Italic *text*
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

    // Code `text`
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

// Extract page ID from Notion URL
function extractPageId(url: string): string {
  // Extract from URL like: https://www.notion.so/ausdis/MapAble-2ec2675ca94d80c59e3bcdd9a6470865
  const match = url.match(/-([a-f0-9]{32})/);
  if (match) {
    // Format as UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const id = match[1];
    return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
  }
  throw new Error('Could not extract page ID from URL');
}

async function syncToNotion(markdownFile: string, notionPageId: string) {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error('NOTION_API_KEY environment variable is required');
  }

  // Read markdown file
  const markdown = readFileSync(markdownFile, 'utf-8');
  
  // Convert to Notion blocks
  const blocks = markdownToNotionBlocks(markdown);

  // Clear existing content and add new blocks
  const notionApiUrl = `https://api.notion.com/v1/blocks/${notionPageId}/children`;
  
  // First, get existing blocks and delete them
  const getResponse = await fetch(notionApiUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Notion-Version': '2022-06-28',
    },
  });

  if (getResponse.ok) {
    const data = await getResponse.json();
    if (data.results && data.results.length > 0) {
      // Delete existing blocks
      for (const block of data.results) {
        await fetch(`https://api.notion.com/v1/blocks/${block.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Notion-Version': '2022-06-28',
          },
        });
      }
    }
  }

  // Add new blocks in chunks (Notion API limit is 100 blocks per request)
  const chunkSize = 100;
  for (let i = 0; i < blocks.length; i += chunkSize) {
    const chunk = blocks.slice(i, i + chunkSize);
    
    const response = await fetch(notionApiUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        children: chunk,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Notion API error: ${response.status} ${error}`);
    }
  }

  console.log(`✅ Successfully synced ${blocks.length} blocks to Notion page ${notionPageId}`);
}

// Main execution
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: tsx scripts/sync-to-notion.ts <markdown-file> [notion-page-url-or-id]');
  process.exit(1);
}

const markdownFile = args[0];
const notionPageArg = args[1] || process.env.NOTION_PAGE_ID || process.env.NOTION_PAGE_URL;

if (!notionPageArg) {
  console.error('Error: Notion page ID or URL required');
  console.error('Set NOTION_PAGE_ID or NOTION_PAGE_URL environment variable, or pass as second argument');
  process.exit(1);
}

const pageId = notionPageArg.includes('notion.so') 
  ? extractPageId(notionPageArg)
  : notionPageArg;

syncToNotion(markdownFile, pageId).catch((error) => {
  console.error('Error syncing to Notion:', error);
  process.exit(1);
});
