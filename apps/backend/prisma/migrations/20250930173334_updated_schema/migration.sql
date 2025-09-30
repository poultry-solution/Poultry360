-- CreateEnum
CREATE TYPE "SalesItemType" AS ENUM ('EGGS', 'Chicken_Meat', 'CHICKS', 'FEED', 'MEDICINE', 'EQUIPMENT', 'OTHER');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "itemType" "SalesItemType" NOT NULL DEFAULT 'Chicken_Meat',
ALTER COLUMN "weight" DROP NOT NULL;
