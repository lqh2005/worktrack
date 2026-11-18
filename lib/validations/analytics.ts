import { z } from "zod";
import { idSchema } from "./common";

export const analyticsQuerySchema = z.object({
  projectId: idSchema.optional(),
  days: z.coerce.number().int().min(7).max(90).default(14),
  weeks: z.coerce.number().int().min(4).max(26).default(8),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
