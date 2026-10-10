# Interior Ledger — Project Visits Module - Product Requirements Document

## Overview
- **Summary**: Add a project-scoped "Visits" feature to the existing Interior Ledger application. Each project gains a compact inline expandable panel (triggered by a new "Visits" action button) that lists project visits and supports Add / Edit / Delete operations using three user-facing fields: Date, Visit Name (auto-numbered default `Visit 1`, `Visit 2`, … but editable), and Description. Backed by a new, dedicated `Visit` Prisma model (and table) linked to the existing `Project` model with a per-project auto-incrementing internal `sequenceNumber` that survives renames and deletes (no number reuse). Fully respects the existing Project Lock state and ADMIN/MANAGER role rules.
- **Purpose**: Provide a non-financial project companion log (site visit records, measurement trips, inspection notes) fully independent of the existing transaction ledger, PDF reports, and financial calculations.
- **Target Users**: Owner (ADMIN) and Manager (MANAGER) users interacting with a project ledger.

## Goals
- Add a single Visits action button inside each existing Project Ledger page (no new routes/modals as the default UX).
- Store visit records in a dedicated `Visit` PostgreSQL table (1 visit → 1 Project), additive schema change only.
- Generate user-facing default visit names as `Visit N` where N is a per-project sequence that NEVER reuses numbers even after deletes or renames.
- Provide Create / Edit / Delete actions within the same inline panel.
- Enforce existing project lock + role authorization on both frontend and backend.
- Leave every existing table, every existing record, every existing calculation, and every PDF untouched.

## Non-Goals
- No global Visits directory or sidebar page outside a project.
- No financial impact — visits never appear in Totals Credit/Debit, Balance, Financial Overview, transaction counts, or any PDF export (Export PDF, Share to Client, Share to Contact).
- No PDF/print/report for visits in this release.
- No filtering/search for visits list beyond newest-first date ordering.
- No "Created By / Updated By" audit fields unless existing conventions already require them (transaction has `createdById`; we omit to stay minimal unless required by existing project lock enforcement).
- No predefined visit-name values — visit name is free text after auto-fill.
- No "Widget" terminology anywhere.
- No change to existing Contact identity logic, payment modes, UPI proof upload, or soft-delete audit trail.

## Background & Context (from STEP 1 inspection)

### Existing Architecture
- **DB**: PostgreSQL. Prisma schema at [schema.prisma](file:///e:/Projects/InteriorD_ledger/prisma/schema.prisma).
- **IDs**: All models use `String @id @default(cuid())`. Project.id = String cuid. Visit.id will match.
- **Project model** ([schema.prisma L21-L38](file:///e:/Projects/InteriorD_ledger/prisma/schema.prisma#L21-L38)): has `id`, `clientId` (Restrict), `isLocked Boolean @default(false)`, `transactions Transaction[]`. We'll add `visits Visit[]` relation here only.
- **Project FK conventions**: `Transaction` uses `onDelete: Cascade` vs Project ([schema.prisma L89](file:///e:/Projects/InteriorD_ledger/prisma/schema.prisma#L89)). Staff salary records also Cascade on Staff. We will apply `onDelete: Cascade` to Visit.projectId so deleting a project cleans up visits (no orphan visits; matches existing cascade).
- **Project Lock auth** ([lib/auth.ts](file:///e:/Projects/InteriorD_ledger/lib/auth.ts)): exports `LOCKED_PROJECT_ERROR`, `loadProjectLockState(projectId)`, `projectLocked(isLocked)` helper returning status 403. We reuse these.
- **Session auth**: `verifySession()` returns `{ id, username, role: "ADMIN" | "MANAGER" }`; used at top of every transactions route. Visits routes will mirror this.
- **Private project visibility**: `Project.visibility` SHARED vs PRIVATE; for MANAGER role, PRIVATE projects return 403 in transactions GET ([transactions/route.ts L28-L30](file:///e:/Projects/InteriorD_ledger/app/api/projects/[id]/transactions/route.ts#L28-L30)). Visits routes mirror this check.
- **Validation**: Zod via [lib/validation.ts](file:///e:/Projects/InteriorD_ledger/lib/validation.ts). Patterns: `z.coerce.date()`, `z.string().trim().min(1).max(N).optional().transform(v => v || undefined)`. Mirror these.
- **React Query hooks pattern**: [use-ledger.ts](file:///e:/Projects/InteriorD_ledger/hooks/use-ledger.ts) and [use-projects.ts](file:///e:/Projects/InteriorD_ledger/hooks/use-projects.ts) use `fetchJson`, `useQuery`/`useMutation`, `invalidateQueries`. We'll create `use-project-visits.ts` mirroring.
- **UI components used in Quick Entry (Visits panel mimics this)**: [Input, Textarea, Label](file:///e:/Projects/InteriorD_ledger/components/ui/input.tsx) (all from same file), [Button](file:///e:/Projects/InteriorD_ledger/components/ui/button.tsx), [ConfirmDialog](file:///e:/Projects/InteriorD_ledger/components/confirm-dialog.tsx), [EmptyState](file:///e:/Projects/InteriorD_ledger/components/empty-state.tsx), [DataTable components](file:///e:/Projects/InteriorD_ledger/components/ui/data-table.tsx). All reused.
- **Quick Entry collapse pattern already exists** in Project Ledger page ([page.tsx L860-L875](file:///e:/Projects/InteriorD_ledger/app/projects/[id]/page.tsx#L860-L875)) using `isQuickEntryOpen` boolean + `ChevronUp/ChevronDown` button in header row. Visits will implement the same expand/collapse pattern with its own boolean above the transaction SearchBar/DataTable region (NOT near Quick Entry at the bottom — avoids overlap).
- **Data safety (user requirement sec 19)**: This entire feature is additive. Existing transactions, clients, contacts, projects, users, sessions, staff, salary, schedule, settings tables and records are untouched by schema, migrations, and runtime code.

### Prior Art for Sequence Numbers
- The only existing "numbered" artifact is the implicit sequence of transactions by date. No existing `sequenceNumber` field exists. We introduce a new one scoped to Visit. Conflict-free strategy: `UNIQUE(projectId, sequenceNumber)` + `db.$transaction` with RETRY on unique violation → recalculate from `MAX(sequenceNumber)+1` (retry max ~3 times). Backend is authoritative; sequence is never accepted from the client payload.

## Functional Requirements
- **FR-1 Visits button in project header actions** next to Export PDF / Share to Client / Share to Contact / Add Entry. Button label `Visits` with a suitable existing lucide icon already in common use (e.g. `MapPin` or `CalendarCheck2`).
- **FR-2 Inline expand/collapse Visits panel** using the same ChevronUp/ChevronDown pattern as Quick Entry; opens between SummaryStrip and SearchBar (so Quick Entry at bottom remains undisrupted).
- **FR-3 Exactly 3 fields per visit**: Date (date picker), Visit Name (string, defaults to `Visit N`, editable), Description (multiline textarea, nullable).
- **FR-4 Safe per-project numbering**: first visit → `Visit 1`, next → `Visit 2`, etc. Deleting Visit 2 still yields `Visit 4` next. Renaming does not affect the internal counter. Uses internal `sequenceNumber` per record + UNIQUE(projectId, sequenceNumber). Sequence is determined server-side (not trusted from client). Concurrent POSTs are handled safely with retries on unique violation.
- **FR-5 Visits list table**: columns Date / Visit Name / Description / Actions; rows newest by date first (tie-break by createdAt desc); empty state `No visits added yet.` with Add Visit CTA. Each row has Edit and Delete actions consistent with DataTable + DropdownMenu used in transactions.
- **FR-6 Add Visit form**: inline compact form in the Visits panel; shows Date (today default), Visit Name (auto-generated `Visit N`), Description (blank); Cancel / Save Visit buttons; `loading` disable on submit to prevent double-clicks.
- **FR-7 Edit Visit**: populates same form; updates in-place; preserves the internal sequenceNumber even if user edits Visit Name (e.g. renames to "Kitchen Measurement"); PATCH endpoint ignores any client-supplied sequenceNumber.
- **FR-8 Delete Visit**: uses existing `ConfirmDialog`; after delete, list refreshes, sequence number slot is NOT reused.
- **FR-9 Locked project enforcement**: When project.isLocked === true (both Owner + Manager see this), all mutation buttons (Add / Edit / Delete) must be disabled on frontend AND all mutation endpoints (POST/PATCH/DELETE) return 403 with the existing `LOCKED_PROJECT_ERROR`. GET list still works. Visits panel itself may still be opened on frontend to read.
- **FR-10 Role/Visibility enforcement**: Mirror transactions GET — MANAGER role cannot access PRIVATE project visits, even via direct API calls. Both roles can CRUD on SHARED non-locked.
- **FR-11 Project-scoped isolation**: GET `/api/projects/A/visits` returns only A's visits; never B's. PATCH/DELETE verify that the visit's actual projectId in the DB equals the route projectId param before mutating (never trust the URL alone).
- **FR-12 Notifications via Sonner** on save success / edit success / delete success, matching transaction toasts already in the page.

## Non-Functional Requirements
- **NFR-1 Data safety (sec 19)**: 0 existing DB rows modified by migration; 0 existing queries affected; 0 schema changes outside of new Visit table + Project.visits relation + required index + unique constraint.
- **NFR-2 Financial isolation**: No change to `lib/ledger.ts`, `lib/financial-overview.ts`, `lib/client-ledger.ts`, `components/ledger-pdf.tsx`. Visits are never used in credit/debit/totals calculations.
- **NFR-3 PDF isolation**: `exportPDF`, `shareClientPDF`, `shareContactPDF` functions in the ledger page import LedgerPDF unchanged — no references to visits are introduced there.
- **NFR-4 Responsive design**: Buttons in header wrap on tablets/small screens. Visits table does not introduce horizontal overflow beyond what the existing transaction DataTable already allows.
- **NFR-5 Code conventions**: Zod for payload validation, `force-dynamic` on API routes, same `fetchJson` helper pattern in hooks, same query-key namespacing as e.g. `["ledger", projectId]` → we will use `["project-visits", projectId]`.
- **NFR-6 Quick Entry isolation**: Opening/closing Visits panel must not reset transaction form (`resetTransactionForm` is never called from Visits code).
- **NFR-7 TypeScript strictness**: Must pass `tsc --noEmit` (0 errors). Must pass `next build` (0 errors).
- **NFR-8 Conventional migration**: Created via `prisma migrate dev --create-only` (no auto-apply) so the resulting `.sql` file is manually inspectable for additive-only statements before application.

## Constraints
- **Technical**: PostgreSQL + Prisma. Provider is postgresql. All migrations are SQL under `prisma/migrations/YYYYMMDDHHMMSS_<name>/migration.sql`.
- **Business**: ADMIN/MANAGER roles only. No anonymous access. Project lock trumps role.
- **Dependencies**: No new npm packages. Use existing `lucide-react`, `zod`, `@tanstack/react-query`, `sonner`, `react-hook-form` + `@hookform/resolvers/zod` already present.
- **Naming**: `Visit` (singular). No "Widget", "Tour", "Appointment". Consistent capitalization.

## Assumptions
- A1: The user's instruction "do not use /docs" means `_doc` or `_md` doc-route endpoints; it doesn't constrain API routes (which we place under `/api/projects/[id]/visits`). We do not create `/docs` or `/visits` top-level routes.
- A2: Existing `getPrisma()` from [lib/prisma.ts](file:///e:/Projects/InteriorD_ledger/lib/prisma.ts) is the singleton DB client.
- A3: For the Visits header button icon we'll reuse a Lucide icon that is already imported OR add one; user's constraint is pattern consistency, not icon identity. We will pick `CalendarDays` or `MapPinHouse` from lucide-react (library is a dep, so any of its icons are fine).
- A4: Sequence uniqueness retry: Prisma P2002 on the `projectId_sequenceNumber` unique index is the signal to recompute MAX+1 and retry POST — up to 3 attempts before returning a 500-level error. This is standard practice without a dedicated sequence table.

## Open Questions
None outstanding. All requirements are explicit in the 22 sections.

## Acceptance Criteria

### AC-1: Prisma Visit model matches required fields
- **Type**: `rule`
- **Given**: the Prisma schema at `prisma/schema.prisma`
- **When**: inspecting the `Visit` model
- **Then**: Visit contains exactly `id String @id @default(cuid())`, `projectId String @map("project_id")`, `date DateTime`, `visitName String @map("visit_name")`, `description String?`, `sequenceNumber Int @map("sequence_number")`, `createdAt DateTime @default(now()) @map("created_at")`, `updatedAt DateTime @updatedAt @map("updated_at")`, plus a `project Project @relation` with `onDelete: Cascade`, plus `@@index([projectId, date])`, plus `@@unique([projectId, sequenceNumber])`; and Project gains `visits Visit[]`
- **Pass Condition**: Prisma schema parse succeeds and `prisma validate` returns 0 errors
- **Evidence**: `npx prisma validate` clean exit, grep for fields matches exactly

### AC-2: Migration is strictly additive (data safety)
- **Type**: `rule`
- **Given**: the migration SQL file produced for Visits
- **When**: running a full-text check for destructive tokens (DROP, ALTER COLUMN, ALTER TYPE RENAME, UPDATE, TRUNCATE, DELETE FROM) on existing tables, and cross-checking against tables list
- **Then**: the SQL file contains exactly zero references to existing tables (only `CREATE TABLE "Visit"`, `ALTER TABLE "Visit" ADD CONSTRAINT`, `CREATE INDEX`, `ALTER TABLE "Project"` — wait, actually `ALTER TABLE "Project" ADD COLUMN` is not needed; we do not need to store anything on Project; we only need the Prisma virtual relation and no Project-side column. Actually the relation is Visit→Project FK, so no Project schema change needed. Migration should reference ONLY the new Visit table and its indexes/constraints and the FK to Project.id.
- **Pass Condition**: Migration SQL contains 0 DROP statements and 0 ALTER TABLE statements against existing tables. The only CREATE/ALTER is for a new `Visit` table/index/constraint/FK.
- **Evidence**: `grep -Ei '^(DROP|ALTER TABLE "(Project|Transaction|Client|Contact|User|Session|Staff|SalaryRecord|ScheduleEvent|Settings)")' prisma/migrations/*_visits/migration.sql` yields 0 lines.

### AC-3: Existing records and calculations untouched
- **Type**: `rule`
- **Given**: the full implementation diff against main
- **When**: searching the code for any SQL/ORM update of existing project/client/contact/transaction/salary/schedule/users data that was not there before
- **Then**: zero mutation calls to existing tables outside of the existing project lock toggle (which we don't touch). The new code only reads projects for authorization/ownership and only creates/updates/deletes in the Visit table.
- **Pass Condition**: grep/code inspection confirms. Existing spec (lib/ledger.ts, lib/financial-overview.ts, components/ledger-pdf.tsx) byte-identical before/after.
- **Evidence**: File-modification list includes 0 files inside `lib/ledger*`, `lib/financial-overview.ts`, `lib/client-ledger.ts`, `components/ledger-pdf.tsx`.

### AC-4: API endpoints match the required structure
- **Type**: `rule`
- **Given**: the API routes folder
- **When**: listing `/api/projects/[id]/visits/**`
- **Then**: Exists GET `route.ts`, POST `route.ts`; and exists sub-path `/visits/[visitId]/route.ts` handling PATCH and DELETE.
- **Pass Condition**: 405 on wrong methods, 200/201/204 semantics on correct methods, each route calls verifySession, checks visibility, checks isLocked for mutations.
- **Evidence**: File tree + code inspection of each of the 2 route files.

### AC-5: Per-project visit numbering starts at 1 and never reuses deleted slots
- **Type**: `rule`
- **Given**: a project starting with 0 visits
- **When**: the following sequence occurs via API: POST visit → POST visit → POST visit (yields visits 1, 2, 3); then DELETE the visit with sequenceNumber=2; then POST a new visit; then rename visit 3 to "Kitchen Measurement"; then POST another visit.
- **Then**: final records in order of createdAt have sequenceNumber values [1, 3, 4, 5] and visitName values ["Visit 1", "Kitchen Measurement", "Visit 4", "Visit 5"]. No value 2 reappears.
- **Pass Condition**: Sequence numbers 1..5 present without 2 after delete/rename/create/create.
- **Evidence**: Test script logs or API assertions showing MAX+1 is always recomputed from DB after any intervening create/delete/rename.

### AC-6: Concurrent visit creation never assigns duplicate (projectId, sequenceNumber)
- **Type**: `rule`
- **Given**: a fresh project with 0 visits
- **When**: N=5 concurrent POST requests to `/api/projects/{id}/visits` arrive (identical payloads, different timing)
- **Then**: 5 visits are created with distinct sequenceNumbers 1..5; no 500 from unique constraint surfaces to the client; no duplicate entries in the table for (projectId, sequenceNumber).
- **Pass Condition**: Final set of sequence numbers after all 5 calls complete is exactly {1,2,3,4,5}.
- **Evidence**: Code review of the retry loop in POST; simulated concurrent run with `Promise.all` and retries.

### AC-7: Project isolation across API and list
- **Type**: `rule`
- **Given**: Two projects A and B each with at least 1 visit
- **When**: issuing GET `/api/projects/A/visits` and GET `/api/projects/B/visits` and attempting PATCH/DELETE visit-from-B via projectId=A path
- **Then**: A's list contains only A's visits; B's list contains only B's visits; cross-project PATCH returns 404 or 403; cross-project DELETE returns 404 or 403 (not 200).
- **Pass Condition**: Cross-project mutation fails.
- **Evidence**: API request/response inspection.

### AC-8: Locked project rejects mutations via API
- **Type**: `rule`
- **Given**: a project with isLocked=true and an existing visit, plus a valid MANAGER or ADMIN session
- **When**: attempting POST / PATCH / DELETE visits
- **Then**: each mutation returns 403 with JSON body `{ error: LOCKED_PROJECT_ERROR }` (same as transactions). GET remains 200.
- **Pass Condition**: 3 mutation HTTP status codes == 403. GET == 200.
- **Evidence**: API response logs / tests.

### AC-9: Visits button exists, panel toggles inline, form UX matches Quick Entry conventions
- **Type**: `rubric`
- **Dimension**: UI consistency with existing Project Ledger page
- **Scale**: 1-5
- **Anchors**: 1 = Visits rendered as modal or new route, inconsistent button style; 3 = Visits panel present but uses custom inline CSS, missing chevrons/animation; 5 = Visits button in PageHeader actions with same `Button variant="secondary"` styling as Export PDF / Share to Client, same lucide icon pattern (icon + text + mr-2), uses the same ChevronUp/ChevronDown collapse arrow as Quick Entry, toggles `isVisitsOpen` boolean, panel renders with same rounded borders/backgrounds/shadows/responsive grid as Quick Entry form.
- **Pass Threshold**: >= 4
- **Evidence**: Screenshot / code diff of page.tsx showing Button placement near existing actions and the collapse pattern mirroring lines L860-L875.

### AC-10: Form validation — Date required, Visit Name length, Description length (server + client)
- **Type**: `rule`
- **Given**: empty/new add-visit form
- **When**: submitting with missing date, visitName length 0, visitName length > 200, description > 2000 chars each on: frontend form, then bypassing frontend to hit the API with invalid values
- **Then**: Both layers reject with clear errors. Server uses Zod with bounds. No DB record is created when validation fails.
- **Pass Condition**: All 4 invalid submissions return non-2xx with structured errors.
- **Evidence**: Zod schema output + API responses.

### AC-11: Edit preserves sequenceNumber across visitName rename
- **Type**: `rule`
- **Given**: visit with sequenceNumber=3 originally named "Visit 3"
- **When**: sending PATCH with `{ visitName: "Kitchen Measurement" }` (and possibly updated date/description)
- **Then**: After patch, record sequenceNumber is still 3 (unchanged). Attempting to pass `sequenceNumber: 99` in client payload has no effect (server strips it).
- **Pass Condition**: DB sequenceNumber == 3 after PATCH regardless of client payload sequenceNumber field.
- **Evidence**: Query before/after.

### AC-12: Delete uses ConfirmDialog and only removes the target visit
- **Type**: `rule`
- **Given**: 3 visits in a project
- **When**: clicking Delete on visit 2 → confirming via dialog
- **Then**: After action, only visit 2 is gone (count == 2). Project is unchanged. Client/contact/transaction counts unchanged. Financial Summary Strip renders same credit/debit/balance.
- **Pass Condition**: Record counts and summary values match pre-delete except for one Visit row removed.
- **Evidence**: DOM counts + network tab delete + DB counts inspection.

### AC-13: Financial isolation: 0 change to credit/debit
- **Type**: `rule`
- **Given**: a project with existing transactions (and known totals from SummaryStrip before Visits feature added)
- **When**: creating, editing, deleting 10 visits across different projects in a session, triggering any ledger reloads and PDF functions
- **Then**: `ledger.totals.credit`, `ledger.totals.debit`, `ledger.totals.balance` remain byte-identical to pre-feature for the same project. PDF export / client share / contact share code paths import and call the same components with identical inputs (no visits field injected).
- **Pass Condition**: `useLedger` hook and route.ts GET still return identical totals. LedgerPDF component unchanged.
- **Evidence**: `ledger-pdf.tsx` and `lib/ledger.ts` are in the unmodified file list. Unit-style comparison of totals before/after same project state.

### AC-14: Responsive layout — no overlapping controls, no horizontal overflow introduced
- **Type**: `rubric`
- **Dimension**: Responsive correctness
- **Scale**: 1-5
- **Anchors**: 1 = visit actions overlap title or push Quick Entry off-screen; 3 = header buttons wrap on md but description column overflows; 5 = actions row uses same `flex gap-2 flex-wrap` container (which PageHeader already applies), Visits panel respects existing `px-6 lg:px-10` padding, columns truncate long descriptions with CSS line-clamp / ellipsis as the transaction columns do, no horizontal scrollbar appears at widths >= 375px that wasn't present before.
- **Pass Threshold**: >= 4
- **Evidence**: Resize to 375px and 768px snapshots via devtools, classes match QuickEntry grid.

### AC-15: TypeScript + build pass
- **Type**: `rule`
- **Given**: the finished code on a fresh clone (after running `prisma generate` as in `package.json build` script)
- **When**: `npx tsc --noEmit` then `npm run build` (which runs `prisma generate && next build`)
- **Then**: both commands exit with code 0 and 0 diagnostic errors; GetDiagnostics in VS Code returns empty array for the project workspace.
- **Pass Condition**: exit(0) for both.
- **Evidence**: Terminal logs captured.

### AC-16: Migration consistency (no drift)
- **Type**: `rule`
- **Given**: new migration file plus schema.prisma
- **When**: running `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script` on a fresh DB (or comparing the generated empty script)
- **Then**: schema and migration agree. No additional pending migrations / drift detected.
- **Pass Condition**: Diff shows empty SQL (no steps needed) OR only the new Visit steps if testing before apply; post-apply shows 0 steps.
- **Evidence**: diff script result or `prisma validate` success.
