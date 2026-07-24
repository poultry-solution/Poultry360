-- Add location coordinates for list-for-sale listings
ALTER TABLE "public"."ListForSale"
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;
