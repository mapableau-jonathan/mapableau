-- CreateEnum
CREATE TYPE "ProviderRole" AS ENUM ('ADMIN', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "addressString" TEXT NOT NULL,
    "street" TEXT,
    "suburb" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postcode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Australia',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "formatted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "qualifications" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "LanguageDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerLanguage" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "languageDefinitionId" TEXT NOT NULL,

    CONSTRAINT "WorkerLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerAvailability" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,

    CONSTRAINT "WorkerAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialisationDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SpecialisationDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerSpecialisation" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "specialisationDefinitionId" TEXT NOT NULL,

    CONSTRAINT "WorkerSpecialisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimedProvider" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "outletKey" TEXT,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "description" TEXT,
    "openingHours" TEXT,
    "suburb" TEXT,
    "state" TEXT,
    "postcode" TEXT,
    "categories" TEXT[],
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaimedProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderSpecialisation" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "specialisationDefinitionId" TEXT NOT NULL,

    CONSTRAINT "ProviderSpecialisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderOutletSpecialisation" (
    "id" TEXT NOT NULL,
    "providerOutletId" TEXT NOT NULL,
    "specialisationDefinitionId" TEXT NOT NULL,

    CONSTRAINT "ProviderOutletSpecialisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressId" TEXT,
    "logoUrl" TEXT,
    "description" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "abn" TEXT,
    "businessType" TEXT,
    "ndisRegistered" BOOLEAN NOT NULL DEFAULT false,
    "ndisNumber" TEXT,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "serviceAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderOutlet" (
    "id" TEXT NOT NULL,
    "outletFingerprint" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressId" TEXT,
    "description" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "ndisNumber" TEXT,
    "abn" TEXT,
    "businessType" TEXT,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "serviceAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProviderOutlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderUserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "ProviderRole" NOT NULL,

    CONSTRAINT "ProviderUserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderOutletUserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerOutletId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "ProviderRole" NOT NULL,

    CONSTRAINT "ProviderOutletUserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "ServiceDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderService" (
    "id" TEXT NOT NULL,
    "serviceDefinitionId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,

    CONSTRAINT "ProviderService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderOutletService" (
    "id" TEXT NOT NULL,
    "serviceDefinitionId" TEXT NOT NULL,
    "providerOutletId" TEXT NOT NULL,

    CONSTRAINT "ProviderOutletService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderServiceLocation" (
    "id" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,

    CONSTRAINT "ProviderServiceLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderOutletServiceLocation" (
    "id" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "providerOutletId" TEXT NOT NULL,

    CONSTRAINT "ProviderOutletServiceLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderBusinessHour" (
    "id" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "openTime" TIME NOT NULL,
    "closeTime" TIME NOT NULL,
    "providerId" TEXT NOT NULL,

    CONSTRAINT "ProviderBusinessHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderOutletBusinessHour" (
    "id" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "openTime" TIME NOT NULL,
    "closeTime" TIME NOT NULL,
    "providerOutletId" TEXT NOT NULL,

    CONSTRAINT "ProviderOutletBusinessHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderWorker" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "ProviderWorker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderOutletWorker" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "providerOutletId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "ProviderOutletWorker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_userId_key" ON "Worker"("userId");

-- CreateIndex
CREATE INDEX "WorkerLanguage_languageDefinitionId_idx" ON "WorkerLanguage"("languageDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerLanguage_workerId_languageDefinitionId_key" ON "WorkerLanguage"("workerId", "languageDefinitionId");

-- CreateIndex
CREATE INDEX "WorkerAvailability_workerId_idx" ON "WorkerAvailability"("workerId");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialisationDefinition_name_key" ON "SpecialisationDefinition"("name");

-- CreateIndex
CREATE INDEX "WorkerSpecialisation_specialisationDefinitionId_idx" ON "WorkerSpecialisation"("specialisationDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerSpecialisation_workerId_specialisationDefinitionId_key" ON "WorkerSpecialisation"("workerId", "specialisationDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimedProvider_slug_key" ON "ClaimedProvider"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimedProvider_outletKey_key" ON "ClaimedProvider"("outletKey");

-- CreateIndex
CREATE INDEX "ProviderSpecialisation_specialisationDefinitionId_idx" ON "ProviderSpecialisation"("specialisationDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSpecialisation_providerId_specialisationDefinitionI_key" ON "ProviderSpecialisation"("providerId", "specialisationDefinitionId");

-- CreateIndex
CREATE INDEX "ProviderOutletSpecialisation_specialisationDefinitionId_idx" ON "ProviderOutletSpecialisation"("specialisationDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderOutletSpecialisation_providerOutletId_specialisatio_key" ON "ProviderOutletSpecialisation"("providerOutletId", "specialisationDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_abn_key" ON "Provider"("abn");

-- CreateIndex
CREATE INDEX "ProviderOutlet_providerId_idx" ON "ProviderOutlet"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderOutlet_providerId_outletFingerprint_key" ON "ProviderOutlet"("providerId", "outletFingerprint");

-- CreateIndex
CREATE INDEX "ProviderUserRole_providerId_idx" ON "ProviderUserRole"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderUserRole_userId_providerId_key" ON "ProviderUserRole"("userId", "providerId");

-- CreateIndex
CREATE INDEX "ProviderOutletUserRole_providerOutletId_idx" ON "ProviderOutletUserRole"("providerOutletId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderOutletUserRole_userId_providerOutletId_key" ON "ProviderOutletUserRole"("userId", "providerOutletId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDefinition_name_key" ON "ServiceDefinition"("name");

-- CreateIndex
CREATE INDEX "ProviderService_providerId_idx" ON "ProviderService"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderService_serviceDefinitionId_providerId_key" ON "ProviderService"("serviceDefinitionId", "providerId");

-- CreateIndex
CREATE INDEX "ProviderOutletService_providerOutletId_idx" ON "ProviderOutletService"("providerOutletId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderOutletService_serviceDefinitionId_providerOutletId_key" ON "ProviderOutletService"("serviceDefinitionId", "providerOutletId");

-- CreateIndex
CREATE INDEX "ProviderServiceLocation_addressId_idx" ON "ProviderServiceLocation"("addressId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderServiceLocation_providerId_addressId_key" ON "ProviderServiceLocation"("providerId", "addressId");

-- CreateIndex
CREATE INDEX "ProviderOutletServiceLocation_addressId_idx" ON "ProviderOutletServiceLocation"("addressId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderOutletServiceLocation_providerOutletId_addressId_key" ON "ProviderOutletServiceLocation"("providerOutletId", "addressId");

-- CreateIndex
CREATE INDEX "ProviderBusinessHour_providerId_idx" ON "ProviderBusinessHour"("providerId");

-- CreateIndex
CREATE INDEX "ProviderOutletBusinessHour_providerOutletId_idx" ON "ProviderOutletBusinessHour"("providerOutletId");

-- CreateIndex
CREATE INDEX "ProviderWorker_providerId_idx" ON "ProviderWorker"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderWorker_workerId_providerId_key" ON "ProviderWorker"("workerId", "providerId");

-- CreateIndex
CREATE INDEX "ProviderOutletWorker_providerOutletId_idx" ON "ProviderOutletWorker"("providerOutletId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderOutletWorker_workerId_providerOutletId_key" ON "ProviderOutletWorker"("workerId", "providerOutletId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerLanguage" ADD CONSTRAINT "WorkerLanguage_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerLanguage" ADD CONSTRAINT "WorkerLanguage_languageDefinitionId_fkey" FOREIGN KEY ("languageDefinitionId") REFERENCES "LanguageDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerAvailability" ADD CONSTRAINT "WorkerAvailability_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerSpecialisation" ADD CONSTRAINT "WorkerSpecialisation_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerSpecialisation" ADD CONSTRAINT "WorkerSpecialisation_specialisationDefinitionId_fkey" FOREIGN KEY ("specialisationDefinitionId") REFERENCES "SpecialisationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimedProvider" ADD CONSTRAINT "ClaimedProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSpecialisation" ADD CONSTRAINT "ProviderSpecialisation_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSpecialisation" ADD CONSTRAINT "ProviderSpecialisation_specialisationDefinitionId_fkey" FOREIGN KEY ("specialisationDefinitionId") REFERENCES "SpecialisationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOutletSpecialisation" ADD CONSTRAINT "ProviderOutletSpecialisation_providerOutletId_fkey" FOREIGN KEY ("providerOutletId") REFERENCES "ProviderOutlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOutletSpecialisation" ADD CONSTRAINT "ProviderOutletSpecialisation_specialisationDefinitionId_fkey" FOREIGN KEY ("specialisationDefinitionId") REFERENCES "SpecialisationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOutlet" ADD CONSTRAINT "ProviderOutlet_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOutlet" ADD CONSTRAINT "ProviderOutlet_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderUserRole" ADD CONSTRAINT "ProviderUserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderUserRole" ADD CONSTRAINT "ProviderUserRole_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOutletUserRole" ADD CONSTRAINT "ProviderOutletUserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOutletUserRole" ADD CONSTRAINT "ProviderOutletUserRole_providerOutletId_fkey" FOREIGN KEY ("providerOutletId") REFERENCES "ProviderOutlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderService" ADD CONSTRAINT "ProviderService_serviceDefinitionId_fkey" FOREIGN KEY ("serviceDefinitionId") REFERENCES "ServiceDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderService" ADD CONSTRAINT "ProviderService_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOutletService" ADD CONSTRAINT "ProviderOutletService_serviceDefinitionId_fkey" FOREIGN KEY ("serviceDefinitionId") REFERENCES "ServiceDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOutletService" ADD CONSTRAINT "ProviderOutletService_providerOutletId_fkey" FOREIGN KEY ("providerOutletId") REFERENCES "ProviderOutlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderServiceLocation" ADD CONSTRAINT "ProviderServiceLocation_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderServiceLocation" ADD CONSTRAINT "ProviderServiceLocation_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOutletServiceLocation" ADD CONSTRAINT "ProviderOutletServiceLocation_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOutletServiceLocation" ADD CONSTRAINT "ProviderOutletServiceLocation_providerOutletId_fkey" FOREIGN KEY ("providerOutletId") REFERENCES "ProviderOutlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderBusinessHour" ADD CONSTRAINT "ProviderBusinessHour_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOutletBusinessHour" ADD CONSTRAINT "ProviderOutletBusinessHour_providerOutletId_fkey" FOREIGN KEY ("providerOutletId") REFERENCES "ProviderOutlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderWorker" ADD CONSTRAINT "ProviderWorker_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderWorker" ADD CONSTRAINT "ProviderWorker_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOutletWorker" ADD CONSTRAINT "ProviderOutletWorker_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOutletWorker" ADD CONSTRAINT "ProviderOutletWorker_providerOutletId_fkey" FOREIGN KEY ("providerOutletId") REFERENCES "ProviderOutlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
