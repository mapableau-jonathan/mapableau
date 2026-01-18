-- Standalone SQL migration for NotionSyncMapping table
-- Run this directly against your PostgreSQL database

-- CreateTable
CREATE TABLE IF NOT EXISTS "NotionSyncMapping" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "notionPageId" TEXT NOT NULL,
    "notionDatabaseId" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncDirection" TEXT,
    "conflictState" TEXT,
    "lastModifiedAt" TIMESTAMP(3),
    "notionLastEditedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotionSyncMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (with IF NOT EXISTS equivalent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'NotionSyncMapping_entityType_systemId_key'
    ) THEN
        CREATE UNIQUE INDEX "NotionSyncMapping_entityType_systemId_key" 
        ON "NotionSyncMapping"("entityType", "systemId");
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'NotionSyncMapping_notionPageId_idx'
    ) THEN
        CREATE INDEX "NotionSyncMapping_notionPageId_idx" 
        ON "NotionSyncMapping"("notionPageId");
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'NotionSyncMapping_entityType_idx'
    ) THEN
        CREATE INDEX "NotionSyncMapping_entityType_idx" 
        ON "NotionSyncMapping"("entityType");
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'NotionSyncMapping_systemId_idx'
    ) THEN
        CREATE INDEX "NotionSyncMapping_systemId_idx" 
        ON "NotionSyncMapping"("systemId");
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'NotionSyncMapping_conflictState_idx'
    ) THEN
        CREATE INDEX "NotionSyncMapping_conflictState_idx" 
        ON "NotionSyncMapping"("conflictState");
    END IF;
END $$;
