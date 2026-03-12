-- CreateEnum
CREATE TYPE "ProviderRole" AS ENUM ('ADMIN', 'MANAGER', 'STAFF');

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "ProviderUserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "role" "ProviderRole" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderUserRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderUserRole_userId_providerId_key" ON "ProviderUserRole"("userId", "providerId");

-- AddForeignKey
ALTER TABLE "ProviderUserRole" ADD CONSTRAINT "ProviderUserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderUserRole" ADD CONSTRAINT "ProviderUserRole_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
