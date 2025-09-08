-- AlterTable
ALTER TABLE "public"."Expense" ALTER COLUMN "farmId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Sale" ALTER COLUMN "farmId" DROP NOT NULL;
