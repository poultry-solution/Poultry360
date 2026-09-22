CREATE TYPE "AuditActorType" AS ENUM ('USER', 'STAFF');

CREATE TABLE "BusinessAuditLog" (
    "id" TEXT NOT NULL,
    "accountOwnerId" TEXT NOT NULL,
    "businessType" TEXT,
    "businessId" TEXT,
    "actorId" TEXT NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "BusinessAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BusinessAuditLog_accountOwnerId_createdAt_idx" ON "BusinessAuditLog"("accountOwnerId", "createdAt");
CREATE INDEX "BusinessAuditLog_businessType_businessId_createdAt_idx" ON "BusinessAuditLog"("businessType", "businessId", "createdAt");
CREATE INDEX "BusinessAuditLog_actorType_actorId_createdAt_idx" ON "BusinessAuditLog"("actorType", "actorId", "createdAt");
CREATE INDEX "BusinessAuditLog_targetType_targetId_createdAt_idx" ON "BusinessAuditLog"("targetType", "targetId", "createdAt");
CREATE INDEX "BusinessAuditLog_action_createdAt_idx" ON "BusinessAuditLog"("action", "createdAt");
CREATE INDEX "BusinessAuditLog_archivedAt_createdAt_idx" ON "BusinessAuditLog"("archivedAt", "createdAt");
