/*
  Warnings:

  - Made the column `search_vector` on table `Provider` required. This step will fail if there are existing NULL values in that column.
  - Made the column `search_vector` on table `ProviderOutlet` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Address_latitude_idx";

-- todo: fix these
-- DropIndex
-- DROP INDEX "provider_name_trgm_idx";

-- -- DropIndex
-- DROP INDEX "provider_search_idx";

-- -- DropIndex
-- DROP INDEX "provider_outlet_name_trgm_idx";

-- -- DropIndex
-- DROP INDEX "provider_outlet_search_idx";

-- -- DropIndex
-- DROP INDEX "service_name_trgm_idx";

-- AlterTable
ALTER TABLE "Provider" ALTER COLUMN "search_vector" SET NOT NULL;

-- AlterTable
ALTER TABLE "ProviderOutlet" ALTER COLUMN "search_vector" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Address_latitude_longitude_idx" ON "Address"("latitude", "longitude");

-- CreateIndex
-- CREATE INDEX "Provider_search_vector_idx" ON "Provider"("search_vector");

-- CreateIndex
CREATE INDEX "Provider_addressId_idx" ON "Provider"("addressId");

-- CreateIndex
-- CREATE INDEX "ProviderOutlet_search_vector_idx" ON "ProviderOutlet"("search_vector");
