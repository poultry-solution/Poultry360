CREATE TABLE "AuditSecurityMetadata" (
    "id" TEXT NOT NULL,
    "auditLogId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "browserFamily" TEXT NOT NULL,
    "operatingSystem" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "countryCode" TEXT,
    "region" TEXT,
    "locationSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AuditSecurityMetadata_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuditSecurityMetadata_auditLogId_key" ON "AuditSecurityMetadata"("auditLogId");
CREATE INDEX "AuditSecurityMetadata_expiresAt_idx" ON "AuditSecurityMetadata"("expiresAt");

ALTER TABLE "AuditSecurityMetadata"
  ADD CONSTRAINT "AuditSecurityMetadata_auditLogId_fkey"
  FOREIGN KEY ("auditLogId") REFERENCES "BusinessAuditLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
