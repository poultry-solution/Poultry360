import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
// import { User, UserSchema } from "@myapp/shared-types" // Removed - no longer using shared packages

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// TODO: Implement user validation when needed
// export function validateUser(user: User) {
//   return UserSchema.safeParse(user)
// }

// Date helpers (local timezone, UI-friendly)
export function getTodayLocalDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function getNowLocalDateTime(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${y}-${m}-${day}T${hh}:${mm}`
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Exact money for ledger rows: "रू 1,13,100" (lakh commas), paisa only when it is not zero. */
export function formatRupeesExact(value: unknown): string {
  const n = Number(value || 0)
  const hasPaisa = Math.round(Math.abs(n) * 100) % 100 !== 0
  const text = Math.abs(n).toLocaleString("en-IN", {
    minimumFractionDigits: hasPaisa ? 2 : 0,
    maximumFractionDigits: 2,
  })
  return `${n < 0 ? "-" : ""}रू ${text}`
}

/** Money on printed bills: "रू 56,500.00" (lakh commas, always 2 decimals). */
export function formatBillMoney(value: unknown): string {
  const n = Number(value || 0)
  const safe = Number.isFinite(n) ? n : 0
  const text = Math.abs(safe).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${safe < 0 ? "-" : ""}रू ${text}`
}

/** Rate per unit: "रू 3,900 / Bag" (lakh commas, up to 4 decimals, none when whole). */
export function formatRatePerUnit(rate: unknown, unit?: string | null): string {
  const value = Number(rate || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 4 })
  return `रू ${value}${unit ? ` / ${unit}` : ""}`
}

/** Plain amount with lakh commas: 1250.5 → "1,250.5". */
export function formatQuantity(value: unknown): string {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 })
}

/** Up to 10 local digits of a Nepal phone ("+977 98…", "977…", "98…") for the +977 box. */
export function nepalPhoneDigits(raw: unknown): string {
  let digits = String(raw ?? "").replace(/\D/g, "")
  if (digits.length === 13 && digits.startsWith("977")) digits = digits.slice(3)
  return digits.slice(-10)
}

/** "+977 9812345678" for a +977 / 977 / 10-digit number; anything else as it is. */
export function formatNepalPhone(raw: unknown): string {
  const text = String(raw ?? "").trim()
  const digits = text.replace(/\D/g, "")
  if (/^(977)?\d{10}$/.test(digits) && (digits.length === 10 || digits.startsWith("977"))) {
    return `+977 ${digits.slice(-10)}`
  }
  return text
}
