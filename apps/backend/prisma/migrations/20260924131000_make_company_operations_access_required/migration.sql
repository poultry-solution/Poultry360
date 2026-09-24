-- Company operations is the baseline capability for every Company staff login.
-- Preserve all existing optional permissions while restoring it for older accounts.
UPDATE "StaffUser"
SET "permissions" = array_append("permissions", 'COMPANY_MANAGE_OPERATIONS'::"StaffPermission")
WHERE "accountRole" = 'COMPANY'
  AND NOT ('COMPANY_MANAGE_OPERATIONS'::"StaffPermission" = ANY("permissions"));
