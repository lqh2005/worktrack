import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";

export const idSchema = z
  .string({ required_error: "ID is required" })
  .trim()
  .min(1, "ID is required")
  .max(64, "ID is too long")
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid ID format");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, "page must be >= 1").default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, "pageSize must be >= 1")
    .max(MAX_PAGE_SIZE, `pageSize must be <= ${MAX_PAGE_SIZE}`)
    .default(DEFAULT_PAGE_SIZE),
});

export function csvEnum<T extends readonly [string, ...string[]]>(values: T) {
  return z
    .string()
    .transform((value) =>
      Array.from(
        new Set(
          value
            .split(",")
            .map((item) => item.trim().toUpperCase())
            .filter(Boolean),
        ),
      ),
    )
    .pipe(z.array(z.enum(values)).min(1));
}

export const booleanStringSchema = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1");

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const dateInputSchema = z
  .string()
  .trim()
  .refine((value) => DATE_ONLY.test(value) || !Number.isNaN(Date.parse(value)), {
    message: "Invalid date format (expected YYYY-MM-DD)",
  })
  .transform((value) =>
    DATE_ONLY.test(value) ? new Date(`${value}T00:00:00.000Z`) : new Date(value),
  )
  .refine((date) => {
    const year = date.getUTCFullYear();
    return year >= 2000 && year <= 2100;
  }, "Year must be between 2000 and 2100");
