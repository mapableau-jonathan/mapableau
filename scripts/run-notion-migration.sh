#!/bin/bash
# Run Notion migration using psql
# Usage: ./scripts/run-notion-migration.sh

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    exit 1
fi

echo "🚀 Running Notion migration..."
psql "$DATABASE_URL" -f scripts/run-notion-migration.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed"
    exit 1
fi
