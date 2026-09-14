import { Prisma } from "@prisma/client";

export const positiveDecimal = (value: unknown, field: string) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${field} must be greater than 0`);
  return new Prisma.Decimal(String(value));
};

export const allocateProductionCost = (
  totalCost: Prisma.Decimal,
  outputs: Array<{ quantity: Prisma.Decimal; percentage: Prisma.Decimal }>
) => {
  const totalPercentage = outputs.reduce((sum, output) => sum.plus(output.percentage), new Prisma.Decimal(0));
  if (!totalPercentage.equals(100)) throw new Error("Output allocation percentages must total 100");

  let allocated = new Prisma.Decimal(0);
  return outputs.map((output, index) => {
    const amount = index === outputs.length - 1
      ? totalCost.minus(allocated).toDecimalPlaces(2)
      : totalCost.mul(output.percentage).div(100).toDecimalPlaces(2);
    allocated = allocated.plus(amount);
    return { amount, unitCost: amount.div(output.quantity).toDecimalPlaces(4) };
  });
};
