import prisma from "../utils/prisma";

// One cFCR standard per farmer account. Every broiler batch uses it, so batches
// sold at different weights can be compared fairly.
// cFCR = FCR + (target weight - average weight) x correction per kg.
// Default = the common South Asia rule: FCR + (2 - average weight) / 4.
export const CFCR_DEFAULT_TARGET_KG = 2;
export const CFCR_DEFAULT_CORRECTION_PER_KG = 0.25;
export const CFCR_TARGET_MIN_KG = 1;
export const CFCR_TARGET_MAX_KG = 4;
export const CFCR_CORRECTION_MIN = 0;
export const CFCR_CORRECTION_MAX = 1;

export interface FarmerFcrSettings {
  targetWeightKg: number;
  correctionFactorPerKg: number;
  isDefault: boolean;
}

export async function getFarmerFcrSettings(ownerId: string): Promise<FarmerFcrSettings> {
  const row = await prisma.farmerFcrSettings.findUnique({ where: { ownerId } });
  if (!row) {
    return {
      targetWeightKg: CFCR_DEFAULT_TARGET_KG,
      correctionFactorPerKg: CFCR_DEFAULT_CORRECTION_PER_KG,
      isDefault: true,
    };
  }
  return {
    targetWeightKg: Number(row.cfcrTargetWeightKg),
    correctionFactorPerKg: Number(row.cfcrCorrectionFactorPerKg),
    isDefault: false,
  };
}

const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places;

/** Checks the input. Returns clean numbers, or a simple error message for the user. */
export function parseFarmerFcrSettings(body: unknown):
  | { targetWeightKg: number; correctionFactorPerKg: number }
  | { error: string } {
  const input = (body ?? {}) as Record<string, unknown>;
  const target = typeof input.targetWeightKg === "string" || typeof input.targetWeightKg === "number"
    ? Number(input.targetWeightKg)
    : NaN;
  const correction = typeof input.correctionFactorPerKg === "string" || typeof input.correctionFactorPerKg === "number"
    ? Number(input.correctionFactorPerKg)
    : NaN;
  if (!Number.isFinite(target) || target < CFCR_TARGET_MIN_KG || target > CFCR_TARGET_MAX_KG) {
    return { error: `Target weight must be between ${CFCR_TARGET_MIN_KG} and ${CFCR_TARGET_MAX_KG} kg.` };
  }
  if (!Number.isFinite(correction) || correction < CFCR_CORRECTION_MIN || correction > CFCR_CORRECTION_MAX) {
    return { error: `Correction per kg must be between ${CFCR_CORRECTION_MIN} and ${CFCR_CORRECTION_MAX}.` };
  }
  return { targetWeightKg: round(target, 3), correctionFactorPerKg: round(correction, 4) };
}

export async function saveFarmerFcrSettings(
  ownerId: string,
  values: { targetWeightKg: number; correctionFactorPerKg: number },
  updatedById: string | null,
): Promise<FarmerFcrSettings> {
  await prisma.farmerFcrSettings.upsert({
    where: { ownerId },
    create: {
      ownerId,
      cfcrTargetWeightKg: values.targetWeightKg,
      cfcrCorrectionFactorPerKg: values.correctionFactorPerKg,
      updatedById,
    },
    update: {
      cfcrTargetWeightKg: values.targetWeightKg,
      cfcrCorrectionFactorPerKg: values.correctionFactorPerKg,
      updatedById,
    },
  });
  return getFarmerFcrSettings(ownerId);
}
