import { Prisma } from "../generated/prisma/client";
import { getPrisma } from "./prisma";

type LedgerRow = {
  projectId: string;
  projectName: string;
  budget: Prisma.Decimal;
  isLocked: boolean;
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
  createdById: string | null;
  createdByName: string | null;
  createdByRole: string | null;
  deletedAt: Date | null;
  deletedById: string | null;
  deletedByName: string | null;
  deletedByRole: string | null;
};

const asMoney = (value: Prisma.Decimal | null) => value?.toFixed(2) ?? "0.00";

function toBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    return s === "true" || s === "t" || s === "1" || s === "yes" || s === "on";
  }
  return false;
}

type ProjectContact = {
  id: string;
  name: string;
  category: string;
};

/** One database query: project header, calculated totals, and ordered running balance.
 *  Running balance and totals ALWAYS exclude soft-deleted transactions (deletedAt IS NOT NULL).
 *  For MANAGER users, soft-deleted rows are completely excluded from the result.
 *  For ADMIN users, soft-deleted rows are appended after active rows with a NULL runningBalance,
 *  so they are visible for audit but never contribute to financial calculations.
 */
export async function getProjectLedger(projectId: string, contactId?: string | null, userRole?: string) {
  const isManager = userRole === "MANAGER";
  const contactFilter = contactId
    ? Prisma.sql`AND t."contact_id" = ${contactId}`
    : Prisma.empty;

  const softDeleteVisibilityFilter = isManager
    ? Prisma.sql`AND t.deleted_at IS NULL`
    : Prisma.empty;

  const rowsPromise = getPrisma().$queryRaw<LedgerRow[]>(Prisma.sql`
    WITH active_ledger AS (
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
        t."created_by_id" AS "createdById",
        u.name AS "createdByName",
        u.role AS "createdByRole",
        t.deleted_at AS "deletedAt",
        t."deleted_by_id" AS "deletedById",
        du.name AS "deletedByName",
        du.role AS "deletedByRole",
        SUM(t.credit - t.debit) OVER (
          PARTITION BY t."project_id"
          ORDER BY t.date ASC, t."created_at" ASC, t.id ASC
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS "runningBalance"
      FROM "Transaction" t
      JOIN "Project" p ON p.id = t."project_id"
      JOIN "Client" cl ON cl.id = p."client_id"
      LEFT JOIN "Contact" c ON c.id = t."contact_id"
      LEFT JOIN "User" u ON u.id = t."created_by_id"
      LEFT JOIN "User" du ON du.id = t."deleted_by_id"
      WHERE t."project_id" = ${projectId}
        AND t.deleted_at IS NULL
      ${contactFilter}
    ), totals AS (
      SELECT
        COALESCE(SUM(credit), 0)::numeric AS "totalCredit",
        COALESCE(SUM(debit), 0)::numeric AS "totalDebit",
        COALESCE(SUM(credit - debit), 0)::numeric AS balance
      FROM active_ledger
    ),
    combined AS (
      SELECT
        al.*,
        ROW_NUMBER() OVER (ORDER BY al.date ASC, al."transactionId" ASC) AS sort_order,
        1 AS is_active
      FROM active_ledger al
      ${
        !isManager
          ? Prisma.sql`
      UNION ALL
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
        t."created_by_id" AS "createdById",
        u.name AS "createdByName",
        u.role AS "createdByRole",
        t.deleted_at AS "deletedAt",
        t."deleted_by_id" AS "deletedById",
        du.name AS "deletedByName",
        du.role AS "deletedByRole",
        NULL::numeric AS "runningBalance",
        (SELECT COUNT(*) FROM active_ledger) + ROW_NUMBER() OVER (ORDER BY t.date ASC, t."created_at" ASC, t.id ASC) AS sort_order,
        0 AS is_active
      FROM "Transaction" t
      JOIN "Project" p ON p.id = t."project_id"
      JOIN "Client" cl ON cl.id = p."client_id"
      LEFT JOIN "Contact" c ON c.id = t."contact_id"
      LEFT JOIN "User" u ON u.id = t."created_by_id"
      LEFT JOIN "User" du ON du.id = t."deleted_by_id"
      WHERE t."project_id" = ${projectId}
        AND t.deleted_at IS NOT NULL
      ${contactFilter}
      ${softDeleteVisibilityFilter}
      `
          : Prisma.empty
      }
    )
    SELECT
      p.id AS "projectId", p.name AS "projectName", p.budget, p."is_locked" AS "isLocked",
      cl.id AS "clientId", cl.name AS "clientName",
      cb."transactionId", cb.date, cb."contactId", cb."contactName", cb."contactCategory", cb."isClientPayment",
      cb.category, cb.description, cb."paymentMode", cb."paymentProofUrl", cb.credit, cb.debit, cb."runningBalance",
      cb."createdById", cb."createdByName", cb."createdByRole",
      cb."deletedAt", cb."deletedById", cb."deletedByName", cb."deletedByRole",
      totals."totalCredit", totals."totalDebit", totals.balance
    FROM "Project" p
    JOIN "Client" cl ON cl.id = p."client_id"
    CROSS JOIN totals
    LEFT JOIN combined cb ON TRUE
    WHERE p.id = ${projectId}
    ORDER BY cb.sort_order ASC NULLS LAST, cb."transactionId" ASC NULLS LAST
  `);

  const contactsPromise = getPrisma().transaction.findMany({
    where: { projectId, contactId: { not: null }, isClientPayment: false, deletedAt: null },
    distinct: ["contactId"],
    orderBy: [{ contact: { name: "asc" } }],
    select: {
      contactId: true,
      contact: { select: { id: true, name: true, category: true } },
    },
  }).then((rows) =>
    rows
      .filter((r) => r.contact)
      .map((r) => r.contact as ProjectContact)
  );

  const [rows, contacts] = await Promise.all([rowsPromise, contactsPromise]);

  if (!rows.length) return null;
  const head = rows[0];
  return {
    project: { id: head.projectId, name: head.projectName, budget: asMoney(head.budget), isLocked: toBool(head.isLocked) },
    client: { id: head.clientId, name: head.clientName },
    totals: { credit: asMoney(head.totalCredit), debit: asMoney(head.totalDebit), balance: asMoney(head.balance) },
    contacts,
    transactions: rows.flatMap((row) => row.transactionId ? [{
      id: row.transactionId, date: row.date?.toISOString(),
      isClientPayment: toBool(row.isClientPayment),
      contact: {
        id: row.isClientPayment ? head.clientId : row.contactId!,
        name: row.contactName!,
        category: row.contactCategory!,
      },
      category: row.category!, description: row.description, paymentMode: row.paymentMode! as "CASH" | "UPI" | "CARD" | "OTHER",
      paymentProofUrl: row.paymentProofUrl, credit: asMoney(row.credit),
      debit: asMoney(row.debit), runningBalance: row.runningBalance !== null ? asMoney(row.runningBalance) : "",
      createdBy: row.createdById && row.createdByName && row.createdByRole ? {
        id: row.createdById,
        name: row.createdByName,
        role: row.createdByRole as "ADMIN" | "MANAGER",
      } : null,
      deleted: row.deletedAt ? {
        at: row.deletedAt.toISOString(),
        by: row.deletedById && row.deletedByName && row.deletedByRole ? {
          id: row.deletedById,
          name: row.deletedByName,
          role: row.deletedByRole as "ADMIN" | "MANAGER",
        } : null,
      } : null,
    }] : []),
  };
}
