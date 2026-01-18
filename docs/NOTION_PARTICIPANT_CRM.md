# Notion Participant Relationship Management System

A comprehensive two-way, real-time sync system between MapAble and Notion, using Notion as a CRM for managing participants.

## Overview

This system automatically syncs participant-related data between MapAble and Notion databases, enabling:
- Real-time synchronization when data changes in either system
- Two-way sync with conflict resolution
- Comprehensive participant management in Notion
- Full audit trail and sync status tracking

## Features

- **Real-time Sync**: Changes in MapAble automatically sync to Notion
- **Two-way Sync**: Changes in Notion sync back to MapAble
- **Conflict Resolution**: Automatic conflict detection and resolution
- **Comprehensive Data**: Syncs participants, NDIS plans, care plans, incidents, complaints, risks, and payments
- **Manual Sync**: API endpoints for on-demand syncing
- **Status Monitoring**: Track sync status and conflicts

## Setup

### 1. Create Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name it: "MapAble Participant CRM"
4. Copy the "Internal Integration Token" (starts with `secret_`)

### 2. Set Up Notion Databases

Run the setup script to create all required databases:

```bash
pnpm tsx scripts/setup-notion-databases.ts [parent-page-id]
```

This creates:
- Participants database
- NDIS Plans database
- Care Plans database
- Incidents database
- Complaints database
- Risks database
- Payment Transactions database

The script will output database IDs - save these!

### 3. Configure Environment Variables

Add to your `.env` file:

```env
# Notion API
NOTION_API_KEY=secret_your_integration_token

# Database IDs (from setup script)
NOTION_PARTICIPANTS_DB_ID=your-participants-db-id
NOTION_NDIS_PLANS_DB_ID=your-ndis-plans-db-id
NOTION_CARE_PLANS_DB_ID=your-care-plans-db-id
NOTION_INCIDENTS_DB_ID=your-incidents-db-id
NOTION_COMPLAINTS_DB_ID=your-complaints-db-id
NOTION_RISKS_DB_ID=your-risks-db-id
NOTION_PAYMENTS_DB_ID=your-payments-db-id

# Sync Settings
NOTION_SYNC_ENABLED=true
NOTION_CONFLICT_STRATEGY=last-write-wins  # or "timestamp-based" or "manual-review"

# Optional: Enable/disable specific entity types
NOTION_SYNC_PARTICIPANTS=true
NOTION_SYNC_NDIS_PLANS=true
NOTION_SYNC_CARE_PLANS=true
NOTION_SYNC_INCIDENTS=true
NOTION_SYNC_COMPLAINTS=true
NOTION_SYNC_RISKS=true
NOTION_SYNC_PAYMENTS=true

# Webhook (for two-way sync)
NOTION_WEBHOOK_SECRET=your-webhook-secret
```

### 4. Share Databases with Integration

For each database created:
1. Open the database in Notion
2. Click "..." (top right)
3. Click "Add connections"
4. Select your "MapAble Participant CRM" integration

### 5. Set Up Webhooks (Optional, for two-way sync)

1. Go to your Notion integration settings
2. Add webhook URL: `https://your-domain.com/api/notion/webhook`
3. Copy the webhook secret to `NOTION_WEBHOOK_SECRET`

### 6. Run Initial Sync

Sync all existing data to Notion:

```bash
# Dry run (see what would be synced)
pnpm tsx scripts/initial-notion-sync.ts --dry-run

# Actual sync
pnpm tsx scripts/initial-notion-sync.ts
```

## Usage

### Automatic Sync

Once configured, sync happens automatically when:
- A participant is created or updated
- An NDIS plan is created or updated
- A care plan is created or updated
- An incident is created or updated
- A complaint is created or updated
- A risk is created or updated
- A payment transaction is created or updated

### Manual Sync

#### Sync All Participants

```bash
POST /api/notion/sync/participants
```

#### Sync Specific Entity

```bash
POST /api/notion/sync/[entity]?id=entity-id
```

Entity types: `participant`, `ndisplan`, `careplan`, `incident`, `complaint`, `risk`, `payment`

Example:
```bash
curl -X POST "https://your-domain.com/api/notion/sync/participant?id=user-123"
```

### Check Sync Status

```bash
GET /api/notion/status
```

Returns:
- Sync configuration
- Statistics (total mappings, by entity type)
- Pending conflicts
- Recent sync activity

## Conflict Resolution

When data changes in both systems simultaneously, conflicts are detected and resolved:

### Strategies

1. **last-write-wins** (default): Most recent change wins
2. **timestamp-based**: Merge based on field-level timestamps
3. **manual-review**: Mark conflicts for manual resolution

### Viewing Conflicts

Conflicts marked for manual review can be viewed via:
- API: `GET /api/notion/status` (shows pending conflicts)
- Database: `NotionSyncMapping` table where `conflictState = 'pending'`

### Resolving Conflicts Manually

Use the ConflictResolver service to resolve conflicts programmatically, or update data directly in either system.

## Database Schema

### NotionSyncMapping Table

Tracks sync state for each entity:

- `entityType`: Type of entity (User, NDISPlan, etc.)
- `systemId`: ID in MapAble system
- `notionPageId`: ID of Notion page
- `notionDatabaseId`: ID of Notion database
- `lastSyncedAt`: Last sync timestamp
- `syncDirection`: Direction of sync (to_notion, from_notion, both)
- `conflictState`: Conflict state (none, pending, resolved)

## API Endpoints

### Sync Endpoints

- `POST /api/notion/sync/participants` - Sync all participants
- `POST /api/notion/sync/[entity]?id=...` - Sync specific entity
- `GET /api/notion/status` - Get sync status

### Webhook Endpoint

- `POST /api/notion/webhook` - Receives Notion webhook events

## Troubleshooting

### Sync Not Working

1. Check `NOTION_SYNC_ENABLED=true`
2. Verify API key is correct
3. Ensure databases are shared with integration
4. Check logs for errors

### 401 Unauthorized

- Verify `NOTION_API_KEY` is correct
- Check integration token hasn't expired
- Ensure integration has access to databases

### 403 Forbidden

- Share databases with integration
- Check integration permissions

### Conflicts Not Resolving

- Check conflict resolution strategy
- Review pending conflicts via status endpoint
- Manually resolve if needed

### Missing Data in Notion

- Run initial sync script
- Check sync settings (entity types enabled)
- Verify database IDs are correct

## Architecture

```
MapAble System → Event Listeners → NotionSyncService → Notion API
                                                          ↓
Notion Webhook → WebhookHandler → ConflictResolver → MapAble System
```

## Security

- Webhook signature verification
- API key stored securely
- Audit logging of all syncs
- Rate limiting on sync endpoints
- Permission checks on manual sync

## Performance

- Async event processing (non-blocking)
- Batch operations for initial sync
- Retry logic for API failures
- Efficient relation resolution

## Next Steps

1. Set up Notion databases using setup script
2. Configure environment variables
3. Run initial sync
4. Enable real-time sync
5. Set up webhooks for two-way sync
6. Monitor sync status

For detailed API documentation, see the individual service files in `lib/services/notion/`.
