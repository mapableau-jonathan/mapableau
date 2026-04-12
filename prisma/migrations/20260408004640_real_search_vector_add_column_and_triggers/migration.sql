-- CreateIndex
CREATE INDEX "Address_latitude_idx" ON "Address"("latitude");

-- CreateIndex
CREATE INDEX "Address_longitude_idx" ON "Address"("longitude");

ALTER TABLE "Provider"
ADD COLUMN search_vector tsvector;

UPDATE "Provider" p
SET search_vector =
  to_tsvector(
    'english',
    coalesce(p.name, '') || ' ' ||
    coalesce((
      SELECT string_agg(DISTINCT sd.name, ' ')
      FROM "ProviderService" ps
      JOIN "ServiceDefinition" sd
        ON ps."serviceDefinitionId" = sd.id
      WHERE ps."providerId" = p.id
    ), '')
  );

  CREATE INDEX provider_search_idx
  ON "Provider"
  USING GIN (search_vector);

  CREATE OR REPLACE FUNCTION update_provider_search_vector()
  RETURNS trigger AS $$
  DECLARE
    target_provider_id uuid;
  BEGIN
    -- Handle INSERT/UPDATE/DELETE
    target_provider_id :=
      CASE
        WHEN TG_OP = 'DELETE' THEN OLD."providerId"
        ELSE NEW."providerId"
      END;

    IF target_provider_id IS NOT NULL THEN
      UPDATE "Provider" p
      SET search_vector =
        to_tsvector(
          'english',
          coalesce(p.name, '') || ' ' ||
          coalesce((
            SELECT string_agg(DISTINCT sd.name, ' ')
            FROM "ProviderService" ps
            JOIN "ServiceDefinition" sd
              ON ps."serviceDefinitionId" = sd.id
            WHERE ps."providerId" = p.id
          ), '')
        )
      WHERE p.id = target_provider_id;
    END IF;

    RETURN NULL;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS provider_search_vector_trigger ON "ProviderService";
  CREATE TRIGGER provider_search_vector_trigger
  AFTER INSERT OR UPDATE OR DELETE
  ON "ProviderService"
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_search_vector();

  CREATE OR REPLACE FUNCTION update_provider_search_vector_on_provider()
  RETURNS trigger AS $$
  BEGIN
    NEW.search_vector :=
      to_tsvector(
        'english',
        coalesce(NEW.name, '') || ' ' ||
        coalesce((
          SELECT string_agg(DISTINCT sd.name, ' ')
          FROM "ProviderService" ps
          JOIN "ServiceDefinition" sd
            ON ps."serviceDefinitionId" = sd.id
          WHERE ps."providerId" = NEW.id
        ), '')
      );

    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS provider_name_search_update ON "Provider";
  CREATE TRIGGER provider_name_search_update
  BEFORE INSERT OR UPDATE OF name
  ON "Provider"
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_search_vector_on_provider();

  ALTER TABLE "ProviderOutlet"
  ADD COLUMN search_vector tsvector;

  UPDATE "ProviderOutlet" po
  SET search_vector =
    to_tsvector(
      'english',
      coalesce(po.name, '') || ' ' ||
      coalesce((
        SELECT string_agg(DISTINCT sd.name, ' ')
        FROM "ProviderOutletService" pos
        JOIN "ServiceDefinition" sd
          ON pos."serviceDefinitionId" = sd.id
        WHERE pos."providerOutletId" = po.id
      ), '')
    );

    CREATE INDEX provider_outlet_search_idx
    ON "ProviderOutlet"
    USING GIN (search_vector);

    CREATE OR REPLACE FUNCTION update_provider_outlet_search_vector()
    RETURNS trigger AS $$
    DECLARE
      target_id uuid;
    BEGIN
      target_id :=
        CASE
          WHEN TG_OP = 'DELETE' THEN OLD."providerOutletId"
          ELSE NEW."providerOutletId"
        END;

      IF target_id IS NOT NULL THEN
        UPDATE "ProviderOutlet" po
        SET search_vector =
          to_tsvector(
            'english',
            coalesce(po.name, '') || ' ' ||
            coalesce((
              SELECT string_agg(DISTINCT sd.name, ' ')
              FROM "ProviderOutletService" pos
              JOIN "ServiceDefinition" sd
                ON pos."serviceDefinitionId" = sd.id
              WHERE pos."providerOutletId" = po.id
            ), '')
          )
        WHERE po.id = target_id;
      END IF;

      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS provider_outlet_search_trigger ON "ProviderOutletService";
    CREATE TRIGGER provider_outlet_search_trigger
    AFTER INSERT OR UPDATE OR DELETE
    ON "ProviderOutletService"
    FOR EACH ROW
    EXECUTE FUNCTION update_provider_outlet_search_vector();

    CREATE OR REPLACE FUNCTION update_provider_outlet_name_vector()
    RETURNS trigger AS $$
    BEGIN
      NEW.search_vector :=
        to_tsvector(
          'english',
          coalesce(NEW.name, '') || ' ' ||
          coalesce((
            SELECT string_agg(DISTINCT sd.name, ' ')
            FROM "ProviderOutletService" pos
            JOIN "ServiceDefinition" sd
              ON pos."serviceDefinitionId" = sd.id
            WHERE pos."providerOutletId" = NEW.id
          ), '')
        );

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS provider_outlet_name_update ON "ProviderOutlet";
    CREATE TRIGGER provider_outlet_name_update
    BEFORE INSERT OR UPDATE OF name
    ON "ProviderOutlet"
    FOR EACH ROW
    EXECUTE FUNCTION update_provider_outlet_name_vector();

    CREATE OR REPLACE FUNCTION update_search_vector_on_service_definition_change()
    RETURNS trigger AS $$
    BEGIN
      -- Only run when name actually changes
      IF NEW.name IS DISTINCT FROM OLD.name THEN

        -- 🔹 Update Providers
        UPDATE "Provider" p
        SET search_vector =
          to_tsvector(
            'english',
            coalesce(p.name, '') || ' ' ||
            coalesce((
              SELECT string_agg(DISTINCT sd.name, ' ')
              FROM "ProviderService" ps
              JOIN "ServiceDefinition" sd
                ON ps."serviceDefinitionId" = sd.id
              WHERE ps."providerId" = p.id
            ), '')
          )
        WHERE p.id IN (
          SELECT ps."providerId"
          FROM "ProviderService" ps
          WHERE ps."serviceDefinitionId" = NEW.id
        );

        -- 🔹 Update ProviderOutlets
        UPDATE "ProviderOutlet" po
        SET search_vector =
          to_tsvector(
            'english',
            coalesce(po.name, '') || ' ' ||
            coalesce((
              SELECT string_agg(DISTINCT sd.name, ' ')
              FROM "ProviderOutletService" pos
              JOIN "ServiceDefinition" sd
                ON pos."serviceDefinitionId" = sd.id
              WHERE pos."providerOutletId" = po.id
            ), '')
          )
        WHERE po.id IN (
          SELECT pos."providerOutletId"
          FROM "ProviderOutletService" pos
          WHERE pos."serviceDefinitionId" = NEW.id
        );

      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS service_definition_name_update ON "ServiceDefinition";
    CREATE TRIGGER service_definition_name_update
    AFTER UPDATE OF name
    ON "ServiceDefinition"
    FOR EACH ROW
    EXECUTE FUNCTION update_search_vector_on_service_definition_change();