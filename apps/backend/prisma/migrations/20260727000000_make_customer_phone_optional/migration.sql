-- Make customer phone optional for manual and dealer-created customers
ALTER TABLE "public"."Customer"
ALTER COLUMN "phone" DROP NOT NULL;
