import { InventoryItemType, Prisma } from "@prisma/client";
import prisma from "../utils/prisma";

const ALLOWED_OUTPUT_TYPES = new Set<InventoryItemType>([
  InventoryItemType.FEED,
  InventoryItemType.MEDICINE,
  InventoryItemType.EQUIPMENT,
  InventoryItemType.RAW_MATERIAL,
  InventoryItemType.OTHER,
]);

export class FarmerProductRequestError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "FarmerProductRequestError";
  }
}

const parseOutputItemType = (value: unknown) => {
  const type = String(value ?? "").trim() as InventoryItemType;
  if (!ALLOWED_OUTPUT_TYPES.has(type)) {
    throw new FarmerProductRequestError("Invalid product inventory category");
  }
  return type;
};

const parseMinStock = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new FarmerProductRequestError("minStock must be a non-negative number");
  }
  return new Prisma.Decimal(String(value));
};

export class FarmerProductService {
  static async list(
    farmerId: string,
    params: { page: number; limit: number; search?: string; includeArchived?: boolean }
  ) {
    const where: Prisma.FarmerManufacturedProductWhereInput = {
      farmerId,
      ...(params.includeArchived ? {} : { deletedAt: null }),
      ...(params.search
        ? { name: { contains: params.search, mode: "insensitive" } }
        : {}),
    };
    const [products, total] = await Promise.all([
      prisma.farmerManufacturedProduct.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { name: "asc" },
        include: {
          inventoryLots: {
            where: { deletedAt: null },
            select: {
              id: true,
              currentStock: true,
              unitPrice: true,
              origin: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.farmerManufacturedProduct.count({ where }),
    ]);

    return {
      products: products.map(({ inventoryLots, ...product }) => ({
        ...product,
        currentStock: inventoryLots.reduce(
          (sum, lot) => sum.plus(lot.currentStock),
          new Prisma.Decimal(0)
        ),
        lotCount: inventoryLots.length,
        inventoryLots,
      })),
      total,
    };
  }

  static async create(farmerId: string, input: Record<string, unknown>) {
    const name = String(input.name ?? "").trim();
    const unit = String(input.unit ?? "kg").trim();
    const outputItemType = parseOutputItemType(input.outputItemType);
    const minStock = parseMinStock(input.minStock);
    if (!name) throw new FarmerProductRequestError("name is required");
    if (!unit) throw new FarmerProductRequestError("unit is required");

    const duplicate = await prisma.farmerManufacturedProduct.findFirst({
      where: {
        farmerId,
        name: { equals: name, mode: "insensitive" },
        unit: { equals: unit, mode: "insensitive" },
        outputItemType,
      },
    });
    if (duplicate && !duplicate.deletedAt) {
      throw new FarmerProductRequestError(
        "A Self Feed product with this name, unit, and category already exists",
        409
      );
    }
    if (duplicate?.deletedAt) {
      return prisma.farmerManufacturedProduct.update({
        where: { id: duplicate.id },
        data: { name, unit, outputItemType, minStock, deletedAt: null },
      });
    }

    return prisma.farmerManufacturedProduct.create({
      data: { farmerId, name, unit, outputItemType, minStock },
    });
  }

  static async update(
    farmerId: string,
    productId: string,
    input: Record<string, unknown>
  ) {
    const product = await prisma.farmerManufacturedProduct.findFirst({
      where: { id: productId, farmerId, deletedAt: null },
    });
    if (!product) throw new FarmerProductRequestError("Self Feed product not found", 404);

    const name = input.name === undefined ? product.name : String(input.name).trim();
    const unit = input.unit === undefined ? product.unit : String(input.unit).trim();
    const outputItemType =
      input.outputItemType === undefined
        ? product.outputItemType
        : parseOutputItemType(input.outputItemType);
    const parsedMinStock = parseMinStock(input.minStock);
    if (!name || !unit) {
      throw new FarmerProductRequestError("name and unit are required");
    }

    const productionCount = await prisma.farmerProductionOutput.count({
      where: { productId: product.id },
    });
    if (
      productionCount > 0 &&
      (unit !== product.unit || outputItemType !== product.outputItemType)
    ) {
      throw new FarmerProductRequestError(
        "Unit and inventory category cannot change after production history exists",
        409
      );
    }

    const duplicate = await prisma.farmerManufacturedProduct.findFirst({
      where: {
        id: { not: product.id },
        farmerId,
        name: { equals: name, mode: "insensitive" },
        unit: { equals: unit, mode: "insensitive" },
        outputItemType,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new FarmerProductRequestError(
        "A Self Feed product with this name, unit, and category already exists",
        409
      );
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.farmerManufacturedProduct.update({
        where: { id: product.id },
        data: {
          name,
          unit,
          outputItemType,
          minStock:
            parsedMinStock === undefined ? product.minStock : parsedMinStock,
        },
      });
      if (name !== product.name || parsedMinStock !== undefined) {
        await tx.inventoryItem.updateMany({
          where: {
            userId: farmerId,
            manufacturedProductId: product.id,
            deletedAt: null,
          },
          data: {
            ...(name !== product.name ? { name } : {}),
            ...(parsedMinStock !== undefined
              ? { minStock: parsedMinStock }
              : {}),
          },
        });
      }
      return updated;
    });
  }

  static async archive(farmerId: string, productId: string) {
    const product = await prisma.farmerManufacturedProduct.findFirst({
      where: { id: productId, farmerId, deletedAt: null },
      include: {
        inventoryLots: {
          where: { deletedAt: null },
          select: { currentStock: true },
        },
      },
    });
    if (!product) throw new FarmerProductRequestError("Self Feed product not found", 404);
    const stock = product.inventoryLots.reduce(
      (sum, lot) => sum.plus(lot.currentStock),
      new Prisma.Decimal(0)
    );
    if (stock.gt(0)) {
      throw new FarmerProductRequestError(
        "Use all remaining stock before archiving this product",
        409
      );
    }
    await prisma.farmerManufacturedProduct.update({
      where: { id: product.id },
      data: { deletedAt: new Date() },
    });
    return { id: product.id };
  }
}
