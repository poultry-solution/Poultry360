-- Company Cash & Bank: two auto-post source types and one staff permission.
-- Additive only.
ALTER TYPE "public"."CashSourceType" ADD VALUE 'COMPANY_DEALER_PAYMENT';
ALTER TYPE "public"."CashSourceType" ADD VALUE 'COMPANY_SUPPLIER_PAYMENT';
ALTER TYPE "public"."StaffPermission" ADD VALUE 'COMPANY_VIEW_CASH_HISTORY';
