-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "gender" "public"."Gender" NOT NULL DEFAULT 'OTHER';
