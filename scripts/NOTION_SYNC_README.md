# Notion Sync Script

This script syncs markdown documentation files to Notion pages.

## Setup

1. **Create a Notion Integration:**
   - Go to https://www.notion.so/my-integrations
   - Click "New integration"
   - Give it a name (e.g., "MapAble Docs Sync")
   - Select the workspace
   - Copy the "Internal Integration Token" (this is your `NOTION_API_KEY`)

2. **Share the Notion page with your integration:**
   - Open the Notion page you want to sync to
   - Click the "..." menu in the top right
   - Click "Add connections"
   - Select your integration

3. **Set environment variables:**
   ```bash
   export NOTION_API_KEY="secret_..."
   export NOTION_PAGE_ID="your-page-id"  # Optional, can pass as argument
   ```

   Or add to your `.env` file:
   ```
   NOTION_API_KEY=secret_...
   NOTION_PAGE_ID=your-page-id
   ```

## Usage

### Sync a markdown file to Notion:

```bash
# Using environment variable for page ID
pnpm tsx scripts/sync-to-notion.ts docs/ENDPOINT_STRATEGY_SUMMARY.md

# Or pass the Notion page URL as argument
pnpm tsx scripts/sync-to-notion.ts docs/ENDPOINT_STRATEGY_SUMMARY.md "https://www.notion.so/ausdis/MapAble-2ec2675ca94d80c59e3bcdd9a6470865"

# Or pass the page ID directly
pnpm tsx scripts/sync-to-notion.ts docs/ENDPOINT_STRATEGY_SUMMARY.md "2ec2675ca94d-80c5-9e3b-cd9a-6470865"
```

## How it works

1. Reads the markdown file
2. Converts markdown to Notion block format
3. Clears existing content on the Notion page
4. Adds the new content as Notion blocks

## Supported Markdown Features

- Headings (H1-H4)
- Paragraphs
- Bold, italic, inline code
- Code blocks (with language detection)
- Bulleted lists
- Numbered lists
- Basic table support (converted to paragraphs)

## Notes

- The script will **replace all content** on the target Notion page
- Make sure you have write access to the page through your integration
- The script uses the Notion API v1 (2022-06-28)

## Troubleshooting

**Error: "NOTION_API_KEY environment variable is required"**
- Make sure you've set the `NOTION_API_KEY` environment variable

**Error: "Notion API error: 401"**
- Check that your API key is correct
- Make sure the integration is shared with the page

**Error: "Notion API error: 403"**
- The integration doesn't have access to the page
- Go to the page and add the integration via "Add connections"
