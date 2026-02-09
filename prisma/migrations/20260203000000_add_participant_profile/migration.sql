-- CreateTable
CREATE TABLE "ParticipantProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT,
    "displayName" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "accessibilityNeeds" TEXT,
    "preferredCategories" TEXT[],
    "suburb" TEXT,
    "state" TEXT,
    "postcode" TEXT,
    "savedProviderIds" TEXT[],
    "ndisParticipantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantProfile_userId_key" ON "ParticipantProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantProfile_slug_key" ON "ParticipantProfile"("slug");

-- AddForeignKey
ALTER TABLE "ParticipantProfile" ADD CONSTRAINT "ParticipantProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
