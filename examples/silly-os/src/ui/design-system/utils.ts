// SPDX-License-Identifier: MIT
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combines product-local utility classes without exposing Tailwind as an engine contract. */
export function cnV1(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
