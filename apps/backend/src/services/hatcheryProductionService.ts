import {
  HatcheryInventoryItemType,
  HatcheryInventoryTxnType,
  Prisma,
} from "@prisma/client";
import prisma from "../utils/prisma";
import {
  allocateProductionCost,
  normalizeMaterialProductionRequest,
  normalizeProductionDate,
} from "./productionDomain";

export class ProductionRequestError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

type CreateProductionData = {
  hatcheryOwnerId: string;
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

export class HatcheryProductionService {
  static async create(data: CreateProductionData) {
    const { inputs, outputs } = normalizeMaterialProductionRequest(
      data.inputs,
      data.outputs
    );
    const runDate = normalizeProductionDate(data.date);

    try {
      return await prisma.$transaction(async (tx) => {
        const [inventoryItems, products] = await Promise.all([
          tx.hatcheryInventoryItem.findMany({
            where: {
              id: { in: inputs.map((input) => input.inventoryItemId) },
              hatcheryOwnerId: data.hatcheryOwnerId,
              itemType: HatcheryInventoryItemType.RAW_MATERIAL,
              deletedAt: null,
            },
          }),
          tx.hatcheryManufacturedProduct.findMany({
            where: {
              id: { in: outputs.map((output) => output.productId) },
              hatcheryOwnerId: data.hatcheryOwnerId,
              deletedAt: null,
            },
          }),
        ]);
        if (inventoryItems.length !== inputs.length) {
          throw new ProductionRequestError("One or more raw-material lots are invalid or do not belong to this hatchery");
        }
        if (products.length !== outputs.length) {
          throw new ProductionRequestError("One or more Self Feed products are invalid or archived");
        }

        const itemMap = new Map(inventoryItems.map((item) => [item.id, item]));
        const productMap = new Map(products.map((product) => [product.id, product]));
        const inputCosts = inputs.map((input) => {
          const item = itemMap.get(input.inventoryItemId)!;
          const unitCost = new Prisma.Decimal(item.effectiveUnitCost ?? item.unitPrice);
          return { ...input, item, unitCost, amount: input.quantity.mul(unitCost).toDecimalPlaces(2) };
        });
        const totalInputCost = inputCosts.reduce((sum, input) => sum.plus(input.amount), new Prisma.Decimal(0));
        const allocations = allocateProductionCost(totalInputCost, outputs);

        const run = await tx.hatcheryProductionRun.create({
          data: {
            hatcheryOwnerId: data.hatcheryOwnerId,
            date: runDate,
            referenceNumber: String(data.referenceNumber ?? "").trim() || null,
            notes: String(data.notes ?? "").trim() || null,
          },
        });

        for (const input of inputCosts) {
          const updated = await tx.hatcheryInventoryItem.updateMany({
            where: {
              id: input.inventoryItemId,
              hatcheryOwnerId: data.hatcheryOwnerId,
              currentStock: { gte: input.quantity },
              deletedAt: null,
            },
            data: { currentStock: { decrement: input.quantity } },
          });
          if (updated.count !== 1) {
            throw new ProductionRequestError(
              `Insufficient stock for ${input.item.name}. Available: ${input.item.currentStock}, required: ${input.quantity}`,
              409
            );
          }
          const inventoryTxn = await tx.hatcheryInventoryTxn.create({
            data: {
              itemId: input.inventoryItemId,
              type: HatcheryInventoryTxnType.PRODUCTION_INPUT,
              quantity: input.quantity,
              unitPrice: input.unitCost,
              amount: input.amount,
              date: runDate,
              note: `Used in production${run.referenceNumber ? ` ${run.referenceNumber}` : ""}`,
            },
          });
          await tx.hatcheryProductionInput.create({
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
          const inventoryItem = await tx.hatcheryInventoryItem.create({
            data: {
              hatcheryOwnerId: data.hatcheryOwnerId,
              itemType: HatcheryInventoryItemType.SELF_MADE,
              name: product.name,
              unit: product.unit,
              unitPrice: allocation.unitCost,
              effectiveUnitCost: allocation.unitCost,
              supplierKey: `PRODUCTION:${run.id}:${product.id}`,
              currentStock: output.quantity,
              manufacturedProductId: product.id,
            },
          });
          const inventoryTxn = await tx.hatcheryInventoryTxn.create({
            data: {
              itemId: inventoryItem.id,
              type: HatcheryInventoryTxnType.PRODUCTION_OUTPUT,
              quantity: output.quantity,
              unitPrice: allocation.unitCost,
              amount: allocation.amount,
              date: runDate,
              note: `Created by production${run.referenceNumber ? ` ${run.referenceNumber}` : ""}`,
            },
          });
          await tx.hatcheryProductionOutput.create({
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

        return tx.hatcheryProductionRun.findUniqueOrThrow({ where: { id: run.id }, include: productionInclude });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000 });
    } catch (error: any) {
      if (error?.code === "P2034") throw new ProductionRequestError("Inventory changed while production was being recorded. Please try again.", 409);
      throw error;
    }
  }

  static async remove(hatcheryOwnerId: string, productionId: string) {
    try {
      return await prisma.$transaction(async (tx) => {
        const run = await tx.hatcheryProductionRun.findFirst({
          where: { id: productionId, hatcheryOwnerId },
          include: {
            inputs: true,
            outputs: { include: { inventoryItem: { include: { transactions: { select: { id: true } } } }, product: true } },
          },
        });
        if (!run) throw new ProductionRequestError("Production run not found", 404);

        for (const output of run.outputs) {
          const untouched = new Prisma.Decimal(output.inventoryItem.currentStock).equals(output.quantity)
            && output.inventoryItem.transactions.length === 1
            && output.inventoryItem.transactions[0]?.id === output.inventoryTxnId;
          if (!untouched) {
            throw new ProductionRequestError(
              `Cannot reverse production because ${output.product.name} has already been used or adjusted`,
              409
            );
          }
        }

        for (const input of run.inputs) {
          await tx.hatcheryInventoryItem.update({
            where: { id: input.inventoryItemId },
            data: { currentStock: { increment: input.quantity } },
          });
        }

        const inputTxnIds = run.inputs.map((input) => input.inventoryTxnId);
        const outputItemIds = run.outputs.map((output) => output.inventoryItemId);
        await tx.hatcheryProductionRun.delete({ where: { id: run.id } });
        if (inputTxnIds.length) await tx.hatcheryInventoryTxn.deleteMany({ where: { id: { in: inputTxnIds } } });
        if (outputItemIds.length) await tx.hatcheryInventoryItem.deleteMany({ where: { id: { in: outputItemIds } } });

        return { id: run.id };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000 });
    } catch (error: any) {
      if (error?.code === "P2034") throw new ProductionRequestError("Inventory changed while production was being reversed. Please try again.", 409);
      throw error;
    }
  }

  static async list(hatcheryOwnerId: string, params: { page: number; limit: number; search?: string }) {
    const where: Prisma.HatcheryProductionRunWhereInput = {
      hatcheryOwnerId,
      ...(params.search ? {
        OR: [
          { referenceNumber: { contains: params.search, mode: "insensitive" } },
          { notes: { contains: params.search, mode: "insensitive" } },
          { outputs: { some: { product: { name: { contains: params.search, mode: "insensitive" } } } } },
        ],
      } : {}),
    };
    const [runs, total] = await Promise.all([
      prisma.hatcheryProductionRun.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: productionInclude,
      }),
      prisma.hatcheryProductionRun.count({ where }),
    ]);
    return { runs, total };
  }

  static async getById(hatcheryOwnerId: string, id: string) {
    const run = await prisma.hatcheryProductionRun.findFirst({
      where: { id, hatcheryOwnerId },
      include: productionInclude,
    });
    if (!run) throw new ProductionRequestError("Production run not found", 404);
    return run;
  }
}
