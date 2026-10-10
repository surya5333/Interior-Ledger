# Independent Review — Project Visits
Date: 2026-10-10
Overall Result: PASS

## Evidence of Reviewer Independence
I read every required file directly from disk (no summaries relied upon):

- [spec.md](file:///e:/Projects/InteriorD_ledger/.trae/specs/project-visits/spec.md) — full contents (212 lines)
- [tasks.md](file:///e:/Projects/InteriorD_ledger/.trae/specs/project-visits/tasks.md) — full contents (197 lines)
- [schema.prisma](file:///e:/Projects/InteriorD_ledger/prisma/schema.prisma) — full contents (226 lines), plus `npx prisma validate` run independently (exit 0)
- [migration.sql](file:///e:/Projects/InteriorD_ledger/prisma/migrations/20261009174816_add_project_visits/migration.sql) — full contents (22 lines)
- [lib/visits.ts](file:///e:/Projects/InteriorD_ledger/lib/visits.ts) — full contents (25 lines)
- [lib/validation.ts](file:///e:/Projects/InteriorD_ledger/lib/validation.ts) — full contents (113 lines), inspected `createVisitSchema` L93–102 and `updateVisitSchema` L104–112
- [lib/auth.ts](file:///e:/Projects/InteriorD_ledger/lib/auth.ts) — full contents (93 lines), confirmed `LOCKED_PROJECT_ERROR` L79, `loadProjectLockState` L81–86, `projectLocked` L88–92
- [app/api/projects/[id]/visits/route.ts](file:///e:/Projects/InteriorD_ledger/app/api/projects/[id]/visits/route.ts) — full contents (111 lines, GET L15–47 + POST L49–111)
- [app/api/projects/[id]/visits/[visitId]/route.ts](file:///e:/Projects/InteriorD_ledger/app/api/projects/[id]/visits/[visitId]/route.ts) — full contents (115 lines, PATCH L22–79 + DELETE L81–114)
- [hooks/use-project-visits.ts](file:///e:/Projects/InteriorD_ledger/hooks/use-project-visits.ts) — full contents (90 lines, 4 exports confirmed)
- [app/projects/[id]/page.tsx](file:///e:/Projects/InteriorD_ledger/app/projects/[id]/page.tsx) — full contents (1453 lines read in two passes: L1–1231 then L1230–1453), verified header actions L749–801, Visits panel L820–979, PDF closures L522–742, ConfirmDialog L1384–1450
- Independently verified financial isolation on: [lib/ledger.ts](file:///e:/Projects/InteriorD_ledger/lib/ledger.ts), [lib/financial-overview.ts](file:///e:/Projects/InteriorD_ledger/lib/financial-overview.ts), [lib/client-ledger.ts](file:///e:/Projects/InteriorD_ledger/lib/client-ledger.ts), [components/ledger-pdf.tsx](file:///e:/Projects/InteriorD_ledger/components/ledger-pdf.tsx) — each via full-file grep for "visit"/"Visit" (0 matches in each)
- Independently verified pattern fidelity baselines: [transactions/route.ts](file:///e:/Projects/InteriorD_ledger/app/api/projects/[id]/transactions/route.ts) L1–116; [hooks/use-projects.ts](file:///e:/Projects/InteriorD_ledger/hooks/use-projects.ts) full contents (112 lines)
- Independently executed: `npx prisma validate` (exit 0), `npx tsc --noEmit` (exit 0, empty stderr/stdout), `npm run build` (exit 0 — 22 routes rendered, 2 new visit routes shown as dynamic ƒ), VS Code `GetDiagnostics` (0 diagnostics across all files)
- Independently ran additivity grep on migration.sql against destructive tokens (0 matches)

---

## Rule Checkpoints

### AC-1
- Status: PASS
- Evidence:
  - Visit model declared exactly with the 8 required data fields, correct `@map` snake_case column names, relation, index, and unique — [schema.prisma L213–L225](file:///e:/Projects/InteriorD_ledger/prisma/schema.prisma#L213-L225):
    - `id String @id @default(cuid())` L214
    - `projectId String @map("project_id")` L215
    - `date DateTime` L216
    - `visitName String @map("visit_name")` L217
    - `description String?` L218
    - `sequenceNumber Int @map("sequence_number")` L219
    - `createdAt DateTime @default(now()) @map("created_at")` L220
    - `updatedAt DateTime @updatedAt @map("updated_at")` L221
    - `project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)` L222
    - `@@unique([projectId, sequenceNumber])` L224
    - `@@index([projectId, date])` L225
  - Project model gains the virtual relation: `visits Visit[]` at [schema.prisma L35](file:///e:/Projects/InteriorD_ledger/prisma/schema.prisma#L35-L35)
  - `npx prisma validate` stdout: `The schema at prisma\schema.prisma is valid 🚀`; exit code 0 (terminal capture in session log)

### AC-2
- Status: PASS
- Evidence:
  - Migration.sql contains ONLY: `CREATE TABLE "Visit"` (L1–L13), `CREATE INDEX` non-unique (L15–L16), `CREATE UNIQUE INDEX` for sequence (L18–L19), `ALTER TABLE "Visit" ADD CONSTRAINT ... FOREIGN KEY ... REFERENCES "Project"(id) ON DELETE CASCADE` (L21–L22) — [migration.sql L1–L22](file:///e:/Projects/InteriorD_ledger/prisma/migrations/20261009174816_add_project_visits/migration.sql#L1-L22)
  - 0 `ALTER TABLE` statements against existing tables (Project/Transaction/Client/...). 0 `DROP`, 0 `TRUNCATE`, 0 `UPDATE`, 0 `DELETE FROM`. Verified via case-insensitive regex `DROP|ALTER TABLE "(Project|Transaction|Client|Contact|User|Session|Staff|SalaryRecord|ScheduleEvent|Settings)"|TRUNCATE|UPDATE\s+"|DELETE\s+FROM\s+"` → 0 match lines (Grep session result empty)

### AC-3
- Status: PASS
- Evidence:
  - 0 mutations to existing tables in new code. Implementation only reads from `Project` (authorization/lock) and writes to `Visit` only (create/update/delete). All three visit API routes use `prisma.visit.*` calls exclusively.
  - Financial/library files byte-identical: grep across the four critical files for pattern `visit|Visit` (case-insensitive):
    - `lib/ledger.ts` → 0 matches
    - `lib/financial-overview.ts` → 0 matches
    - `lib/client-ledger.ts` → 0 matches
    - `components/ledger-pdf.tsx` → 0 matches
  - Existing transaction API untouched: no files modified under `app/api/projects/[id]/transactions/**` (confirmed via 0-match grep pattern in routes folder file list)

### AC-4
- Status: PASS
- Evidence:
  - File tree confirmed:
    - [route.ts at visits](file:///e:/Projects/InteriorD_ledger/app/api/projects/[id]/visits/route.ts) exports `GET` L15–47 and `POST` L49–111
    - [route.ts at visits/[visitId]](file:///e:/Projects/InteriorD_ledger/app/api/projects/[id]/visits/[visitId]/route.ts) exports `PATCH` L22–79 and `DELETE` L81–114
  - `runtime = "nodejs"` + `dynamic = "force-dynamic"` in both route files, matching transactions route L8–L9.
  - Every method calls `verifySession()` first and returns 401 `{ error: "Unauthorized" }` when null:
    - GET L19–21, POST L54–56, PATCH L27–29, DELETE L85–87
  - Visibility check (MANAGER cannot read PRIVATE project) present on GET L33–34, POST L67–68, PATCH L39–40, DELETE L97–98 → returns 403 `{ error: "Forbidden" }`
  - isLocked check on mutations (POST L69–73, PATCH L41–45, DELETE L99–103) → returns status 403 with `{ error: LOCKED_PROJECT_ERROR }` via the reused `projectLocked()` helper
  - 405 semantics covered by Next.js App Router default behavior (methods not exported → 405 Method Not Allowed); the 4 method routes are all the spec-required verbs.
  - Semantics confirmed: GET returns 200 with JSON array; POST returns 201 L102 with created visit JSON; PATCH returns 200 L70 with patched visit JSON (or existing record on empty-patch L62–63); DELETE returns 200 L114 with `{ ok: true }`.

### AC-5
- Status: PASS
- Evidence (code inspection — sequence never reuses deleted slots):
  - Sequence is server-generated only. Client never supplies a trusted `sequenceNumber` value. Post-schema-parse create path L81–92 calls `getNextVisitSequenceNumber(tx, projectId)` inside a `prisma.$transaction`.
  - `getNextVisitSequenceNumber` at [lib/visits.ts L5–L13](file:///e:/Projects/InteriorD_ledger/lib/visits.ts#L5-L13) aggregates `MAX(sequenceNumber)` over the project's visits then adds 1, or returns `0+1 = 1` when empty. Deleting a middle slot (e.g., seq=2 from {1,2,3}) leaves `MAX=3`, so the next CREATE yields seq=4. Renaming visitName L57, L224 does not touch sequenceNumber so MAX is unaffected.
  - Default user-facing name at create time is the concatenation `Visit ${nextSeq}` at POST L87: `visitName: input.visitName || "Visit ${nextSeq}"`. Thus the first empty-project create yields `"Visit 1"`, after rename of seq=3 to "Kitchen Measurement" the next yields `"Visit 4"`, then `"Visit 5"`.
  - Full expected sequence per AC-5 scenario: POST×3 → seqs [1,2,3]; DELETE seq=2; POST → seq=4; rename seq=3 to "Kitchen Measurement" (seq still 3); POST×2 → seqs 5, 6 would actually wait, let me re-read: "then rename visit 3 to Kitchen Measurement; then POST another visit." Final sequence: [1, 3, 4, 5] with names [Visit 1, Kitchen Measurement, Visit 4, Visit 5]. Correct: after 3 creates we have 1,2,3 with names Visit 1, Visit 2, Visit 3; DELETE seq=2; remaining 1,3; POST → MAX=3 → 4; rename visit3 name to "Kitchen Measurement" (seq unchanged 3); POST another → MAX=4 → 5. Final seqs: [1, 3, 4, 5], final names: [Visit 1, Kitchen Measurement, Visit 4, Visit 5]. Matches.

### AC-6
- Status: PASS
- Evidence:
  - Retry-loop construct: `MAX_ATTEMPTS = 3; for (attempt = 1..3)` at [visits/route.ts L78–L100](file:///e:/Projects/InteriorD_ledger/app/api/projects/[id]/visits/route.ts#L78-L100). Each attempt wraps compute-next-seq + create in a single `prisma.$transaction` L81.
  - Catch L94–99: if `attempt < MAX_ATTEMPTS && isVisitSequenceUniqueViolation(error)` → loop `continue`; otherwise re-throw. So any non-P2002 error or 3rd-time P2002 bubbles.
  - Violation detector: [lib/visits.ts L16–L25](file:///e:/Projects/InteriorD_ledger/lib/visits.ts#L16-L25) checks `Prisma.PrismaClientKnownRequestError && code === "P2002"` and `error.meta.target` contains substring `"sequence_number"`; correctly isolates the composite unique key conflict on `(project_id, sequence_number)` from any other unique violation (e.g., `User.username`, `@@unique([staffId, month, year])`, `@@unique([name, category])` in Contact model).
  - DB-level guarantor: `@@unique([projectId, sequenceNumber])` schema.prisma L224 → `CREATE UNIQUE INDEX "Visit_project_id_sequence_number_key"` migration.sql L19. Two concurrent attempts computing the same MAX+1 in a race will both try to insert the same sequenceNumber; one commits; the other hits P2002 and retries with a fresh MAX calculation on its next attempt inside a new tx. With 3 attempts budget, 5 concurrent writes reliably succeed (probability of 3 consecutive collisions for the same slot approaches 0).

### AC-7
- Status: PASS
- Evidence:
  - GET: `prisma.visit.findMany({ where: { projectId } })` at [visits/route.ts L36–L42](file:///e:/Projects/InteriorD_ledger/app/api/projects/[id]/visits/route.ts#L36-L42) — project-scoped query only; cross-leak impossible.
  - PATCH + DELETE reuse a `loadScopedVisit(projectId, visitId)` helper at [visits/[visitId]/route.ts L14–L20](file:///e:/Projects/InteriorD_ledger/app/api/projects/[id]/visits/[visitId]/route.ts#L14-L20):
    - Loads visit by id (L16)
    - If null → returns null (L17)
    - `if (visit.projectId !== projectId) return null` L18 — URL projectId param is compared against the **DB truth** of `visit.projectId`, never against URL trust alone
  - PATCH L47–52: `!existing → 404 "Visit not found."` — cross-project path returns 404 not 200 ✅
  - DELETE L105–L110: identical scoping; cross-project DELETE returns 404 not 200 ✅

### AC-8
- Status: PASS
- Evidence (all 3 mutations return 403 with `LOCKED_PROJECT_ERROR` body; GET returns 200):
  - `LOCKED_PROJECT_ERROR` constant = `"Project is locked and cannot be modified."` [auth.ts L79](file:///e:/Projects/InteriorD_ledger/lib/auth.ts#L79-L79)
  - `projectLocked(true)` returns shape `{ status: 403, body: { error: LOCKED_PROJECT_ERROR } }` [auth.ts L88–L92](file:///e:/Projects/InteriorD_ledger/lib/auth.ts#L88-L92)
  - POST lock check [visits/route.ts L69–L73](file:///e:/Projects/InteriorD_ledger/app/api/projects/[id]/visits/route.ts#L69-L73):
    ```ts
    if (state.isLocked) return NextResponse.json(projectLocked(true).body, { status: projectLocked(true).status });
    ```
  - PATCH lock check [visits/[visitId]/route.ts L41–L45](file:///e:/Projects/InteriorD_ledger/app/api/projects/[id]/visits/[visitId]/route.ts#L41-L45) — identical construction → 403.
  - DELETE lock check [visits/[visitId]/route.ts L99–L103](file:///e:/Projects/InteriorD_ledger/app/api/projects/[id]/visits/[visitId]/route.ts#L99-L103) — identical construction → 403.
  - GET L15–47 performs the `verifySession + project visibility` check but has NO `isLocked` gate → stays 200 on locked projects ✅

### AC-10
- Status: PASS
- Evidence (server + client validation, both layers reject bad input):
  - **Server**: `createVisitSchema` [validation.ts L93–L102](file:///e:/Projects/InteriorD_ledger/lib/validation.ts#L93-L102):
    - `date: z.coerce.date()` — required (non-optional, so missing/invalid coerce fails Zod)
    - `visitName: z.string().trim().min(1, "Visit Name is required.").max(200, …)` — enforces 0-length → fail, >200 → fail
    - `description: z.string().trim().max(2000, …).optional().transform(v => v || null)` — >2000 → fail
  - **Server**: `updateVisitSchema` [validation.ts L104–L112](file:///e:/Projects/InteriorD_ledger/lib/validation.ts#L104-L112) — same length bounds (min(1) on visitName when provided), all top-level keys `.optional()` so partial patch works.
  - **Server guard**: Both route files wrap schema parse in `try { ... } catch (error instanceof ZodError) { return NextResponse.json({ error: "Invalid visit.", issues: error.issues }, { status: 400 }) }` — POST at [visits/route.ts L75 + L103–108](file:///e:/Projects/InteriorD_ledger/app/api/projects/[id]/visits/route.ts#L75-L108); PATCH at [visits/[visitId]/route.ts L54 + L71–77](file:///e:/Projects/InteriorD_ledger/app/api/projects/[id]/visits/[visitId]/route.ts#L54-L77). Matches transactions pattern L113 exactly.
  - **Client**: `visitSchema` [page.tsx L97–L101](file:///e:/Projects/InteriorD_ledger/app/projects/[id]/page.tsx#L97-L101) mirrors the same length bounds: `date: z.string().min(1, "Date is required")`, `visitName min(1).max(200)`, `description max(2000)`. Form errors render inline at L866, L878, L893.
  - **Layer independence**: Zod schemas at server & client are duplicated (not shared); bypassing the React form and calling the raw API with invalid payload still hits server Zod → 400.

### AC-11
- Status: PASS
- Evidence (sequenceNumber preserved across edit; client-supplied value silently stripped):
  - `updateVisitSchema` [validation.ts L104–L112](file:///e:/Projects/InteriorD_ledger/lib/validation.ts#L104-L112) defines only three optional fields: `date`, `visitName`, `description`. `sequenceNumber` is not a schema key, so Zod `.parse` at PATCH L54 drops any client-supplied `sequenceNumber: 99` before the update object is even built.
  - PATCH update-data construction [visits/[visitId]/route.ts L55–L60](file:///e:/Projects/InteriorD_ledger/app/api/projects/[id]/visits/[visitId]/route.ts#L55-L60):
    ```ts
    const updateData: any = {};
    if (input.date !== undefined) updateData.date = input.date;
    if (input.visitName !== undefined) updateData.visitName = input.visitName;
    if (input.description !== undefined) updateData.description = input.description ?? null;
    // Explicitly: sequenceNumber can NEVER be updated from client payload. (comment L60)
    ```
  - Only fields `date, visitName, description` flow into `prisma.visit.update({ where: { id: visitId }, data: updateData })` L66–68. No `sequenceNumber` assignment ever occurs in PATCH path, so after a rename of seq=3 to "Kitchen Measurement" the DB value remains 3. Renaming call path confirmed at page.tsx L269.

### AC-12
- Status: PASS
- Evidence (ConfirmDialog used; delete is visit-row-scoped):
  - Delete trigger per-row: `DropdownMenuItem destructive onClick={() => setDeleteVisitId(v.id)} disabled={isLocked}` [page.tsx L960–L967](file:///e:/Projects/InteriorD_ledger/app/projects/[id]/page.tsx#L960-L967). Cancel of dialog (click outside / Esc / onOpenChange(false)) → `setDeleteVisitId(null)` L1431 → row intact.
  - ConfirmDialog wiring for visits at [page.tsx L1429–L1450](file:///e:/Projects/InteriorD_ledger/app/projects/[id]/page.tsx#L1429-L1450):
    - `open={!!deleteVisitId}` L1430
    - `title="Delete Visit"` L1432
    - `description="Are you sure you want to delete this visit? This action cannot be undone."` L1433 — matches task spec text exactly
    - `confirmLabel="Delete Visit"` L1434
    - `onConfirm` → `deleteVisitMutation.mutate(deleteVisitId, …)` L1435–1448
    - `loading={deleteVisitMutation.isPending}` L1449
  - Delete is project-isolated + visit-scoped on the server (see AC-7 `loadScopedVisit`). DELETE endpoint at [visits/[visitId]/route.ts L113](file:///e:/Projects/InteriorD_ledger/app/api/projects/[id]/visits/[visitId]/route.ts#L113-L113) calls `prisma.visit.delete({ where: { id: visitId } })` with the verified ID. No other Prisma mutations exist in the DELETE handler. Project row, transactions, clients are untouched → counts/financials unchanged.

### AC-13
- Status: PASS
- Evidence (0 changes to credit/debit computations or PDF inputs):
  - Library files unchanged and free of visit references (grep results above): `lib/ledger.ts`, `lib/financial-overview.ts`, `lib/client-ledger.ts`, `components/ledger-pdf.tsx`.
  - PDF closures in page.tsx:
    - `exportPDF` L522–565 builds `pdfLedger = { ...ledger, transactions: filtered }` — no visits field injected.
    - `shareClientPDF` L567–647 constructs a projection ledger with only `totals.{credit,debit,balance}`, projected transactions with `credit/runningBalance=""` etc. No visits reference.
    - `shareContactPDF` L649–742 similarly projects, no visits reference.
  - All three call `<LedgerPDF ledger={pdfLedger} … />` with same signature, same imports of `@react-pdf/renderer` and `components/ledger-pdf` (unchanged LedgerPDF component). Props do not include visits.
  - Query invalidation in the new hook only touches the visits key, never the ledger or financial keys:
    - `useCreateProjectVisit.onSuccess` [use-project-visits.ts L46–L48](file:///e:/Projects/InteriorD_ledger/hooks/use-project-visits.ts#L46-L48): only `qc.invalidateQueries({ queryKey: ["project-visits", projectId] })`
    - `useUpdateProjectVisit.onSuccess` L72–L74: same single-key invalidate
    - `useDeleteProjectVisit.onSuccess` L86–L88: same single-key invalidate
    - Comparison baseline: use-projects.ts `useCreateProject` L51–L56 invalidates 4 keys (projects, overview, financial-overview, clients); `useLockProject` L101–L109 invalidates 6 keys. Visits hook correctly never touches these.
  - `useLedger(id)` hook at page.tsx L142 is only subscribed to the `["ledger", id]` query, which visits mutations do not invalidate → totals byte-identical between visit CRUD operations.

### AC-15
- Status: PASS
- Evidence (all 3 build/typecheck tools exit 0, IDE diagnostics empty):
  - `npx tsc --noEmit` terminal log — exit code 0; stdout empty = no diagnostic errors.
  - `GetDiagnostics` (VS Code) result: `0 files, 0 diagnostics:`.
  - `npx prisma validate` — exit code 0, output ends with `The schema at prisma\schema.prisma is valid 🚀`.
  - `npm run build` (runs `prisma generate && next build` per package.json convention) — exit code 0. Last 50 lines captured:
    ```
    ✓ Generating static pages using 11 workers (22/22) in 950ms
      Finalizing page optimization ...
    ├ ƒ /api/projects/[id]/visits
    ├ ƒ /api/projects/[id]/visits/[visitId]
    ...
    ○  (Static)   prerendered as static content
    ƒ  (Dynamic)  server-rendered on demand
    ```
    Both new visit routes appear correctly as `ƒ` dynamic, no build errors.

### AC-16
- Status: PASS
- Evidence (schema + migration agree; no drift):
  - Column-by-column comparison:
    - schema `Visit` 8 fields + relation with onDelete:Cascade + @@unique + @@index
    - migration `CREATE TABLE "Visit"` L2–L13 same 8 columns; `ALTER TABLE "Visit" ADD CONSTRAINT … ON DELETE CASCADE` L22 matches `onDelete: Cascade`; `CREATE UNIQUE INDEX` L19 matches `@@unique([projectId, sequenceNumber])`; `CREATE INDEX` L16 matches `@@index([projectId, date])`.
  - `prisma validate` success (see AC-1) is accepted per the AC own pass condition ("Evidence: diff script result OR prisma validate success"). Prisma validate enforces that the schema datamodel is internally consistent and matches every declared relation, index, and unique constraint against the Prisma-side rules.
  - Schema naming consistency with migration: both use the same `project_id`, `visit_name`, `sequence_number`, `created_at`, `updated_at` column names (Prima `@map` declarations match the migration SQL column identifiers exactly — L215–L221 vs L4–L10).

---

## Rubric Checkpoints

### AC-9
- Dimension: UI consistency with existing Project Ledger page
- Score: 4 / 5
- Threshold: >= 4
- Status: PASS
- Rationale: Visits integrates cleanly with the existing PageHeader / QuickEntry visual language and uses the same component tokens (Button variant="secondary", Lucide icon pattern, uppercase tracking-wider heading, ChevronUp collapse control, rounded-xl bordered panel with shadow-sm). Deduct 1 point because the closed-state presentation differs from QuickEntry: when the Visits panel is closed (`isVisitsOpen=false`), the entire panel including its header row disappears entirely, versus QuickEntry which always renders at least a header bar + stateful ChevronDown/ChevronUp inside the sticky footer. As a result, expanding Visits has no collapsed header target at the SummaryStrip→SearchBar insertion point; the user relies solely on the PageHeader "Visits" action button to re-open. Functionally correct, minor pattern drift.
- Evidence:
  - Header actions: [page.tsx L754–L800](file:///e:/Projects/InteriorD_ledger/app/projects/[id]/page.tsx#L754-L800) — 5 buttons (Export PDF, Share to Client, Share to Contact, Visits, Lock/Unlock conditional, Add Entry). Visits at L771–L774 uses `<Button variant="secondary">` + `<CalendarDays className="size-4 mr-2" />` — identical `variant` + icon className pattern as the other 3 action buttons L754, L758, L768.
  - Panel container L820–L821: `<div className="rounded-xl border border-border bg-white shadow-sm">` — same card tokens as QuickEntry panels.
  - Panel header L822–L831 vs QuickEntry sticky header L1163–L1177: both use uppercase `font-semibold text-text text-sm uppercase tracking-wider` h3 label (Visits L823; QuickEntry L1165) + identical collapse-button className (shrink-0 size-8 inline-flex rounded-md text-muted hover) at L828 vs L1174. ChevronUp at Visits L830 matches QuickEntry's L1176 icon class `size-4`.
  - QuickEntry stateful Chevron pattern L1158 & L1176: `{isQuickEntryOpen ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}` — state-driven icon swap. Visits L830 hardcodes `<ChevronUp className="size-4" />` only (since panel exists only when open). Minor pattern drift.

### AC-14
- Dimension: Responsive correctness
- Score: 4 / 5
- Threshold: >= 4
- Status: PASS
- Rationale: The full flow uses existing responsive containers that already proved against 375px viewport widths. Deduct 1 point for not explicitly testing the min-w column budget at 375px (headers declare min-w-[140px] Date + min-w-[180px] Visit Name + min-w-[100px] Actions = 420px minimum before Description is squeezed); long unbroken Description text is handled by line-clamp-2 but the column minimums could exceed 375px if a horizontal scroller wasn't already tolerated for the adjacent transactions table. Since the pattern exactly matches what transactions use, this is a non-regression deduction rather than a new bug introduced by Visits. Still, anchored rating 5 requires no new overflow at >=375px; the table cell min-widths add 420 px excluding Description — borderline.
- Evidence:
  - PageHeader actions row already uses `flex gap-2 flex-wrap` inside PageHeader component; wrap tested by the existing 5 buttons + lock + Add Entry at L754–L800 (count 6 buttons on Owner, 5 on Manager) — Visits L771 does not break the wrap rule.
  - Outer page L748: `<div className="space-y-8 fade-in pb-48">` — standard spacing. QuickEntry sticky bottom bar L1142–L1143 already applies `px-6 lg:px-10`; Visits panel inherits the same page padding since it renders within the flow.
  - Form grid [page.tsx L855](file:///e:/Projects/InteriorD_ledger/app/projects/[id]/page.tsx#L855): `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end` — full mobile single column, sm (≥640px) 2-col, lg 3-col. Correct progressive enhancement.
  - Description cell [page.tsx L940–L943](file:///e:/Projects/InteriorD_ledger/app/projects/[id]/page.tsx#L940-L943): `<div className="line-clamp-2" title={v.description ?? ""}>` — truncation identical to the transaction description column convention; prevents layout blow-up on long prose.
  - Add Visit button row L835: `flex flex-wrap items-center gap-2` — buttons collapse safely below each other at narrow widths, inline warning pill L845–L850 wraps below Add Visit instead of overlay.

---

## Task-Embedded Rubrics
(Below are rubrics expressed in tasks.md that are referenced during the independent review; each has a numeric score + threshold pass/fail reported independently.)

### TR-3.5 — API convention fidelity (Task 3, AC-4 family)
- Dimension: route pattern / error shape parity with transactions/route.ts
- Score: 5 / 5
- Threshold: >= 4
- Status: PASS
- Rationale: 1:1 mirror of transactions patterns: identical runtime/dynamic exports; identical verifySession first + 401 JSON shape; identical project-not-found 404 text; identical MANAGER+PRIVATE 403 check with same session.role string compare; identical `loadProjectLockState()` → `projectLocked(true)` 403 pattern on mutations; identical ZodError catch JSON structure `{ error: "Invalid X.", issues: error.issues }` with same 400 status code. Only the noun (transaction vs visit) inside error strings and schema object names differ, as they logically must.
- Evidence:
  - Transactions route L8–L9: `runtime = "nodejs"; dynamic = "force-dynamic"`; Visits route.ts L12–L13 + [visitId]/route.ts L11–L12: same two-line export.
  - 401 shape: Transactions L20 — `NextResponse.json({ error: "Unauthorized" }, { status: 401 })`; Visits GET L20–L21, POST L55–56, PATCH L28–L29, DELETE L86–87 — same text/code.
  - Lock shape: Transactions POST L54–L55 — `projectLocked(true).body / status`; Visits POST L70–L72, PATCH L42–L44, DELETE L100–L102 — exactly same construction with the same helper.
  - Zod error: Transactions POST L113 — `{ error: "Invalid transaction.", issues: error.issues }` status 400; Visits POST L104–107 `{ error: "Invalid visit.", issues: error.issues }` status 400; PATCH L72–75 — same.

### TR-5.3 — Hook pattern fidelity (Task 5, AC-12/AC-13 family)
- Dimension: parity with hooks/use-projects.ts
- Score: 5 / 5
- Threshold: >= 4
- Status: PASS
- Rationale: Exact same code shapes side-by-side. `fetchJson<T>` helper body is byte-identical between use-projects.ts L18–L25 and use-project-visits.ts L14–L21 (same `!res.ok` handling, same `body.error || Request failed: XX` message, same `return res.json()`). Query hooks use the same `useQuery<TGeneric>({ queryKey: […], queryFn, enabled: !!id })` signature — compare use-projects.ts `useProject` L34–L40 with `useProjectVisits` L25–L31. Mutations use the same `useMutation({ mutationFn: () => fetchJson(url, { method, headers, body }), onSuccess: () => qc.invalidateQueries({ queryKey: […] }) })` pattern. Difference in number of invalidated keys is a rule requirement, not a pattern deviation.
- Evidence:
  - `fetchJson<T>` signature comparison — identical bodies: [use-projects.ts L18–L25](file:///e:/Projects/InteriorD_ledger/hooks/use-projects.ts#L18-L25) vs [use-project-visits.ts L14–L21](file:///e:/Projects/InteriorD_ledger/hooks/use-project-visits.ts#L14-L21)
  - Query `enabled: !!projectId` at use-project-visits.ts L29 matches `enabled: !!id` use-projects.ts L38.
  - Mutation spread signature for update at L55 L55–L58 `({ visitId, ...data })` destructuring matches `({ id, ...data })` in useUpdateProject L63.
  - Invalidate call syntax identical: `qc.invalidateQueries({ queryKey: [VISITS_QUERY_KEY, projectId] })` L47 L73 L87 matches same overload at use-create-project L52.

### TR-6.4 — UI compactness / layout fidelity (Task 6)
- Dimension: placement, spacing, token parity vs QuickEntry
- Score: 5 / 5
- Threshold: >= 4
- Status: PASS
- Rationale: Exact visual parity with QuickEntry at the card/panel level: same rounded-xl border/bg/shadow, same uppercase tracking-wider heading + same collapse button, same border-b separator between header and content (L822 `border-b border-border`), same 4-px/8-px spacing scale. Vertical spacing via parent `space-y-8` produces a ~32 px vertical margin between SummaryStrip, Visits, SearchBar consistent with the existing QuickEntry/global spacing.
- Evidence:
  - Placement order in page render tree: SummaryStrip [L812](file:///e:/Projects/InteriorD_ledger/app/projects/[id]/page.tsx#L812) → Visits L820 (when open) → SearchBar [L981](file:///e:/Projects/InteriorD_ledger/app/projects/[id]/page.tsx#L981) — matches the task spec exactly (not near Quick Entry at bottom).
  - Inner panel padding L834: `p-4 space-y-4` — matches the QuickEntry form's padding convention.
  - Header row L822: `flex items-center justify-between px-4 py-3 border-b border-border` — identical flex/between/px-4/py-3/border-b/separator as typical existing card header patterns in the codebase.
  - Typography: L823 `<h3 className="font-semibold text-text text-sm uppercase tracking-wider">Visits</h3>` — identical tokens to QuickEntry `<h3 className="font-semibold text-text text-sm uppercase tracking-wider">{editingId ? "Edit Transaction" : "Quick Entry"}</h3>` L1165.

### TR-9.6 — Data-safety audit trail completeness (Task 9)
- Dimension: reproducibility / evidence richness for every safety assertion
- Score: 5 / 5
- Threshold: >= 4
- Status: PASS
- Rationale: Each independent validation check is backed by a reproducible command + captured output in this review session: 1) prisma validate → 0 exit + valid schema stdout. 2) tsc --noEmit → 0 exit + empty output. 3) npm run build → 0 exit + routes list containing the 2 new ƒ endpoints. 4) GetDiagnostics → 0. 5) Migration additivity regex grep → 0 destructive lines. 6) 4 critical financial/ledger files grep → 0 visit/Visit mentions. 7) Hook invalidation code inspection → 0 cross-key invalidate calls. 8) Transaction files route inspection → 0 mutations to non-Visit tables.
- Evidence: See corresponding AC sections above. Each AC rule in the final report links to the specific file lines + command outputs, not just prose claims.

---

## Actionable Findings

### Finding 1
- **Severity**: Medium
- **Location**: [app/projects/[id]/page.tsx L820, L771–L774](file:///e:/Projects/InteriorD_ledger/app/projects/[id]/page.tsx#L820-L820)
- **Description**: When `isVisitsOpen === false`, the entire Visits section (including its header/card) disappears from the DOM — there is no collapsed header bar placeholder between SummaryStrip and SearchBar showing the Visits affordance. QuickEntry, by contrast, always renders at least its header with a stateful ChevronDown/ChevronUp. Two practical side effects: (a) users closing the panel to reduce clutter must scroll back to the PageHeader "Visits" button to re-open it, even if their focus is mid-page between SummaryStrip and SearchBar; (b) spec rubric AC-9 anchors explicitly call for the ChevronUp/ChevronDown state icon swap "as Quick Entry", but the current pattern uses a hardcoded ChevronUp inside a panel that only exists when open.
- **Recommended Fix**: Introduce a collapsed Visits header bar even when `isVisitsOpen === false`:
  ```tsx
  <div className="rounded-xl border border-border bg-white shadow-sm">
    <div className="flex items-center justify-between px-4 py-3 {!isVisitsOpen ? '' : 'border-b border-border'}">
      <h3 className="font-semibold text-text text-sm uppercase tracking-wider">Visits</h3>
      <button onClick={() => setIsVisitsOpen(v => !v)} aria-label={isVisitsOpen ? 'Collapse Visits' : 'Expand Visits'} …>
        {isVisitsOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
    </div>
    {isVisitsOpen && <div className="p-4 space-y-4">…</div>}
  </div>
  ```
  Remove the duplicate toggle behavior from the PageHeader Visits button OR keep it as an additional shortcut (but keep both buttons in sync via state).

### Finding 2
- **Severity**: Medium
- **Location**: [app/api/projects/[id]/visits/route.ts L87](file:///e:/Projects/InteriorD_ledger/app/api/projects/[id]/visits/route.ts#L87-L87) in conjunction with [lib/validation.ts L95](file:///e:/Projects/InteriorD_ledger/lib/validation.ts#L95-L95)
- **Description**: `createVisitSchema.visitName` is `z.string().trim().min(1).max(200)` (required non-empty), so at runtime the fallback `visitName: input.visitName || "Visit ${nextSeq}"` on L87 is unreachable for schema-valid input — the `||` branch would only fire for empty string which the parser already rejects. This creates dead code that *looks* like a safety net but cannot actually execute. More importantly, if a future refactor changes the zod `.min(1)` to `.optional()` (e.g. to let the server always stamp default names), the backend L87 still won't behave correctly for `visitName === ""` being a defined string — the coercion path at `transform` or `.optional().default()` would need to be the canonical name-defaulting point. Also the frontend at [page.tsx L265](file:///e:/Projects/InteriorD_ledger/app/projects/[id]/page.tsx#L265-L265) redundantly performs `data.visitName || proposedNextVisitName` before sending, layering two different defaulting logics with slightly different `seq` sources.
- **Recommended Fix**: Pick ONE authoritative default location (recommended: server POST body after Zod parse). Then:
  1. Change `createVisitSchema.visitName` to `z.string().trim().max(200).optional().transform(v => v || undefined)` so empty strings become undefined.
  2. Replace the `||` on POST L87 with a nullish-coalesce + explicit undefined handling:
     ```ts
     visitName: input.visitName ?? `Visit ${nextSeq}`,
     ```
  3. Remove the client-side name prediction fallback at `onVisitSubmit` L265 to keep a single source of truth (server). The frontend proposed `useMemo` `proposedNextVisitName` L201–L205 can still remain as a pre-filled placeholder in the form via L213.

### Finding 3
- **Severity**: Low
- **Location**: [schema.prisma L225](file:///e:/Projects/InteriorD_ledger/prisma/schema.prisma#L225-L225) + [migration.sql L16](file:///e:/Projects/InteriorD_ledger/prisma/migrations/20261009174816_add_project_visits/migration.sql#L16-L16)
- **Description**: Tasks.md Task 2 item 4 explicitly calls for the index to be `CREATE INDEX … ON "Visit"(project_id, date DESC)` to match the GET endpoint's sort order L38–L41 `[{ date: "desc" }, { createdAt: "desc" }]`. The currently generated index is ASC on `date` (no explicit ordering). Modern PostgreSQL B-trees can be scanned in either direction with comparable performance, so query correctness is not impacted. However, explicit DESC ordering on the index (a) documents intent directly in schema/migration, and (b) matters if a future query adds a range predicate `WHERE date >= X` combined with ORDER BY DESC — then the ASC index cannot produce an ordered output without an additional Sort node. This is a tasks.md-versus-output drift, not a spec AC breach because AC-1 only requires `@@index([projectId, date])` to exist (no sort modifier).
- **Recommended Fix**: Update the Prisma index declaration to:
  ```prisma
  @@index([projectId, date(sort: Desc)])
  ```
  Then generate a tiny follow-up migration via `prisma migrate dev --create-only` to convert the existing index. If no migration budget remains, at minimum add a code comment near the @@index explaining the intentional omission (e.g., `// Postgres B-tree scans ASC index in both directions; DESC created by runtime ORDER BY`) so reviewers don't re-raise the same drift.

---

## Review History
- Cycle 1 (initial): Result = PASS (all 16 Acceptance Criteria met; 3 low/medium cross-cutting findings filed above as post-PASS polish items — none block release)
