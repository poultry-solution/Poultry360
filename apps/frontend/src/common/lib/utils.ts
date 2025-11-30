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
