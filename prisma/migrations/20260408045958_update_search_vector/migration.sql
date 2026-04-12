CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX provider_name_trgm_idx
ON "Provider"
USING GIN (name gin_trgm_ops);

CREATE INDEX provider_outlet_name_trgm_idx
ON "ProviderOutlet"
USING GIN (name gin_trgm_ops);

CREATE INDEX service_name_trgm_idx
ON "ServiceDefinition"
USING GIN (name gin_trgm_ops);

CREATE INDEX service_name_fulltext_idx
ON "ServiceDefinition"
USING GIN (to_tsvector('english', name));