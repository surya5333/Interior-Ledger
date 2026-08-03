import { Prisma } from "../generated/prisma/client";
import { getPrisma } from "./prisma";

type LedgerRow = {
  projectId: string;
  projectName: string;
  budget: Prisma.Decimal;
  clientId: string;
  clientName: string;
  transactionId: string | null;
  date: Date | null;
  contactId: string | null;
  contactName: string | null;
  contactCategory: string | null;
  isClientPayment: boolean | null;
  category: string | null;
  description: string | null;
  paymentMode: string | null;
  paymentProofUrl: string | null;
  credit: Prisma.Decimal | null;
  debit: Prisma.Decimal | null;
  runningBalance: Prisma.Decimal | null;
  totalCredit: Prisma.Decimal;
  totalDebit: Prisma.Decimal;
  balance: Prisma.Decimal;
};

const asMoney = (value: Prisma.Decimal | null) => value?.toFixed(2) ?? "0.00";

/** One database query: project header, calculated totals, and ordered running balance. */
export async function getProjectLedger(projectId: string) {
  const rows = await getPrisma().$queryRaw<LedgerRow[]>(Prisma.sql`
    WITH ledger AS (
      SELECT
        t.id AS "transactionId",
        t.date,
        t."contact_id" AS "contactId",
        CASE WHEN t."is_client_payment" THEN cl.name ELSE c.name END AS "contactName",
        CASE WHEN t."is_client_payment" THEN 'Payment' ELSE c.category END AS "contactCategory",
        t."is_client_payment" AS "isClientPayment",
        t.category,
        t.description,
        t."paymentMode",
        t."payment_proof_url" AS "paymentProofUrl",
        t.credit,
        t.debit,
        SUM(t.credit - t.debit) OVER (
          PARTITION BY t."project_id"
          ORDER BY t.date ASC, t."created_at" ASC, t.id ASC
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS "runningBalance"
      FROM "Transaction" t
      JOIN "Project" p ON p.id = t."project_id"
      JOIN "Client" cl ON cl.id = p."client_id"
      LEFT JOIN "Contact" c ON c.id = t."contact_id"
      WHERE t."project_id" = ${projectId}
    ), totals AS (
      SELECT
        COALESCE(SUM(credit), 0)::numeric AS "totalCredit",
        COALESCE(SUM(debit), 0)::numeric AS "totalDebit",
        COALESCE(SUM(credit - debit), 0)::numeric AS balance
      FROM ledger
    )
    SELECT
      p.id AS "projectId", p.name AS "projectName", p.budget,
      cl.id AS "clientId", cl.name AS "clientName",
      l."transactionId", l.date, l."contactId", l."contactName", l."contactCategory", l."isClientPayment",
      l.category, l.description, l."paymentMode", l."paymentProofUrl", l.credit, l.debit, l."runningBalance",
      totals."totalCredit", totals."totalDebit", totals.balance
    FROM "Project" p
    JOIN "Client" cl ON cl.id = p."client_id"
    CROSS JOIN totals
    LEFT JOIN ledger l ON TRUE
    WHERE p.id = ${projectId}
    ORDER BY l.date ASC NULLS LAST, l."transactionId" ASC NULLS LAST
  `);

  if (!rows.length) return null;
  const head = rows[0];
  return {
    project: { id: head.projectId, name: head.projectName, budget: asMoney(head.budget) },
    client: { id: head.clientId, name: head.clientName },
    totals: { credit: asMoney(head.totalCredit), debit: asMoney(head.totalDebit), balance: asMoney(head.balance) },
    transactions: rows.flatMap((row) => row.transactionId ? [{
      id: row.transactionId, date: row.date?.toISOString(),
      isClientPayment: Boolean(row.isClientPayment),
      contact: {
        id: row.isClientPayment ? head.clientId : row.contactId!,
        name: row.contactName!,
        category: row.contactCategory!,
      },
      category: row.category!, description: row.description, paymentMode: row.paymentMode! as "CASH" | "UPI" | "CARD" | "OTHER",
      paymentProofUrl: row.paymentProofUrl, credit: asMoney(row.credit),
      debit: asMoney(row.debit), runningBalance: asMoney(row.runningBalance),
    }] : []),
  };
}
