-- Add ARCHIVED state to staff status enum.
ALTER TYPE "StaffStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';
