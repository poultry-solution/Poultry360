import prisma from "../utils/prisma";
import { SalesItemType } from "@prisma/client";

// Map SalesItemType to default SALES category names
const ITEMTYPE_TO_CATEGORY_NAME: Record<SalesItemType, string> = {
  Chicken_Meat: "Chicken Sales",
  CHICKS: "Chick Sales",
  FEED: "Feed Sales",
  MEDICINE: "Medicine Sales",
  OTHER: "Other Sales",
  EGGS: "Egg Sales",
  EQUIPMENT: "Equipment Sales",
};

/**
 * Return the SALES category id for a given user and SalesItemType.
 * - Finds an existing category by mapped name; if missing, creates it.
 */
export async function getSalesCategoryIdForItemType(
  userId: string,
  itemType: SalesItemType
): Promise<string> {
  const categoryName = ITEMTYPE_TO_CATEGORY_NAME[itemType] || "Other Sales";

  // Try to find existing category
  const existing = await prisma.category.findFirst({
    where: {
      userId,
      type: "SALES",
      name: categoryName,
    },
    select: { id: true },
  });
  if (existing?.id) return existing.id;

  // Create if not found
  const created = await prisma.category.create({
    data: {
      name: categoryName,
      type: "SALES",
      description: null,
      userId,
    },
    select: { id: true },
  });
  return created.id;
}


