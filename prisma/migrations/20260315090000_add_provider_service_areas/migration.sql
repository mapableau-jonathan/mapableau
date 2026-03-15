-- AlterTable
ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "serviceAreas" TEXT[] DEFAULT ARRAY[]::TEXT[];
