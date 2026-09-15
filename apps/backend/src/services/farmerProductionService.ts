import {
  InventoryItemType,
  InventoryOrigin,
  InventoryTransactionType,
  Prisma,
} from "@prisma/client";
import prisma from "../utils/prisma";
import {
  ensureFarmerInventoryCategory,
  getFarmerInventoryUnitCosts,
} from "./farmerInventoryDomain";
import {
  allocateProductionCost,
  normalizeMaterialProductionRequest,
  normalizeProductionDate,
} from "./productionDomain";

export class FarmerProductionRequestError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "FarmerProductionRequestError";
  }
}

type CreateFarmerProductionData = {
  farmerId: string;
  createdById?: string;
  date?: unknown;
  referenceNumber?: unknown;
  notes?: unknown;
  inputs: unknown;
  outputs: unknown;
};

const productionInclude = {
  inputs: {
    include: { inventoryItem: true },
    orderBy: { createdAt: "asc" as const },
  },
  outputs: {
    include: { product: true, inventoryItem: true },
    orderBy: { createdAt: "asc" as const },
  },
};

export class FarmerProductionService {
  static async create(data: CreateFarmerProductionData) {
    const { inputs, outputs } = normalizeMaterialProductionRequest(
      data.inputs,
      data.outputs
    );
    const runDate = normalizeProductionDate(data.date);

    try {
      return await prisma.$transaction(
        async (tx) => {
          const [inventoryItems, products] = await Promise.all([
            tx.inventoryItem.findMany({
              where: {
                id: { in: inputs.map((input) => input.inventoryItemId) },
                userId: data.farmerId,
                itemType: InventoryItemType.RAW_MATERIAL,
                deletedAt: null,
              },
            }),
            tx.farmerManufacturedProduct.findMany({
              where: {
                id: { in: outputs.map((output) => output.productId) },
                farmerId: data.farmerId,
                deletedAt: null,
              },
            }),
          ]);

          if (inventoryItems.length !== inputs.length) {
            throw new FarmerProductionRequestError(
              "One or more raw-material lots are invalid or do not belong to this account"
            );
          }
          if (products.length !== outputs.length) {
            throw new FarmerProductionRequestError(
              "One or more Self Feed products are invalid or archived"
            );
          }

          const itemMap = new Map(inventoryItems.map((item) => [item.id, item]));
          const productMap = new Map(products.map((product) => [product.id, product]));
          const unitCosts = await getFarmerInventoryUnitCosts(
            tx,
            inputs.map((input) => input.inventoryItemId)
          );
          const inputCosts = inputs.map((input) => {
            const item = itemMap.get(input.inventoryItemId)!;
            const unitCost = unitCosts.get(item.id) ?? new Prisma.Decimal(item.unitPrice ?? 0);
            const amount = input.quantity.mul(unitCost).toDecimalPlaces(2);
            return { ...input, item, unitCost, amount };
          });
          const totalInputCost = inputCosts.reduce(
            (sum, input) => sum.plus(input.amount),
            new Prisma.Decimal(0)
          );
          const allocations = allocateProductionCost(totalInputCost, outputs);

          const categoryByType = new Map<InventoryItemType, string>();
          for (const product of products) {
            if (!categoryByType.has(product.outputItemType)) {
              const category = await ensureFarmerInventoryCategory(
                tx,
                data.farmerId,
                product.outputItemType
              );
              categoryByType.set(product.outputItemType, category.id);
            }
          }

          const run = await tx.farmerProductionRun.create({
            data: {
              farmerId: data.farmerId,
              createdById: data.createdById ?? data.farmerId,
              date: runDate,
              referenceNumber: String(data.referenceNumber ?? "").trim() || null,
              notes: String(data.notes ?? "").trim() || null,
            },
          });

          for (const input of inputCosts) {
            const updated = await tx.inventoryItem.updateMany({
              where: {
                id: input.inventoryItemId,
                userId: data.farmerId,
                itemType: InventoryItemType.RAW_MATERIAL,
                currentStock: { gte: input.quantity },
                deletedAt: null,
              },
              data: { currentStock: { decrement: input.quantity } },
            });
            if (updated.count !== 1) {
              throw new FarmerProductionRequestError(
                `Insufficient stock for ${input.item.name}. Available: ${input.item.currentStock}, required: ${input.quantity}`,
                409
              );
            }

            const inventoryTxn = await tx.inventoryTransaction.create({
              data: {
                itemId: input.inventoryItemId,
                type: InventoryTransactionType.PRODUCTION_INPUT,
                quantity: input.quantity,
                unitPrice: input.unitCost,
                totalAmount: input.amount,
                date: runDate,
                unit: input.item.unit,
                description: `Used in production${run.referenceNumber ? ` ${run.referenceNumber}` : ""}`,
              },
            });
            await tx.farmerProductionInput.create({
              data: {
                productionId: run.id,
                inventoryItemId: input.inventoryItemId,
                inventoryTxnId: inventoryTxn.id,
                quantity: input.quantity,
                unitCost: input.unitCost,
                amount: input.amount,
              },
            });
          }

          for (const [index, output] of outputs.entries()) {
            const product = productMap.get(output.productId)!;
            const allocation = allocations[index];
            const inventoryItem = await tx.inventoryItem.create({
              data: {
                userId: data.farmerId,
                categoryId: categoryByType.get(product.outputItemType)!,
                itemType: product.outputItemType,
                origin: InventoryOrigin.SELF_MADE,
                name: product.name,
                unit: product.unit,
                currentStock: output.quantity,
                minStock: product.minStock,
                unitPrice: allocation.unitCost.toDecimalPlaces(2),
                supplierKey: `PRODUCTION:${run.id}:${product.id}`,
                manufacturedProductId: product.id,
              },
            });
            const inventoryTxn = await tx.inventoryTransaction.create({
              data: {
                itemId: inventoryItem.id,
                type: InventoryTransactionType.PRODUCTION_OUTPUT,
                quantity: output.quantity,
                unitPrice: allocation.unitCost.toDecimalPlaces(2),
                totalAmount: allocation.amount,
                date: runDate,
                unit: product.unit,
                description: `Created by production${run.referenceNumber ? ` ${run.referenceNumber}` : ""}`,
              },
            });
            await tx.farmerProductionOutput.create({
              data: {
                productionId: run.id,
                productId: product.id,
                inventoryItemId: inventoryItem.id,
                inventoryTxnId: inventoryTxn.id,
                quantity: output.quantity,
                costAllocationPercent: output.percentage,
                unitCost: allocation.unitCost,
                amount: allocation.amount,
              },
            });
          }

          return tx.farmerProductionRun.findUniqueOrThrow({
            where: { id: run.id },
            include: productionInclude,
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 20000,
        }
      );
    } catch (error: any) {
      if (error?.code === "P2034") {
        throw new FarmerProductionRequestError(
          "Inventory changed while production was being recorded. Please try again.",
          409
        );
      }
      throw error;
    }
  }

  static async remove(farmerId: string, productionId: string) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const run = await tx.farmerProductionRun.findFirst({
            where: { id: productionId, farmerId },
            include: {
              inputs: true,
              outputs: {
                include: {
                  product: true,
                  inventoryItem: {
                    include: {
                      transactions: { select: { id: true } },
                      usages: { select: { id: true } },
                      entityTransactions: { select: { id: true } },
                    },
                  },
                },
              },
            },
          });
          if (!run) {
            throw new FarmerProductionRequestError("Production run not found", 404);
          }

          for (const output of run.outputs) {
            const untouched =
              new Prisma.Decimal(output.inventoryItem.currentStock).equals(output.quantity) &&
              output.inventoryItem.transactions.length === 1 &&
              output.inventoryItem.transactions[0]?.id === output.inventoryTxnId &&
              output.inventoryItem.usages.length === 0 &&
              output.inventoryItem.entityTransactions.length === 0 &&
              output.inventoryItem.deletedAt === null;
            if (!untouched) {
              throw new FarmerProductionRequestError(
                `Cannot reverse production because ${output.product.name} has already been used or adjusted`,
                409
              );
            }
          }

          for (const input of run.inputs) {
            const restored = await tx.inventoryItem.updateMany({
              where: { id: input.inventoryItemId, userId: farmerId, deletedAt: null },
              data: { currentStock: { increment: input.quantity } },
            });
            if (restored.count !== 1) {
              throw new FarmerProductionRequestError(
                "A consumed raw-material lot is no longer available, so this run cannot be reversed",
                409
              );
            }
          }

          const transactionIds = [
            ...run.inputs.map((input) => input.inventoryTxnId),
            ...run.outputs.map((output) => output.inventoryTxnId),
          ];
          const outputItemIds = run.outputs.map((output) => output.inventoryItemId);
          await tx.farmerProductionRun.delete({ where: { id: run.id } });
          if (transactionIds.length) {
            await tx.inventoryTransaction.deleteMany({
              where: { id: { in: transactionIds } },
            });
          }
          if (outputItemIds.length) {
            await tx.inventoryItem.deleteMany({
              where: { id: { in: outputItemIds }, userId: farmerId },
            });
          }

          return { id: run.id };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 20000,
        }
      );
    } catch (error: any) {
      if (error?.code === "P2034") {
        throw new FarmerProductionRequestError(
          "Inventory changed while production was being reversed. Please try again.",
          409
        );
      }
      throw error;
    }
  }

  static async list(
    farmerId: string,
    params: { page: number; limit: number; search?: string }
  ) {
    const where: Prisma.FarmerProductionRunWhereInput = {
      farmerId,
      ...(params.search
        ? {
            OR: [
              {
                referenceNumber: {
                  contains: params.search,
                  mode: "insensitive",
                },
              },
              { notes: { contains: params.search, mode: "insensitive" } },
              {
                outputs: {
                  some: {
                    product: {
                      name: { contains: params.search, mode: "insensitive" },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [runs, total] = await Promise.all([
      prisma.farmerProductionRun.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: productionInclude,
      }),
      prisma.farmerProductionRun.count({ where }),
    ]);
    return { runs, total };
  }

  static async getById(farmerId: string, id: string) {
    const run = await prisma.farmerProductionRun.findFirst({
      where: { id, farmerId },
      include: productionInclude,
    });
    if (!run) {
      throw new FarmerProductionRequestError("Production run not found", 404);
    }
    return run;
  }
}
