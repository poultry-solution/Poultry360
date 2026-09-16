CREATE TABLE "AccountFeature" (
    "accountId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountFeature_pkey" PRIMARY KEY ("accountId", "featureKey")
);

CREATE INDEX "AccountFeature_featureKey_idx" ON "AccountFeature"("featureKey");

ALTER TABLE "AccountFeature"
ADD CONSTRAINT "AccountFeature_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve access for accounts that already had Self-Feed before this flag
-- existed. Newly created accounts start disabled until an admin grants access.
INSERT INTO "AccountFeature" (
    "accountId",
    "featureKey",
    "enabled",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    'SELF_FEED_PRODUCTION',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User"
WHERE "role" IN ('OWNER', 'HATCHERY');
