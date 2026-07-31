import { z } from "zod";

const money = z
  .union([z.string(), z.number()])
  .transform((value) => String(value))
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), "Enter a valid amount with up to two decimal places.");

export const createTransactionSchema = z
  .object({
    date: z.coerce.date(),
    contactName: z.string().trim().min(1).max(120),
    contactCategory: z.string().trim().min(1).max(80),
    category: z.string().trim().min(1).max(80),
    description: z.string().trim().max(500).optional().transform((value) => value || undefined),
    credit: money.default("0"),
    debit: money.default("0"),
  })
  .superRefine((value, context) => {
    const hasCredit = Number(value.credit) > 0;
    const hasDebit = Number(value.debit) > 0;
    if (hasCredit === hasDebit) {
      context.addIssue({ code: "custom", message: "Provide either a credit or a debit amount.", path: ["credit"] });
    }
  });

export const contactSearchSchema = z.object({
  search: z.string().trim().max(120).default("")
});
