import { z } from "zod";

export { dataModeSchema } from "@/lib/config/data-mode";

export const journalEntrySchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(12)
    .transform((value) => value.toUpperCase()),
  action: z.enum(["買進", "賣出", "觀察"]),
  quantity: z.number().nonnegative().optional(),
  price: z.number().nonnegative().optional(),
  reason: z.string().trim().min(10).max(2000),
  biggestRisk: z.string().trim().min(5).max(1000),
  invalidation: z.string().trim().min(5).max(1000),
  fomo: z.boolean(),
  singleDayMove: z.boolean(),
  questionsCompleted: z.boolean(),
});

export const manualDataSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(12)
    .transform((value) => value.toUpperCase()),
  price: z.number().positive(),
  marketDate: z.string().date(),
  sourceName: z.string().trim().min(2).max(100),
});

export const taiwanSymbolSchema = z
  .string()
  .trim()
  .regex(/^[0-9A-Z]{2,8}$/i)
  .transform((value) => value.toUpperCase());

export const watchlistItemSchema = z.object({
  symbol: taiwanSymbolSchema,
  name: z.string().trim().min(1).max(80),
  exchange: z.enum(["TWSE", "TPEx", "ESB", "UNKNOWN"]).optional(),
});
