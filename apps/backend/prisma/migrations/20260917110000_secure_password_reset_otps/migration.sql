-- Previously issued plaintext OTPs must not remain valid after moving to hashed codes.
UPDATE "PasswordResetOtp" SET "used" = true WHERE "used" = false;

ALTER TABLE "PasswordResetOtp" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS "PasswordResetOtp_phone_otp_used_idx";
CREATE INDEX "PasswordResetOtp_phone_used_idx" ON "PasswordResetOtp"("phone", "used");
