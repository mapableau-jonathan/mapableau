# Quick Sync to Notion

## Get Your Notion API Key (One-Time Setup)

1. **Go to:** https://www.notion.so/my-integrations
2. **Click:** "New integration" or "+ New integration"
3. **Name it:** "MapAble Docs Sync" (or any name)
4. **Select workspace:** Choose your workspace
5. **Copy the token:** It starts with `secret_...`
6. **Share with page:**
   - Open: https://www.notion.so/ausdis/MapAble-2ec2675ca94d80c59e3bcdd9a6470865
   - Click "..." (top right) → "Add connections"
   - Select your integration

## Sync Command

Once you have your API key, run:

```powershell
# Option 1: Set environment variable
$env:NOTION_API_KEY="secret_your_key_here"
pnpm tsx scripts/sync-to-notion-interactive.ts docs/ENDPOINT_STRATEGY_SUMMARY.md "https://www.notion.so/ausdis/MapAble-2ec2675ca94d80c59e3bcdd9a6470865"

# Option 2: Pass as argument (less secure)
pnpm tsx scripts/sync-to-notion-interactive.ts docs/ENDPOINT_STRATEGY_SUMMARY.md "https://www.notion.so/ausdis/MapAble-2ec2675ca94d80c59e3bcdd9a6470865" "secret_your_key_here"
```

## What It Does

- Reads `docs/ENDPOINT_STRATEGY_SUMMARY.md`
- Converts markdown to Notion blocks
- Clears existing content on the Notion page
- Uploads the new content

## Troubleshooting

**401 Error:** API key is wrong - check it starts with `secret_`

**403 Error:** Integration not shared with page - go to page → "..." → "Add connections"

**404 Error:** Page ID is wrong - check the URL
