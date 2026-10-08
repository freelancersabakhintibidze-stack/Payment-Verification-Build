import { z } from "zod";
import { PAYMENT_STATUSES } from "@/lib/status";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const ORDER_ID = /^[A-Za-z0-9_-]{6,64}$/;

export const base58Address = z
  .string()
  .regex(BASE58, "Must be a base58 Solana address (32 to 44 characters)");

export const createPaymentSchema = z.object({
  amount: z.coerce
    .number()
    .positive("Amount must be greater than zero")
    .max(1_000_000, "Amount is too large")
    .refine((n) => Number.isFinite(n), "Amount must be a finite number"),
  senderWallet: z.union([base58Address, z.literal("")]).optional(),
  asset: z.enum(["SOL"]).default("SOL"),
  mint: z.union([base58Address, z.literal("")]).optional(),
  expiresInMinutes: z.coerce.number().int().min(5).max(120).default(30),
  label: z.string().trim().min(1).max(80).optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const orderIdSchema = z
  .string()
  .regex(ORDER_ID, "orderId must be 6 to 64 letters, digits, dashes, or underscores");

export const verifyPaymentSchema = z.object({
  orderId: orderIdSchema,
});

export const deliveryTriggerSchema = z.object({
  orderId: orderIdSchema,
});

export const simulatePaymentSchema = z.object({
  orderId: orderIdSchema,
});

export const dashboardQuerySchema = z.object({
  status: z.enum(PAYMENT_STATUSES).optional(),
  range: z.enum(["24h", "7d", "30d", "all"]).default("all"),
  min: z.coerce.number().nonnegative().optional(),
  max: z.coerce.number().nonnegative().optional(),
  q: z.string().trim().max(88).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  csv: z.coerce.boolean().optional(),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

/** Flatten a ZodError into a single readable string for API error payloads. */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "input"}: ${i.message}`)
    .join("; ");
}
