# Interior Ledger — Project Visits Module - Implementation Plan

> Mandatory STEP order from user requirement §20 preserved: 1 inspect (done) → 2 model → 3 migration → 4 API + 5 sequence → 6 hook → 7 button/panel → 8 CRUD → 9 permissions → 10 validate.

## Task 1: Define Visit Prisma model + Project relation (STEP 2)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None (STEP 2 first in sequence)
- **Description**:
  - Add to `prisma/schema.prisma`:
    - New `Visit` model with `id String @id @default(cuid())`, `projectId String @map("project_id")`, `date DateTime`, `visitName String @map("visit_name")`, `description String?`, `sequenceNumber Int @map("sequence_number")`, `createdAt DateTime @default(now()) @map("created_at")`, `updatedAt DateTime @updatedAt @map("updated_at")`, relation `project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)`, `@@unique([projectId, sequenceNumber])`, `@@index([projectId, date])`.
    - Add `visits Visit[]` to existing `Project` model (virtual only — no DB column).
  - Confirm no existing Project/Client/Contact/Transaction/Staff/etc model fields are touched.
- **Acceptance Criteria Addressed**: AC-1, AC-3, AC-13
- **Test Requirements**:
  - `rule` TR-1.1: `npx prisma validate` exits 0
  - `rule` TR-1.2: grep for `model Visit` exists and contains exactly 8 data fields + 1 relation + 1 unique + 1 index; grep for `visits Visit[]` in Project block only
  - `rule` TR-1.3: diff of schema.prisma shows NO line deletions or field edits outside the Visit model block and one line addition inside Project model
- **Notes**: Match existing Prisma style: `@map("snake_case")` for columns, index naming matches patterns in Transaction.

## Task 2: Create safe additive migration SQL (STEP 3)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Create migration via `prisma migrate dev --create-only --name add_project_visits` (will NOT auto-apply data-changing steps, and only generates `.sql` under `prisma/migrations/`).
  - Inspect the generated `.sql` and confirm only:
    1. `CREATE TABLE "Visit" (...)` with PK + FK
    2. `ALTER TABLE "Visit" ADD CONSTRAINT ... FOREIGN KEY ... REFERENCES "Project"(id) ON DELETE CASCADE`
    3. `CREATE UNIQUE INDEX ... ON "Visit"(project_id, sequence_number)`
    4. `CREATE INDEX ... ON "Visit"(project_id, date DESC)` (Postgres allows DESC)
    5. One row INSERT into `_prisma_migrations` table (managed by Prisma)
  - Confirm zero DROP / ALTER on ANY pre-existing table name.
  - Confirm no REWRITE of existing rows, no CREATE TYPE of pre-existing enum, no data-copy CTAS referencing existing user tables.
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-16, NFR-1 (§19 data safety)
- **Test Requirements**:
  - `rule` TR-2.1: Migration SQL file contains 0 occurrences of regex `^DROP|ALTER TABLE "(Project|Transaction|Client|Contact|User|Session|Staff|SalaryRecord|ScheduleEvent|Settings)"|TRUNCATE|UPDATE\s+"|DELETE\s+FROM\s+"` (case-insensitive)
  - `rule` TR-2.2: After schema + migration, `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script > /tmp/diff.sql && wc -c < /tmp/diff.sql` == 0 bytes (0 drift)
  - `rule` TR-2.3: Migration filename matches pattern `YYYYMMDDHHMMSS_add_project_visits/migration.sql`
- **Notes**: Do NOT run `prisma migrate dev` in apply mode or `prisma migrate reset` at any point.

## Task 3: Implement 4 API endpoints + validation + lock checks + ownership guardrails (STEP 4)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  - Add `app/api/projects/[id]/visits/route.ts` handling:
    - **GET**: `verifySession()`, load project, visibility check (MANAGER cannot access PRIVATE → 403), query `db.visit.findMany({ where: { projectId }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] })` — return JSON array. 0 visits returns `[]`.
    - **POST**: `verifySession()`, load lock state, `if locked → projectLocked(true)`, zod validate payload `{ date: z.coerce.date(), visitName: z.string().trim().min(1).max(200), description: z.string().trim().max(2000).optional().transform(v => v || null) }` → `db.project.findUnique` confirms project exists → calls safe sequence helper below → `db.visit.create({ data: { projectId, date, visitName, description, sequenceNumber } })` → return 201 created visit.
  - Add `app/api/projects/[id]/visits/[visitId]/route.ts`:
    - **PATCH**: `verifySession()`, load lock, load visit by visitId, `if !visit || visit.projectId !== id → 404`, zod validate same payload as POST but all optional, IGNORE any `sequenceNumber` in client payload, update only `{ date, visitName, description }` → return 200 patched visit.
    - **DELETE**: `verifySession()`, load lock, load visit by visitId, `if !visit || visit.projectId !== id → 404`, `db.visit.delete({ where: { id } })`, return 204 or 200 with JSON `{ ok: true }`.
  - Add zod schema at `lib/validation.ts` as `createVisitSchema` + `updateVisitSchema` (reuse existing patterns, mirror transaction schemas).
- **Acceptance Criteria Addressed**: AC-4, AC-7, AC-8, AC-10, AC-11
- **Test Requirements**:
  - `rule` TR-3.1: Each route file calls `verifySession()` first and returns 401 when null
  - `rule` TR-3.2: POST/PATCH/DELETE each call `loadProjectLockState()` then return 403 with `LOCKED_PROJECT_ERROR` when locked
  - `rule` TR-3.3: PATCH explicitly OMITs `sequenceNumber` from the `data` object passed to prisma update
  - `rule` TR-3.4: PATCH/DELETE each compare `visit.projectId === route.params.id` and return 404 when cross-project
  - `rubric` TR-3.5: API convention fidelity; scale 1-5; anchors 1=custom status codes, no zod; 3=uses zod but custom response format; 5=mirrors `transactions/route.ts` patterns exactly (same imports, same `runtime="nodejs" dynamic="force-dynamic"`, same 401/403/404 JSON shape, same ZodError catch)
  - Pass Threshold >= 4

## Task 4: Implement safe concurrent sequence numbering (STEP 5)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3 (injects into POST handler)
- **Description**:
  - Create helper function in `lib/contacts.ts` sibling: create new `lib/visits.ts` — export `async function getNextVisitSequenceNumber(db: Prisma | Prisma.TransactionClient, projectId: string): Promise<number>` that does `COALESCE(MAX(sequence_number), 0) + 1` via raw prisma `$queryRawUnsafe` with params (or aggregate `_max` via Prisma query).
  - Wrap POST create in `db.$transaction` with retry loop:
    ```
    for attempt in 1..3:
      try:
        seq = getNextVisitSequenceNumber(tx, projectId)
        return tx.visit.create({ ..., sequenceNumber: seq })
      catch(e if PrismaKnownRequest && code P2002 && target includes projectId+sequenceNumber):
        if attempt === 3: rethrow
        continue
    ```
  - When creating, set default `visitName = visitNameFromClient || "Visit ${seq}"` — backend also stamps default if frontend sent empty after number prediction (backend is authoritative).
- **Acceptance Criteria Addressed**: AC-5, AC-6
- **Test Requirements**:
  - `rule` TR-4.1: Code inspection of POST handler shows prisma `$transaction` + `P2002` catch with at least 3 attempts
  - `rule` TR-4.2: In a simulated 5-way concurrent create (Promise.all with stub delays / retry) against an empty project, after completion final set of sequence numbers = {1,2,3,4,5} with 0 duplicates
  - `rule` TR-4.3: After DELETE of the visit with seq=2 in a project with seqs {1,2,3,4}, subsequent new visit CREATE -> seq=5 (confirmed via API response payload + DB select)
  - `rule` TR-4.4: After PATCH renaming visitName of seq=3 to "Kitchen Measurement", next new visit still yields seq=5 (MAX-based calc unaffected by visitName text)

## Task 5: Create use-project-visits hook + query invalidation (STEP 6)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - Create `hooks/use-project-visits.ts` mirroring the patterns in `hooks/use-projects.ts`:
    - `export interface Visit { id, projectId, date, visitName, description, sequenceNumber, createdAt, updatedAt }`
    - `fetchJson<T>()` helper (copy from use-projects if no common helper exists; but actually use existing pattern in each hook file — mirror exactly)
    - `export function useProjectVisits(projectId: string)` → `useQuery<Visit[]>({ queryKey: ["project-visits", projectId], queryFn: () => fetchJson(`/api/projects/${projectId}/visits`), enabled: !!projectId })`
    - `export function useCreateProjectVisit(projectId: string)` → `useMutation` + `onSuccess: () => qc.invalidateQueries({ queryKey: ["project-visits", projectId] })` — do NOT invalidate `["ledger", projectId]`
    - `export function useUpdateProjectVisit(projectId: string)` → `useMutation` + same invalidate + projectVisits key only
    - `export function useDeleteProjectVisit(projectId: string)` → `useMutation` + same invalidate
- **Acceptance Criteria Addressed**: AC-12, AC-13
- **Test Requirements**:
  - `rule` TR-5.1: Hook file defines all 4 exports, each query/mutation uses correct key prefix `["project-visits", projectId]`
  - `rule` TR-5.2: Mutation `onSuccess` invalidates ONLY project-visits key (NOT ledger / NOT overview / NOT financial-overview)
  - `rubric` TR-5.3: Hook pattern fidelity; scale 1-5; anchors 1=custom fetch wrapper, no query keys; 3=react-query but custom error handling; 5=exact same shape as `use-projects.ts`: fetchJson typed, queryKey arrays, enabled guard on id, mutation signature (id first then payload spread for update), `qc.invalidateQueries` only
  - Pass Threshold >= 4

## Task 6: Add Visits header button + expandable panel shell (STEP 7)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 5
- **Description**:
  - In `app/projects/[id]/page.tsx`:
    - Import: `MapPinHouse` (or CalendarDays — a single lucide icon consistent with button style) and 4 new hook exports + existing UI components (ConfirmDialog already imported; Textarea/Label from input.tsx if not already; Button yes; DataTable components yes; EmptyState import as needed).
    - Add new state `const [isVisitsOpen, setIsVisitsOpen] = useState(false)` and `const [isVisitFormOpen, setIsVisitFormOpen] = useState(false)` and `const [editingVisitId, setEditingVisitId] = useState<string | null>(null)` and `const [deleteVisitId, setDeleteVisitId] = useState<string | null>(null)`.
    - Add `Visits` button in PageHeader actions slot right after "Share to Contact" (before Lock/Unlock, before Add Entry): `<Button variant="secondary" onClick={() => setIsVisitsOpen(v => !v)}><MapPinHouse className="size-4 mr-2" />Visits</Button>` — matches existing `variant="secondary"` + icon + `mr-2` className of other buttons. Already-existing PageHeader flex-wrap pattern handles overflow.
    - Insert Visits panel JSX between `<SummaryStrip>` (line ~670-676) and `<SearchBar>` (line ~678-700) (NOT near QuickEntry at page bottom — avoids overlap with fixed-bottom Quick Entry).
    - Visits panel shell mirrors QuickEntry header structure: `<div>` with a header row containing uppercase `<h3 className="font-semibold text-text text-sm uppercase tracking-wider">Visits</h3>` and the same `ChevronUp/ChevronDown` collapse button with same aria-labels; when closed, only header bar shows.
    - Hook data: `const { data: visits = [], isLoading: visitsLoading } = useProjectVisits(id);` + 3 mutation hooks for create/update/delete.
- **Acceptance Criteria Addressed**: AC-9, AC-14
- **Test Requirements**:
  - `rule` TR-6.1: Project Ledger header actions DOM order: Export PDF, Share to Client, Share to Contact, Visits, Lock/Unlock (if Owner), Add Entry. Visits button present.
  - `rule` TR-6.2: Visits panel renders only when `isVisitsOpen === true`; clicking collapse hides it
  - `rule` TR-6.3: Quick Entry form values (date, amount, contact, category, type, description, paymentMode) are unchanged after a click sequence of: type random values → toggle Visits panel open → toggle closed → read form values back
  - `rubric` TR-6.4: UI compactness / layout fidelity; scale 1-5; anchors 1=panel is a full-width card breaking visual flow; 3=correct placement but large vertical gap; 5=same border/shadow/padding/uppercase-label + chevron pattern as QuickEntry, 16-32px vertical margin from SummaryStrip and SearchBar, respects existing px-6 lg:px-10 outer content padding
  - Pass Threshold >= 4

## Task 7: Implement Visits list table + Add / Edit / Delete CRUD (STEP 8)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 6
- **Description**:
  - **List**: Use existing `DataTable/DataTableHeader/DataTableHeaderRow/DataTableHead/DataTableBody/DataTableRow/DataTableCell/DataTableEmpty` components (same as transaction table). Columns: Date (format with `en-IN` locale, `day:2-digit month:short year:numeric`), Visit Name, Description (truncate with line-clamp-2 + title attribute for long text, do NOT expand layout), Actions (DropdownMenu with Edit + Delete menu items, consistent with transaction row actions). Sort newest date first already enforced by endpoint. Empty row shows `<DataTableEmpty colSpan={4}>No visits added yet.</DataTableEmpty>`, with Add Visit button in top-right of panel header when list is empty (and when not, for convenience).
  - **Add form**: Click Add Visit → inline compact form using react-hook-form with Zod (same pattern as project client modal). Fields: Date (type=date Input default today), Visit Name (Input, editable — optional prediction from API when available, but editable), Description (Textarea, min-h-[88px]). Buttons: Cancel (reset and close `isVisitFormOpen`) + Save Visit (submit via mutation, `loading={mutation.isPending}` disabled, prevents duplicate clicks).
  - **Edit**: Click Edit on row → `setEditingVisitId(id)` + populate same Add Visit form with selected row values (useEffect watches editingVisitId and resets form). On Save submit via PATCH mutation with same validation. On success clear editingVisitId, close form, toast success.
  - **Delete**: Click Delete on row → `setDeleteVisitId(id)` → ConfirmDialog (reuse existing component with open/onOpenChange, confirm title "Delete Visit", description: "Are you sure you want to delete this visit? This action cannot be undone.", confirmLabel="Delete Visit", loading=mutation.isPending) → confirm fires delete mutation, on success toast success, invalidate queries.
  - **Sonner toasts** (already imported in page) mirror transaction add/edit/delete messages.
- **Acceptance Criteria Addressed**: AC-5 (UI default visitName reflects sequence), AC-7, AC-11, AC-12
- **Test Requirements**:
  - `rule` TR-7.1: After creating 2 visits, table shows 2 rows; deleting row 2 leaves 1 row; Edit a row with new date + new visitName "Kitchen Measurement" + new description — reloaded table shows persisted values
  - `rule` TR-7.2: During Add Visit, Save Visit button disabled state tied to `mutation.isPending || isSubmitting`; second click on same button mid-submit never triggers second network call (visible in DevTools network as single POST)
  - `rule` TR-7.3: Delete requires ConfirmDialog open; pressing Cancel leaves row intact; pressing Confirm removes it
  - `rule` TR-7.4: Edit form pre-populates correctly from existing visit values (date, visitName, description) without emptying fields

## Task 8: Enforce Locked-Project + role permissions everywhere (STEP 9)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 7
- **Description**:
  - Frontend (derived from already-existing `isLocked` + `isOwner` states):
    - When `isLocked === true`:
      - Visits panel header row shows inline warning pill consistent with the existing project-is-locked banner (optional — at minimum the buttons are disabled):
        - Add Visit button `disabled={isLocked}`
        - Each row: Edit dropdown item `disabled={isLocked}`, Delete dropdown item `disabled={isLocked}`
      - Existing server enforcement already added in Task 3.
  - No button should assume `disabled={true}` is sufficient — Task 3 server enforcement is the actual guard.
  - Visibility already enforced server side for PRIVATE projects on MANAGER role (Task 3 GET endpoint). Frontend does not need extra visibility UI since a 403 would display when they open a PRIVATE project link (existing).
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `rule` TR-8.1: When `isLocked === true` Add Visit button has disabled attribute (can see via DOM)
  - `rule` TR-8.2: When `isLocked === true` direct POST/PATCH/DELETE via curl/REST all return 403 (server-side enforcement)
  - `rule` TR-8.3: When `isLocked === false` and role=MANAGER on SHARED project, Add/Edit/Delete succeed (return 2xx)
  - `rule` TR-8.4: When role=MANAGER and Project.visibility=PRIVATE GET visits returns 403

## Task 9: Final validation — TypeScript, build, schema, financial/PDF isolation (STEP 10)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 8, Task 2 (for schema + migration checks)
- **Description**:
  - Run and capture exit codes for:
    1. `npx tsc --noEmit`
    2. `npm run build` (runs `prisma generate && next build`)
    3. IDE GetDiagnostics — must be empty array
    4. `npx prisma validate` — 0 errors
    5. Migration SQL additivity check (run grep from TR-2.1 and confirm result count 0)
    6. Manual code review to confirm 0 changes to:
       - `lib/ledger.ts`
       - `lib/financial-overview.ts`
       - `lib/client-ledger.ts`
       - `components/ledger-pdf.tsx`
       - `hooks/use-ledger.ts`
       - All existing files inside `app/api/projects/[id]/transactions/**`
       - All existing PDF share functions and the `exportPDF / shareClientPDF / shareContactPDF` closures in page.tsx — function bodies should not reference visits
    7. Cross-project isolation proof: open two projects, add 2 visits to each, list each, confirm 0 cross-leak
    8. Locked-project API-reject unit script (curl-style node fetch against the 3 mutations)
- **Acceptance Criteria Addressed**: AC-15, AC-16, AC-3, AC-13
- **Test Requirements**:
  - `rule` TR-9.1: tsc, build, prisma validate each exit(0). GetDiagnostics empty
  - `rule` TR-9.2: Migration SQL additivity grep returns 0 matches for destructive patterns
  - `rule` TR-9.3: File-modification list (git status before any optional commit) confirms the 6 named critical source files are UNCHANGED (or not present in `git diff --name-only`)
  - `rule` TR-9.4: Cross-project list comparison shows Project A's visits endpoint returns only A visits; B returns only B; POST to B does not appear in A
  - `rule` TR-9.5: Locked project POST/PATCH/DELETE return HTTP 403
  - `rubric` TR-9.6: Data-safety audit trail completeness; scale 1-5; anchors 1=some steps skipped silently; 3=all commands run but evidence only in prose; 5=each validation check includes reproducible terminal command + captured stdout evidence in task Completion Evidence section
  - Pass Threshold >= 4

## Post-Implementation: Final Report (per §22)
After all tasks complete, assemble the final report for the user response covering:
1. Files created and modified.
2. Prisma Visit model + relation.
3. Migration file created + path.
4. Additive-only confirmation.
5. Data safety confirmation (0 reset / 0 existing table modify).
6. API endpoints implemented.
7. Automatic numbering explanation (MAX-based, P2002 retry up to 3x).
8. Project isolation: FK + route checks.
9. Lock enforcement + role + visibility.
10. Financial calculations and PDFs unchanged — list of untouched files.
11. TS/build results with exit codes.
12. Remaining migration/deploy step: instruct how to apply `prisma migrate deploy` in target environment (NOT run by us per safety rules).
