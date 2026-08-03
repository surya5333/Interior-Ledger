import { z } from "zod";

export const paymentModeValues = ["CASH", "UPI", "CARD", "OTHER"] as const;
export const CLIENT_PAYMENT_CATEGORY = "Payment";

const money = z
  .union([z.string(), z.number()])
  .transform((value) => String(value))
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), "Enter a valid amount with up to two decimal places.");

export const createTransactionSchema = z
  .object({
    date: z.coerce.date(),
    contactName: z.string().trim().min(1).max(120).optional(),
    contactCategory: z.string().trim().min(1).max(80).optional(),
    category: z.string().trim().min(1).max(80).optional(),
    description: z.string().trim().max(500).optional().transform((value) => value || undefined),
    credit: money.default("0"),
    debit: money.default("0"),
    paymentMode: z.enum(paymentModeValues).default("CASH"),
    paymentProofUrl: z
      .string()
      .url("Enter a valid payment proof URL.")
      .optional()
      .or(z.literal(""))
      .transform((value) => value || undefined),
    isClientPayment: z.boolean().optional().default(false),
  })
  .superRefine((value, context) => {
    if (value.isClientPayment) {
      if (Number(value.credit) <= 0) {
        context.addIssue({
          code: "custom",
          message: "Client payments must include a credit amount.",
          path: ["credit"],
        });
      }
      if (Number(value.debit) > 0) {
        context.addIssue({
          code: "custom",
          message: "Client payments cannot include a debit amount.",
          path: ["debit"],
        });
      }
      if (value.category && value.category !== CLIENT_PAYMENT_CATEGORY) {
        context.addIssue({
          code: "custom",
          message: `Client payment category must be "${CLIENT_PAYMENT_CATEGORY}".`,
          path: ["category"],
        });
      }
    } else {
      if (!value.contactName) {
        context.addIssue({
          code: "custom",
          message: "Contact is required.",
          path: ["contactName"],
        });
      }
      if (!value.category) {
        context.addIssue({
          code: "custom",
          message: "Category is required.",
          path: ["category"],
        });
      }

      const hasCredit = Number(value.credit) > 0;
      const hasDebit = Number(value.debit) > 0;
      if (hasCredit === hasDebit) {
        context.addIssue({
          code: "custom",
          message: "Provide either a credit or a debit amount.",
          path: ["credit"],
        });
      }
    }

    if (value.paymentMode !== "UPI" && value.paymentProofUrl) {
      context.addIssue({
        code: "custom",
        message: "Payment proof is only supported for UPI transactions.",
        path: ["paymentProofUrl"],
      });
    }
  });

export const contactSearchSchema = z.object({
  search: z.string().trim().max(120).default(""),
});
