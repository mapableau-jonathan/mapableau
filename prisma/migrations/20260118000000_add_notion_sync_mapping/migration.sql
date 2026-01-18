-- CreateTable
CREATE TABLE "NotionSyncMapping" (
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

-- CreateIndex
CREATE UNIQUE INDEX "NotionSyncMapping_entityType_systemId_key" ON "NotionSyncMapping"("entityType", "systemId");

-- CreateIndex
CREATE INDEX "NotionSyncMapping_notionPageId_idx" ON "NotionSyncMapping"("notionPageId");

-- CreateIndex
CREATE INDEX "NotionSyncMapping_entityType_idx" ON "NotionSyncMapping"("entityType");

-- CreateIndex
CREATE INDEX "NotionSyncMapping_systemId_idx" ON "NotionSyncMapping"("systemId");

-- CreateIndex
CREATE INDEX "NotionSyncMapping_conflictState_idx" ON "NotionSyncMapping"("conflictState");
