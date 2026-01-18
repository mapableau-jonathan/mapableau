# Running the Notion Sync Migration

The `NotionSyncMapping` table needs to be created in your database. Here are several ways to run the migration:

## Option 1: Direct SQL (Recommended)

Run the SQL file directly against your database:

```bash
# Using psql
psql $DATABASE_URL -f scripts/run-notion-migration.sql

# Or on Windows PowerShell
psql $env:DATABASE_URL -f scripts\run-notion-migration.sql
```

## Option 2: Using the Script

### Linux/Mac:
```bash
chmod +x scripts/run-notion-migration.sh
./scripts/run-notion-migration.sh
```

### Windows PowerShell:
```powershell
.\scripts\run-notion-migration.ps1
```

## Option 3: Using Prisma (if configured)

If your Prisma setup is working:

```bash
pnpm prisma migrate dev --name add_notion_sync_mapping
```

Or:

```bash
pnpm prisma db push
```

## Option 4: Manual Database Client

1. Connect to your PostgreSQL database using any database client (pgAdmin, DBeaver, etc.)
2. Open `scripts/run-notion-migration.sql`
3. Execute the SQL statements

## Option 5: Using Neon Console

If you're using Neon:
1. Go to your Neon dashboard
2. Open the SQL Editor
3. Copy and paste the contents of `scripts/run-notion-migration.sql`
4. Execute

## Verify Migration

After running the migration, verify the table was created:

```sql
SELECT * FROM "NotionSyncMapping" LIMIT 1;
```

If this query runs without errors, the migration was successful!
