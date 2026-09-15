import { Prisma } from "@prisma/client";

export class ProductionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductionValidationError";
  }
}

export const positiveDecimal = (value: unknown, field: string) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new ProductionValidationError(`${field} must be greater than 0`);
  }
  return new Prisma.Decimal(String(value));
};

export type NormalizedProductionInput = {
  inventoryItemId: string;
  quantity: Prisma.Decimal;
};

export type NormalizedProductionOutput = {
  productId: string;
  quantity: Prisma.Decimal;
  percentage: Prisma.Decimal;
};

export const normalizeMaterialProductionRequest = (
  rawInputs: unknown,
  rawOutputs: unknown
): { inputs: NormalizedProductionInput[]; outputs: NormalizedProductionOutput[] } => {
  if (!Array.isArray(rawInputs) || rawInputs.length === 0) {
    throw new ProductionValidationError("At least one raw material is required");
  }
  if (!Array.isArray(rawOutputs) || rawOutputs.length === 0) {
    throw new ProductionValidationError("At least one produced product is required");
  }

  const inputMap = new Map<string, Prisma.Decimal>();
  rawInputs.forEach((row, index) => {
    const item = row as Record<string, unknown>;
    const inventoryItemId = String(item.inventoryItemId ?? "").trim();
    if (!inventoryItemId) {
      throw new ProductionValidationError(
        `inputs[${index}].inventoryItemId is required`
      );
    }
    const quantity = positiveDecimal(item.quantity, `inputs[${index}].quantity`);
    inputMap.set(
      inventoryItemId,
      (inputMap.get(inventoryItemId) ?? new Prisma.Decimal(0)).plus(quantity)
    );
  });

  const outputMap = new Map<
    string,
    { quantity: Prisma.Decimal; percentage: Prisma.Decimal }
  >();
  rawOutputs.forEach((row, index) => {
    const item = row as Record<string, unknown>;
    const productId = String(item.productId ?? "").trim();
    if (!productId) {
      throw new ProductionValidationError(`outputs[${index}].productId is required`);
    }
    const quantity = positiveDecimal(item.quantity, `outputs[${index}].quantity`);
    const percentage = positiveDecimal(
      item.costAllocationPercent ?? (rawOutputs.length === 1 ? 100 : undefined),
      `outputs[${index}].costAllocationPercent`
    );
    const existing = outputMap.get(productId);
    outputMap.set(productId, {
      quantity: (existing?.quantity ?? new Prisma.Decimal(0)).plus(quantity),
      percentage: (existing?.percentage ?? new Prisma.Decimal(0)).plus(percentage),
    });
  });

  return {
    inputs: [...inputMap].map(([inventoryItemId, quantity]) => ({
      inventoryItemId,
      quantity,
    })),
    outputs: [...outputMap].map(([productId, values]) => ({
      productId,
      quantity: values.quantity,
      percentage: values.percentage,
    })),
  };
};

export const normalizeProductionDate = (value: unknown) => {
  const date = value ? new Date(String(value)) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new ProductionValidationError("Invalid production date");
  }
  return date;
};

export const calculateCurrentUnitCost = (
  lots: Array<{
    currentStock: Prisma.Decimal | number | string;
    unitCost: Prisma.Decimal | number | string | null | undefined;
  }>
) => {
  let totalStock = new Prisma.Decimal(0);
  let totalValue = new Prisma.Decimal(0);

  for (const lot of lots) {
    if (lot.unitCost === null || lot.unitCost === undefined) continue;
    const stock = new Prisma.Decimal(lot.currentStock);
    const unitCost = new Prisma.Decimal(lot.unitCost);
    if (stock.gt(0)) {
      totalStock = totalStock.plus(stock);
      totalValue = totalValue.plus(stock.mul(unitCost));
    }
  }

  if (totalStock.gt(0)) {
    return totalValue.div(totalStock).toDecimalPlaces(4);
  }

  const latestKnownCost = lots.find(
    (lot) => lot.unitCost !== null && lot.unitCost !== undefined
  )?.unitCost;
  return latestKnownCost === undefined || latestKnownCost === null
    ? null
    : new Prisma.Decimal(latestKnownCost).toDecimalPlaces(4);
};

export const allocateProductionCost = (
  totalCost: Prisma.Decimal,
  outputs: Array<{ quantity: Prisma.Decimal; percentage: Prisma.Decimal }>
) => {
  const totalPercentage = outputs.reduce((sum, output) => sum.plus(output.percentage), new Prisma.Decimal(0));
  if (!totalPercentage.equals(100)) {
    throw new ProductionValidationError(
      "Output allocation percentages must total 100"
    );
  }

  let allocated = new Prisma.Decimal(0);
  return outputs.map((output, index) => {
    const amount = index === outputs.length - 1
      ? totalCost.minus(allocated).toDecimalPlaces(2)
      : totalCost.mul(output.percentage).div(100).toDecimalPlaces(2);
    allocated = allocated.plus(amount);
    return { amount, unitCost: amount.div(output.quantity).toDecimalPlaces(4) };
  });
};
