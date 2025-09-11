import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { User, UserSchema } from "@myapp/shared-types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function validateUser(user: User) {
  return UserSchema.safeParse(user)
}
