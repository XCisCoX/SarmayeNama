-- Corrective migration: SystemSetting.value back to JSONB.
-- The table only holds seed metadata (schema_version, seeded_at) that the
-- idempotent seed rewrites on every startup, so clearing it is safe.
DELETE FROM "SystemSetting";
ALTER TABLE "SystemSetting" ALTER COLUMN "value" TYPE JSONB USING "value"::jsonb;
