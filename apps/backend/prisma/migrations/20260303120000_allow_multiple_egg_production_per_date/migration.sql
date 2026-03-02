-- Allow multiple egg production records per batch per date (e.g. morning + evening)
-- Drop the unique constraint on (batchId, date); keep the non-unique index for query performance.
DROP INDEX IF EXISTS "public"."EggProduction_batchId_date_key";
