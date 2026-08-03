# Phase 16: Payment Mode and UPI Screenshot Upload

## Summary

Implement Phase 16 by extending `Transaction` with a Prisma `PaymentMode` enum, `paymentMode`, and `paymentProofUrl`, then threading those fields through validation, APIs, React Query hooks, ledger querying, the project ledger create/edit flow, and PDF export. Reuse the existing client-side Supabase Storage upload pattern from `app/settings/page.tsx`, store uploaded UPI screenshots in the existing `uploads` bucket, and keep all existing debit/credit, running balance, contact auto-create, and category behavior unchanged.

## Current State Analysis

- Transactions currently contain only `projectId`, `contactId`, `category`, `description`, `date`, `credit`, `debit`, and timestamps in [`prisma/schema.prisma`](file:///e:/Projects/InteriorD_ledger/prisma/schema.prisma).
- Shared transaction validation in [`lib/validation.ts`](file:///e:/Projects/InteriorD_ledger/lib/validation.ts) validates date/contact/category/description/credit/debit but has no payment fields.
- Transaction create/update APIs in:
  - [`app/api/projects/[id]/transactions/route.ts`](file:///e:/Projects/InteriorD_ledger/app/api/projects/%5Bid%5D/transactions/route.ts)
  - [`app/api/projects/[id]/transactions/[transactionId]/route.ts`](file:///e:/Projects/InteriorD_ledger/app/api/projects/%5Bid%5D/transactions/%5BtransactionId%5D/route.ts)
  currently parse and persist only the existing transaction fields.
- Ledger shaping in [`lib/ledger.ts`](file:///e:/Projects/InteriorD_ledger/lib/ledger.ts) does a raw SQL query and currently returns category/description/credit/debit/running balance only.
- React Query transaction types and mutation payloads in [`hooks/use-ledger.ts`](file:///e:/Projects/InteriorD_ledger/hooks/use-ledger.ts) do not expose payment metadata.
- The create/edit transaction UI in [`app/projects/[id]/page.tsx`](file:///e:/Projects/InteriorD_ledger/app/projects/%5Bid%5D/page.tsx) has no payment mode field, no file upload state, and no payment column in the table.
- PDF export in [`components/ledger-pdf.tsx`](file:///e:/Projects/InteriorD_ledger/components/ledger-pdf.tsx) has no payment column or proof indicator.
- The app already has a working client-side Supabase Storage upload pattern in [`app/settings/page.tsx`](file:///e:/Projects/InteriorD_ledger/app/settings/page.tsx) using [`lib/supabase.ts`](file:///e:/Projects/InteriorD_ledger/lib/supabase.ts) and the existing `uploads` bucket. That pattern can be reused for UPI screenshot uploads without backend storage changes.
- Contact detail history in [`app/api/contacts/[id]/route.ts`](file:///e:/Projects/InteriorD_ledger/app/api/contacts/%5Bid%5D/route.ts) and [`hooks/use-contacts.ts`](file:///e:/Projects/InteriorD_ledger/hooks/use-contacts.ts) also returns transaction objects, so it should be updated to keep transaction shapes current even if the UI does not add a payment column there in this phase.

## Proposed Changes

### 1. Database schema

#### `prisma/schema.prisma`

What:
- Add:
  - `enum PaymentMode { CASH UPI CARD OTHER }`
  - `paymentMode PaymentMode @default(CASH)`
  - `paymentProofUrl String? @map("payment_proof_url")`
  to `Transaction`.

Why:
- This is the minimum schema change required to represent payment mode and optional UPI proof while preserving existing transaction behavior.

How:
- Keep all existing transaction fields and indexes unchanged.
- Use `@default(CASH)` so existing records remain valid after `db push`.
- Do not create a new table.

Execution verification:
- Run `npx prisma generate`
- Run `npx prisma db push`

### 2. Shared validation and transaction contracts

#### `lib/validation.ts`

What:
- Extend `createTransactionSchema` with:
  - `paymentMode: z.enum(["CASH", "UPI", "CARD", "OTHER"]).default("CASH")`
  - `paymentProofUrl: z.string().url().optional().or(z.literal("")).transform((value) => value || undefined)`
- Add a refinement:
  - if `paymentMode === "UPI"`, `paymentProofUrl` may be present but is not required until upload completes in the UI
  - if `paymentMode !== "UPI"`, allow empty input and normalize to `undefined`

Why:
- Keep API validation aligned with the new UI contract and avoid accidental proof requirements for non-UPI modes.

How:
- Preserve the current credit/debit exclusive validation exactly as-is.
- Prefer normalization to `undefined` so APIs can convert to `null` cleanly.

#### `hooks/use-ledger.ts`

What:
- Extend `LedgerTransaction` with:
  - `paymentMode: "CASH" | "UPI" | "CARD" | "OTHER"`
  - `paymentProofUrl: string | null`
- Extend create/update mutation payloads with the same fields.

Why:
- The ledger page and PDF export both consume this hook and need typed access to payment metadata.

How:
- Keep query keys and invalidation behavior unchanged.

#### `hooks/use-contacts.ts`

What:
- Extend contact history transaction typing with `paymentMode` and `paymentProofUrl`.

Why:
- The route returns transaction objects; keeping hook types in sync prevents drift after the schema change.

### 3. API routes and Prisma query updates

#### `app/api/projects/[id]/transactions/route.ts`

What:
- Parse `paymentMode` and `paymentProofUrl`.
- Persist both fields on `db.transaction.create`.

Why:
- New transactions need to store the selected payment mode and optional UPI screenshot URL.

How:
- Continue using the shared `createTransactionSchema`.
- Keep project existence checks and contact auto-create unchanged.
- Normalize `paymentProofUrl` to `null` unless `paymentMode === "UPI"` and a URL is present.

#### `app/api/projects/[id]/transactions/[transactionId]/route.ts`

What:
- Extend `updateTransactionSchema` with `paymentMode` and `paymentProofUrl`.
- Persist payment updates on `prisma.transaction.update`.

Why:
- Edit transaction flow must support changing payment mode and replacing/clearing proof.

How:
- If a transaction is changed from `UPI` to `CASH`, `CARD`, or `OTHER`, explicitly set `paymentProofUrl: null`.
- Keep credit/debit/date/category/contact update behavior unchanged.
- Keep delete behavior unchanged.

#### `lib/ledger.ts`

What:
- Extend the raw SQL projection and row typing with:
  - `paymentMode`
  - `paymentProofUrl`
- Include those fields in the returned ledger transaction payload.

Why:
- The project ledger page and PDF export both depend on `getProjectLedger`.

How:
- Only add columns to the existing query; do not alter ordering, running balance windowing, totals, or balance math.

#### `app/api/contacts/[id]/route.ts`

What:
- Include `paymentMode` and `paymentProofUrl` when shaping contact transaction history.

Why:
- Keeps contact-history transaction responses aligned with the updated `Transaction` model.

How:
- No required UI change in this phase unless type checking surfaces a need.

### 4. Reusable payment-mode presentation

#### New file: `components/payment-mode-badge.tsx`

What:
- Add a compact reusable badge component for `CASH`, `UPI`, `CARD`, and `OTHER`.

Why:
- The ledger table needs a compact payment indicator, and a dedicated component keeps display logic out of the page.

How:
- Use short labels (`Cash`, `UPI`, `Card`, `Other`) and a subtle SaaS-style badge treatment consistent with the app’s existing badges.
- Optional icon usage is allowed only if it stays compact and readable in dense tables; text-first is acceptable.

### 5. Project ledger create/edit flow

#### `app/projects/[id]/page.tsx`

What:
- Extend the local form schema and `TransactionFormData` with:
  - `paymentMode`
  - `paymentProofUrl`
- Add a `Payment Mode` dropdown to the sticky quick-entry form.
- When `paymentMode === "UPI"`:
  - show an `Upload UPI Screenshot` file input
  - upload the image to Supabase Storage
  - store the public URL in form state
  - display an image preview
- Add a new `Payment` column to the ledger table.

Why:
- This is the main UX requested in Phase 16.

How:
- Reuse the existing `NativeSelect`, `Input`, and `supabase` client already used by settings.
- Upload to the existing `uploads` bucket under a transaction-specific folder such as `transactions/<projectId>/<timestamp>-<sanitized-file-name>`.
- Restrict the file input to images via `accept="image/*"`.
- Track upload state locally so submit can be disabled while a proof upload is in progress.
- When entering edit mode:
  - populate `paymentMode`
  - populate existing `paymentProofUrl`
  - show current preview if the transaction already has proof
- When canceling edit or after successful create/update:
  - reset `paymentMode` to `CASH`
  - clear `paymentProofUrl`
  - clear any upload-in-progress/error state
- When the user switches away from `UPI`:
  - immediately clear `paymentProofUrl` in form state
  - hide the upload control
- Keep:
  - `type` -> `credit/debit` mapping unchanged
  - contact/category inputs unchanged
  - search/filter behavior unchanged
  - delete behavior unchanged

Layout decision:
- Add the payment column between `Category` and `Description` so the table remains semantically grouped.
- Update empty-state `colSpan` accordingly.

Storage behavior decision:
- Clear the stored URL in app data when mode changes away from `UPI`.
- Do not add bucket-object deletion in this phase; the existing app upload pattern does not remove replaced files, and adding deletion would require extra cleanup logic outside the requested scope.

### 6. PDF export

#### `components/ledger-pdf.tsx`

What:
- Extend the internal transaction type with `paymentMode` and `paymentProofUrl`.
- Add a `Payment` column to the PDF table.
- When `paymentMode === "UPI"` and `paymentProofUrl` exists, append a compact note such as `UPI (proof attached)`.

Why:
- The PDF must include payment mode without disturbing the existing document layout.

How:
- Do not embed screenshots in the main PDF table.
- Keep the current A4 layout stable by using a text indicator only.
- Rebalance column widths to fit the new payment column while preserving readability.

Decision confirmed:
- Main PDF stays clean and indicates proof attachment instead of embedding screenshots inline.
- No additional appended proof-image pages are included in this phase; the requested requirement is satisfied by the clean text indicator.

### 7. Supporting constants and imports

Likely touched files:
- `lib/supabase.ts` (read-only reference, no expected logic change)
- `app/projects/[id]/page.tsx` imports for `supabase` and new `PaymentModeBadge`
- Any generated Prisma client output refreshed by `npx prisma generate`

## Assumptions & Decisions

- Payment mode applies to both debit and credit transactions; the requirement does not limit it to expenses only.
- `paymentProofUrl` is only meaningful for `UPI`; non-UPI transactions will store `null`.
- The existing public `uploads` Supabase bucket will be reused; no new bucket or backend upload API will be added.
- Client-side upload is acceptable because the project already does this for logo/signature uploads in settings.
- Replaced/cleared proof files are not deleted from Storage in this phase; only the transaction record is updated.
- Contact detail history API/hook will be kept schema-aligned, but no payment column will be added to contact-history UI unless implementation reveals a type dependency that requires it.
- Existing business logic must remain unchanged:
  - running balance SQL
  - credit/debit math
  - contact upsert behavior
  - category behavior
  - existing create/edit/delete transaction workflows

## Verification Steps

### Automated

Run in order:

1. `npx prisma generate`
2. `npx prisma db push`
3. `npx tsc --noEmit`
4. `npm run build`

### Manual

Validate all of the following on the project ledger screen:

1. Create a cash transaction:
   - saves with `paymentMode = CASH`
   - no upload field required
   - payment badge shows `Cash`
2. Create a UPI transaction:
   - upload image to Supabase
   - preview appears after upload
   - record saves with public `paymentProofUrl`
   - payment badge shows `UPI`
3. Create card and other transactions:
   - no upload requirement
   - correct payment badge appears
4. Edit transaction:
   - existing mode/proof preload correctly
   - replacing proof updates preview and saved URL
   - switching from `UPI` to another mode clears `paymentProofUrl`
5. Delete transaction:
   - works unchanged
6. PDF generation:
   - payment column renders
   - UPI entries with proof show a clean `proof attached` indicator
   - layout remains readable

### Final implementation report

After execution stops at Phase 16, report:

- files modified
- database changes
- verification results
- remaining work
