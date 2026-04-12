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
ALTER TABLE "ProviderOutlet" ADD COLUMN     "logoUrl" TEXT;

-- -- CreateIndex
-- CREATE INDEX "Provider_search_vector_idx" ON "Provider"("search_vector");

-- -- CreateIndex
-- CREATE INDEX "ProviderOutlet_search_vector_idx" ON "ProviderOutlet"("search_vector");
