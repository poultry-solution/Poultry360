-- Hatchery operations is the baseline capability for every Hatchery staff login.
-- Preserve all existing optional permissions while restoring it for older accounts.
UPDATE "StaffUser"
SET "permissions" = array_append("permissions", 'HATCHERY_MANAGE_OPERATIONS'::"StaffPermission")
WHERE "accountRole" = 'HATCHERY'
  AND NOT ('HATCHERY_MANAGE_OPERATIONS'::"StaffPermission" = ANY("permissions"));
