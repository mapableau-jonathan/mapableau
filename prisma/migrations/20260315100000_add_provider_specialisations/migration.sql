-- AlterTable
ALTER TABLE "Provider" ADD COLUMN IF NOT EXISTS "specialisations" TEXT[] DEFAULT ARRAY[]::TEXT[];
