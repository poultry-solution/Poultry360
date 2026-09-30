export function parseFcrFreshDays(value: string | undefined, fallback = 3): number {
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const fcrFreshDays = parseFcrFreshDays(process.env.FCR_FRESH_DAYS);
