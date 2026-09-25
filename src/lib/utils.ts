import { clsx, type ClassValue } from 'clsx'

/**
 * Joins class names. It does not resolve conflicts: two utilities for the same property both stay,
 * and Tailwind's stylesheet order, not their order here, decides which applies. Give each element
 * one class per property, choosing between alternatives with a ternary or a variant.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
