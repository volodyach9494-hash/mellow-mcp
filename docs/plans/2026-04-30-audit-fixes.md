# Mellow MCP — Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 29 issues found in the 2026-04-30 method audit, restore agent usability of all wrapper-level bugs, and document remaining backend-side gaps.

**Architecture:** Three batches delivered as separate PRs so the auditor can re-test after each: (1) MCP schema + helper, (2) param translation + endpoint paths, (3) docs + descriptions. Each batch is self-contained — type-check + dry-run gates between. Backend-coordination items (5xx, 403/400 ambiguity, missing `/api/webhooks`, missing `deleteTask`) are flagged and tracked in `docs/BACKEND_TICKETS.md` but not fixed in this plan.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, Cloudflare Workers, Wrangler, Zod, Hono.

---

## Source

Audit report: `/Users/vladimir/mellow-mcp-audit-2026-04-30.md` (51 methods called, 22 ✅, 11 ⚠️ wrapper-level -32602, 18 ❌ real bugs).

## File Structure

| File | Responsibility | Touched in batch |
|------|----------------|------------------|
| `src/mellow-client.ts` | Add `asStructuredObject` helper for non-array endpoints | Batch 1 |
| `src/tools/tasks.ts` | Replace lying-cast on 13 endpoints; add 422-error path for `addTaskMessage`; document `getTaskMessages` 500 risk | Batch 1, Batch 2 |
| `src/tools/freelancers.ts` | Replace lying-cast on 7 endpoints; verify `removeFreelancer` HTTP method | Batch 1, Batch 2 |
| `src/tools/companies.ts` | Replace lying-cast on `switchCompany` and `getCompanyBalance` | Batch 1 |
| `src/tools/task-groups.ts` | Replace lying-cast on 3 mutating endpoints | Batch 1 |
| `src/tools/webhooks.ts` | Replace lying-cast on 3 endpoints; document 404 and remove broken POST/DELETE paths or document them as backend-pending | Batch 1, Batch 2 |
| `src/tools/documents.ts` | Replace lying-cast on `downloadDocument`; fix path or document 404 | Batch 1, Batch 2 |
| `src/tools/profile.ts` | Replace lying-cast on `getUserProfile` | Batch 1 |
| `src/tools/scout/positions.ts` | Replace lying-cast on 5 endpoints; fix `share_target` snake_case; document `scout_updatePosition` 500 | Batch 1, Batch 2 |
| `src/tools/scout/applications.ts` | Replace lying-cast on 3 mutating endpoints | Batch 1 |
| `src/tools/scout/pool.ts` | Replace lying-cast on 5 endpoints | Batch 1 |
| `src/tools/scout/lookup.ts` | Fix `reference_id` / `reference_type` snake_case | Batch 2 |
| `src/tools/scout/ai-tasks.ts` | Replace lying-cast on 2 endpoints | Batch 1 |
| `src/tools/scout/promo-posts.ts` | Replace lying-cast on 2 endpoints | Batch 1 |
| `src/tools/scout/attachments.ts` | Replace lying-cast on 1 endpoint | Batch 1 |
| `src/tools/scout/companies.ts` | (already uses helper for list) — no change | — |
| `docs/BACKEND_TICKETS.md` | Track backend-side issues for follow-up | Batch 3 |
| `docs/DOMAIN.md` | Update insufficient-funds error code documentation | Batch 3 |

---

## Batch overview

**Batch 1 — `-32602` schema fixes (P0).** Add `asStructuredObject(result)` helper that wraps non-object results, then replace every `result as { [key: string]: unknown }` lying-cast in tool returns. 11 audit-confirmed broken methods will start working; the remainder become future-proof against backend shape changes. **No behaviour change for endpoints that already return objects** — pass-through.

**Batch 2 — Endpoint paths and param translation (P0/P1).** Fix `scout_getShortLink` and `scout_sharePosition` snake_case params (E1, E2). Update tool descriptions for the 5 broken endpoints (D1/D2 webhooks, D4 download, D5 removeFreelancer, D6 scout_updatePosition, D7 getTaskMessages) to either route to a working path if discoverable, or fail-fast with a clear message and a `BACKEND_TICKETS.md` reference. Resolve `uuid → taskId` in the wrapper for 6 task-action methods so the documented "pass uuid OR taskId" contract holds (B1–B6).

**Batch 3 — Documentation alignment (P2).** Drop the false `createType="draft"` enum value from `createTask` (F1). Make `getAllowedCurrencies` `companyId` honestly required, OR write `Props.activeCompanyId` from the OAuth callback so the X-Company-Id fallback actually works (F2). Update `docs/DOMAIN.md` insufficient-funds error code section (F3, F4). Document `short_link: null` async behaviour for `scout_createPosition` (F5). Add backend tickets for D1/D2/D4/D5/D6/D7, the C-class 403-vs-400 ambiguity, and G1 missing `deleteTask`.

---

## Task ordering and dependencies

- Batch 1 must merge before Batch 2 retest, because Batch 2 changes leave their `structuredContent` returns going through the new helper.
- Batch 3 has no code dependencies and can ship in parallel with Batch 2 if reviewer prefers.
- Each task within a batch is independently committable. Verification gate (`npm run type-check`) runs after every task.

---

## Batch 1 — `-32602` schema fixes

### Task 1: Add `asStructuredObject` helper

**Files:**
- Modify: `src/mellow-client.ts` (add export next to existing `asStructuredList`)

- [ ] **Step 1: Read the existing helper to match its style**

```bash
grep -n "asStructuredList" src/mellow-client.ts
```

Expected: line 11, function exported.

- [ ] **Step 2: Add the new helper after `asStructuredList`**

Edit `src/mellow-client.ts`. After the closing `}` of `asStructuredList` (around line 16), add:

```typescript
/**
 * Normalize a Mellow API response into an MCP `structuredContent` object
 * for non-list endpoints. MCP `structuredContent` must be an object — but
 * Mellow mutating endpoints sometimes return a plain string ("ok"), an
 * empty array (`[]`), or `null` (no body). We wrap these into a stable
 * `{ ok: true, raw: <value> }` envelope so the MCP client schema validator
 * accepts them. Existing object shapes pass through unchanged.
 */
export function asStructuredObject(result: unknown): { [key: string]: unknown } {
  if (typeof result === "object" && result !== null && !Array.isArray(result)) {
    return result as { [key: string]: unknown };
  }
  return { ok: true, raw: result };
}
```

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: PASS, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/mellow-client.ts
git commit -m "feat(mellow-client): add asStructuredObject helper for non-list responses"
```

---

### Task 2: Replace lying-casts in `src/tools/profile.ts`

**Files:**
- Modify: `src/tools/profile.ts` (1 occurrence at line 13)

- [ ] **Step 1: Update the import**

In `src/tools/profile.ts`, change line 2:

From:
```typescript
import type { MellowClient } from "../mellow-client";
```

To:
```typescript
import { asStructuredObject, type MellowClient } from "../mellow-client";
```

- [ ] **Step 2: Replace the lying-cast**

In `src/tools/profile.ts`, change line 13:

From:
```typescript
        structuredContent: result as { [key: string]: unknown },
```

To:
```typescript
        structuredContent: asStructuredObject(result),
```

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/profile.ts
git commit -m "fix(tools/profile): use asStructuredObject for getUserProfile"
```

---

### Task 3: Replace lying-casts in `src/tools/companies.ts`

**Files:**
- Modify: `src/tools/companies.ts` (lines 30, 44 — `switchCompany`, `getCompanyBalance`)

The audit confirms `switchCompany` returns an array (A7); `getCompanyBalance` worked OK in the audit but is the same lying-cast pattern, so we fix it preventively.

- [ ] **Step 1: Update import**

Change line 3:

From:
```typescript
import { asStructuredList, type MellowClient } from "../mellow-client";
```

To:
```typescript
import { asStructuredList, asStructuredObject, type MellowClient } from "../mellow-client";
```

- [ ] **Step 2: Replace both lying-casts**

In `src/tools/companies.ts`, replace **all** occurrences of `result as { [key: string]: unknown }` with `asStructuredObject(result)`. There are 2 occurrences on lines 30 and 44.

Run after editing:
```bash
grep -n "result as { \[key: string\]: unknown }" src/tools/companies.ts
```
Expected output: empty.

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/companies.ts
git commit -m "fix(tools/companies): use asStructuredObject for switchCompany and getCompanyBalance"
```

---

### Task 4: Replace lying-casts in `src/tools/task-groups.ts`

**Files:**
- Modify: `src/tools/task-groups.ts` (lines 24, 41, 57 — `createTaskGroup`, `renameTaskGroup`, `deleteTaskGroup`)

Audit-confirmed broken: A4 (createTaskGroup), A5 (renameTaskGroup), A6 (deleteTaskGroup). All three return arrays; backend mutations succeed.

- [ ] **Step 1: Update import**

Change line 3 to add `asStructuredObject`:

```typescript
import { asStructuredList, asStructuredObject, type MellowClient } from "../mellow-client";
```

- [ ] **Step 2: Replace all 3 lying-casts**

Replace every `result as { [key: string]: unknown }` with `asStructuredObject(result)`.

Verify:
```bash
grep -c "result as { \[key: string\]: unknown }" src/tools/task-groups.ts
grep -c "asStructuredObject" src/tools/task-groups.ts
```
Expected: 0, 3.

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/task-groups.ts
git commit -m "fix(tools/task-groups): use asStructuredObject for create/rename/delete (A4-A6)"
```

---

### Task 5: Replace lying-casts in `src/tools/freelancers.ts`

**Files:**
- Modify: `src/tools/freelancers.ts` (lines 88, 132, 148, 164, 185, 217, 233, 249 — 7 endpoints)

Audit-confirmed broken: A2 (`editFreelancer`), A3 (`editFreelancerProfile`).

The other 5 (`getFreelancer`, `inviteFreelancer`, `findFreelancerByEmail`, `findFreelancerByPhone`, `removeFreelancer`, `getFreelancerTaxInfo`) returned OK in the audit because backend gave object responses, but we apply the helper consistently to prevent the same -32602 footgun on future shape changes.

- [ ] **Step 1: Update import**

Change line 3:

```typescript
import { asStructuredList, asStructuredObject, type MellowClient } from "../mellow-client";
```

- [ ] **Step 2: Replace all lying-casts**

Use grep to confirm count, then replace **all** occurrences:

```bash
grep -c "result as { \[key: string\]: unknown }" src/tools/freelancers.ts
```
Expected: 7 before, 0 after.

Replace `result as { [key: string]: unknown }` with `asStructuredObject(result)` in all 7 occurrences (do NOT touch the existing `asStructuredList` line for `listFreelancers`).

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/freelancers.ts
git commit -m "fix(tools/freelancers): use asStructuredObject for 7 endpoints (A2, A3)"
```

---

### Task 6: Replace lying-casts in `src/tools/tasks.ts`

**Files:**
- Modify: `src/tools/tasks.ts` (12 occurrences across `getTask`, `createTask`, `publishDraftTask`, `changeTaskStatus`, `changeDeadline`, `checkTaskRequirements`, `acceptTask`, `payForTask`, `declineTask`, `resumeTask`, `addTaskMessage`, `addTaskFiles`)

Audit-confirmed broken: A1 (checkTaskRequirements), A8 (addTaskMessage with numeric taskId).

- [ ] **Step 1: Update import**

Change line 3:

```typescript
import { asStructuredList, asStructuredObject, type MellowClient } from "../mellow-client";
```

- [ ] **Step 2: Replace all lying-casts**

```bash
grep -c "result as { \[key: string\]: unknown }" src/tools/tasks.ts
```
Expected: 12 before. After editing: 0.

Replace `result as { [key: string]: unknown }` with `asStructuredObject(result)` in all 12 occurrences. Do NOT touch the existing `asStructuredList` lines (`listTasks` line 84, `getAllowedCurrencies` line 210, `getTaskMessages` line 362).

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/tasks.ts
git commit -m "fix(tools/tasks): use asStructuredObject for 12 endpoints (A1, A8)"
```

---

### Task 7: Replace lying-casts in `src/tools/webhooks.ts`

**Files:**
- Modify: `src/tools/webhooks.ts` (lines 9, 25, 41 — all 3 endpoints)

- [ ] **Step 1: Update import**

Change line 3:

From:
```typescript
import type { MellowClient } from "../mellow-client";
```

To:
```typescript
import { asStructuredObject, type MellowClient } from "../mellow-client";
```

- [ ] **Step 2: Replace all 3 lying-casts**

Replace `result as { [key: string]: unknown }` with `asStructuredObject(result)`.

Verify:
```bash
grep -c "asStructuredObject" src/tools/webhooks.ts
```
Expected: 3.

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/webhooks.ts
git commit -m "fix(tools/webhooks): use asStructuredObject for all 3 endpoints"
```

---

### Task 8: Replace lying-cast in `src/tools/documents.ts`

**Files:**
- Modify: `src/tools/documents.ts` (line 42 — `downloadDocument`)

- [ ] **Step 1: Update import**

Change line 3:

From:
```typescript
import { asStructuredList, type MellowClient } from "../mellow-client";
```

To:
```typescript
import { asStructuredList, asStructuredObject, type MellowClient } from "../mellow-client";
```

- [ ] **Step 2: Replace the lying-cast**

In `src/tools/documents.ts` line 42, change:

From:
```typescript
        structuredContent: result as { [key: string]: unknown },
```

To:
```typescript
        structuredContent: asStructuredObject(result),
```

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/documents.ts
git commit -m "fix(tools/documents): use asStructuredObject for downloadDocument"
```

---

### Task 9: Replace lying-casts in `src/tools/scout/positions.ts`

**Files:**
- Modify: `src/tools/scout/positions.ts` (lines 150, 166, 182, 199 plus `scout_getPosition` and `scout_createPosition` direct casts)

Audit-confirmed broken: A9 (scout_closePosition returns string), A10 (scout_openPosition returns string).

- [ ] **Step 1: Update import**

Change line 3:

From:
```typescript
import { asStructuredList, type MellowClient } from "../../mellow-client";
```

To:
```typescript
import { asStructuredList, asStructuredObject, type MellowClient } from "../../mellow-client";
```

- [ ] **Step 2: Replace lying-casts**

```bash
grep -c "result as { \[key: string\]: unknown }" src/tools/scout/positions.ts
```
Note the number, then replace **all** occurrences with `asStructuredObject(result)`.

After:
```bash
grep -c "result as { \[key: string\]: unknown }" src/tools/scout/positions.ts
```
Expected: 0.

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/scout/positions.ts
git commit -m "fix(tools/scout/positions): use asStructuredObject (A9, A10 fix)"
```

---

### Task 10: Replace lying-casts in `src/tools/scout/applications.ts`

**Files:**
- Modify: `src/tools/scout/applications.ts` (lines 66, 85, 101 — `scout_getApplication`, `scout_changeApplicationStatus`, `scout_inviteApplicant`)

- [ ] **Step 1: Update import**

Change line 3:

```typescript
import { asStructuredList, asStructuredObject, type MellowClient } from "../../mellow-client";
```

- [ ] **Step 2: Replace 3 lying-casts**

Replace all 3 occurrences of `result as { [key: string]: unknown }` with `asStructuredObject(result)`.

Verify:
```bash
grep -c "result as { \[key: string\]: unknown }" src/tools/scout/applications.ts
```
Expected: 0.

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/scout/applications.ts
git commit -m "fix(tools/scout/applications): use asStructuredObject for 3 endpoints"
```

---

### Task 11: Replace lying-casts in `src/tools/scout/pool.ts`

**Files:**
- Modify: `src/tools/scout/pool.ts` (lines 14, 57, 82, 108, 125, 142 — 6 endpoints)

Audit-confirmed broken: A11 (`scout_editPoolFreelancer`), A12 (`scout_deletePoolFreelancer`).

- [ ] **Step 1: Update import**

Change line 3:

```typescript
import { asStructuredList, asStructuredObject, type MellowClient } from "../../mellow-client";
```

- [ ] **Step 2: Replace 6 lying-casts**

Replace all 6 occurrences with `asStructuredObject(result)`.

Verify:
```bash
grep -c "result as { \[key: string\]: unknown }" src/tools/scout/pool.ts
```
Expected: 0.

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/scout/pool.ts
git commit -m "fix(tools/scout/pool): use asStructuredObject for 6 endpoints (A11, A12)"
```

---

### Task 12: Replace lying-casts in remaining Scout files

**Files:**
- Modify: `src/tools/scout/ai-tasks.ts` (lines 16, 32 — both endpoints)
- Modify: `src/tools/scout/promo-posts.ts` (lines 16, 32 — both endpoints)
- Modify: `src/tools/scout/attachments.ts` (line 16 — single endpoint)
- Modify: `src/tools/scout/lookup.ts` (line 34 — `scout_getShortLink`)

- [ ] **Step 1: Update imports in all 4 files**

For each file, edit line 3 to add `asStructuredObject` import:

**`src/tools/scout/ai-tasks.ts`:**

From:
```typescript
import type { MellowClient } from "../../mellow-client";
```

To:
```typescript
import { asStructuredObject, type MellowClient } from "../../mellow-client";
```

**`src/tools/scout/promo-posts.ts`:** same pattern as above.

**`src/tools/scout/attachments.ts`:** same pattern as above.

**`src/tools/scout/lookup.ts`** (already imports `asStructuredList`):

From:
```typescript
import { asStructuredList, type MellowClient } from "../../mellow-client";
```

To:
```typescript
import { asStructuredList, asStructuredObject, type MellowClient } from "../../mellow-client";
```

- [ ] **Step 2: Replace lying-casts in all 4 files**

```bash
grep -c "result as { \[key: string\]: unknown }" src/tools/scout/ai-tasks.ts src/tools/scout/promo-posts.ts src/tools/scout/attachments.ts src/tools/scout/lookup.ts
```

Expected (current): 2, 2, 1, 1 = 6 total. Replace each with `asStructuredObject(result)`.

After:
```bash
grep -c "result as { \[key: string\]: unknown }" src/tools/scout/ai-tasks.ts src/tools/scout/promo-posts.ts src/tools/scout/attachments.ts src/tools/scout/lookup.ts
```
Expected: 0, 0, 0, 0.

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/scout/ai-tasks.ts src/tools/scout/promo-posts.ts src/tools/scout/attachments.ts src/tools/scout/lookup.ts
git commit -m "fix(tools/scout): use asStructuredObject for ai-tasks, promo-posts, attachments, lookup"
```

---

### Task 13: Final Batch 1 verification

- [ ] **Step 1: Confirm zero residual lying-casts**

```bash
grep -rn "result as { \[key: string\]: unknown }" src/tools/
```

Expected: empty output. If any line is printed, go back to its file and fix it.

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: PASS, no errors.

- [ ] **Step 3: Build dry-run**

Run: `npx wrangler deploy --dry-run --outdir=/tmp/mcp-build-check`
Expected: completes without errors. Total Upload should be in the ~2.79 MB range.

- [ ] **Step 4: Tool count sanity check**

Run: `grep -h "server\.tool" src/tools/*.ts src/tools/scout/*.ts | wc -l`
Expected: 77.

- [ ] **Step 5: Push branch and open PR**

```bash
git switch -c vova_audit_batch1_schema
git push -u origin vova_audit_batch1_schema
gh pr create --repo kroshilin/mellow-mcp --base master --head volodyach9494-hash:vova_audit_batch1_schema \
  --title "fix(tools): MCP -32602 schema fixes (audit batch 1)" \
  --body "$(cat <<'EOF'
## Summary

Closes 11 audit-confirmed `-32602: expected record, received array/string` failures (audit categories A1–A12, all 12 entries).

Adds `asStructuredObject(result)` helper next to existing `asStructuredList`. Replaces every `result as { [key: string]: unknown }` lying-cast across 13 tool modules — 41 occurrences total. Pass-through for object responses; non-object responses get wrapped as `{ ok: true, raw: <value> }`.

## Audit cross-reference

| Audit ID | Method | Symptom |
|---|---|---|
| A1 | `checkTaskRequirements` | array → -32602 |
| A2 | `editFreelancer` | array → -32602 (mutation succeeded on backend) |
| A3 | `editFreelancerProfile` | array → -32602 |
| A4 | `createTaskGroup` | array → -32602 (group 15065 created on backend) |
| A5 | `renameTaskGroup` | array → -32602 (rename applied) |
| A6 | `deleteTaskGroup` | array → -32602 (group removed) |
| A7 | `switchCompany` | array → -32602 |
| A8 | `addTaskMessage` (numeric) | array → -32602 |
| A9 | `scout_closePosition` | string → -32602 (status flipped to closed) |
| A10 | `scout_openPosition` | string → -32602 (status flipped to active) |
| A11 | `scout_editPoolFreelancer` | array → -32602 (fields updated) |
| A12 | `scout_deletePoolFreelancer` | array → -32602 (removed from pool) |

## Test plan

- [x] `npm run type-check` clean
- [x] `npx wrangler deploy --dry-run` clean
- [x] `grep -rn "result as { \[key: string\]: unknown }" src/tools/` empty
- [x] Tool count = 77 unchanged
- [ ] Re-run audit subset (A1–A12) post-deploy: expect all to return structured content instead of -32602
EOF
)"
```

---

## Batch 2 — Endpoint paths and param translation

### Task 14: Fix Scout snake_case params (E1, E2)

**Files:**
- Modify: `src/tools/scout/lookup.ts:28-32` (`scout_getShortLink`)
- Modify: `src/tools/scout/positions.ts:196-201` (`scout_sharePosition`)

- [ ] **Step 1: Discover all Scout body/query params and check for camelCase**

Run:

```bash
grep -nE "client\.(get|post|put|patch|del)<.*>\(" src/tools/scout/*.ts
```

Visually inspect each call. Look for any object literal that uses camelCase keys passed as a body or query parameter (URL-path params with `${var}` interpolation are fine — they're not key/value).

Confirmed offenders from the audit:
- `scout_getShortLink` sends `referenceType` / `referenceId` — server expects `reference_type` / `reference_id`
- `scout_sharePosition` sends `shareTarget` — server expects `share_target`

Other Scout calls that worked in the audit (`scout_listPositions` with `sortField`/`sortDirection`, `scout_getPosition` with `trackView`, `scout_listApplications`, `scout_listPositionApplications`, `scout_getApplication` with `trackStatus`, `scout_changeApplicationStatus`, `scout_createPosition`, `scout_updatePosition`, `scout_listPoolFreelancers`, `scout_createPoolFreelancer`, `scout_editPoolFreelancer`) keep their existing camelCase — do not change.

- [ ] **Step 2: Fix `scout_getShortLink`**

In `src/tools/scout/lookup.ts`, replace lines 28-32:

From:
```typescript
    async ({ referenceType, referenceId }) => {
      const result = await client.get<unknown>("/short-link/", {
        referenceType,
        referenceId,
      });
```

To:
```typescript
    async ({ referenceType, referenceId }) => {
      const result = await client.get<unknown>("/short-link/", {
        reference_type: referenceType,
        reference_id: referenceId,
      });
```

- [ ] **Step 3: Fix `scout_sharePosition`**

In `src/tools/scout/positions.ts`, find the `scout_sharePosition` handler (around line 196). Replace:

From:
```typescript
    async ({ positionId, shareTarget }) => {
      const result = await client.post<unknown>(`/positions/${positionId}/share`, { shareTarget });
```

To:
```typescript
    async ({ positionId, shareTarget }) => {
      const result = await client.post<unknown>(`/positions/${positionId}/share`, { share_target: shareTarget });
```

- [ ] **Step 4: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/scout/lookup.ts src/tools/scout/positions.ts
git commit -m "fix(tools/scout): translate camelCase params to snake_case for short-link and share (E1, E2)"
```

---

### Task 15: Resolve uuid → taskId for task-action endpoints (B1–B6)

**Files:**
- Modify: `src/tools/tasks.ts` (`changeTaskStatus`, `changeDeadline`, `acceptTask`, `payForTask`, `declineTask`, `resumeTask`, `addTaskMessage`)

The audit shows the backend rejects `uuid` payloads with 422 `{"taskId":"This value should not be blank."}` even when the tool docs claim `taskId OR uuid`. The fix is wrapper-side: if `uuid` is provided and `taskId` is not, look up the numeric ID via the existing list endpoint.

**Note:** there is no `getTaskByUuid` shortcut. The simplest reliable resolution is `client.get(`/customer/tasks/${uuid}`)` (which works for both numeric IDs and UUIDs per `getTask` tool — confirmed by audit row 20). We extract `id` from the response.

- [ ] **Step 1: Add a helper at the top of `src/tools/tasks.ts` (after imports)**

Insert after the import lines (after line 3):

```typescript
async function resolveTaskId(client: MellowClient, params: { taskId?: number; uuid?: string }): Promise<number> {
  if (params.taskId !== undefined) return params.taskId;
  if (!params.uuid) {
    throw new Error("Either taskId or uuid must be provided");
  }
  const task = await client.get<{ id: number }>(`/customer/tasks/${params.uuid}`);
  if (typeof task?.id !== "number") {
    throw new Error(`Could not resolve UUID ${params.uuid} to a numeric task ID`);
  }
  return task.id;
}
```

- [ ] **Step 2: Update each task-action handler to resolve `taskId` first**

For each of the following handlers, replace the body so it resolves `taskId` and passes only the resolved numeric ID to the backend.

**`changeTaskStatus`** (line 228-234) — currently puts to `/customer/tasks/${taskId}` where `taskId` is the user-supplied string (could be uuid or numeric). Replace:

From:
```typescript
    async ({ taskId, state }) => {
      const result = await client.put<unknown>(`/customer/tasks/${taskId}`, { state });
      return {
        structuredContent: asStructuredObject(result),
        content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }],
      };
    },
```

To:
```typescript
    async ({ taskId, state }) => {
      const numeric = /^\d+$/.test(taskId) ? Number(taskId) : await resolveTaskId(client, { uuid: taskId });
      const result = await client.put<unknown>(`/customer/tasks/${numeric}`, { state });
      return {
        structuredContent: asStructuredObject(result),
        content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }],
      };
    },
```

**`changeDeadline`** (line 246-252) — body has `taskId | uuid`. Replace:

From:
```typescript
    async (params) => {
      const result = await client.post<unknown>("/customer/tasks/prolong-deadline", params);
```

To:
```typescript
    async (params) => {
      const taskId = await resolveTaskId(client, params);
      const result = await client.post<unknown>("/customer/tasks/prolong-deadline", { taskId, deadline: params.deadline });
```

**`acceptTask`** (line 280-286). Replace:

From:
```typescript
    async (params) => {
      const result = await client.post<unknown>("/customer/tasks/accept", params);
```

To:
```typescript
    async (params) => {
      const taskId = await resolveTaskId(client, params);
      const result = await client.post<unknown>("/customer/tasks/accept", { taskId });
```

**`payForTask`** (line 297-303). Replace:

From:
```typescript
    async (params) => {
      const result = await client.post<unknown>("/customer/tasks/pay", params);
```

To:
```typescript
    async (params) => {
      const taskId = await resolveTaskId(client, params);
      const result = await client.post<unknown>("/customer/tasks/pay", { taskId });
```

**`declineTask`** (line 314-320). Replace:

From:
```typescript
    async (params) => {
      const result = await client.post<unknown>("/customer/tasks/decline", params);
```

To:
```typescript
    async (params) => {
      const taskId = await resolveTaskId(client, params);
      const result = await client.post<unknown>("/customer/tasks/decline", { taskId });
```

**`resumeTask`** (line 331-337). Replace:

From:
```typescript
    async (params) => {
      const result = await client.post<unknown>("/customer/tasks/return-to-work", params);
```

To:
```typescript
    async (params) => {
      const taskId = await resolveTaskId(client, params);
      const result = await client.post<unknown>("/customer/tasks/return-to-work", { taskId });
```

**`addTaskMessage`** (line 377-385). Replace:

From:
```typescript
    async (params) => {
      // Endpoint is /api/tasks/messages (NOT /api/customer/tasks/messages — that path
      // is method-mismatched with PUT /api/customer/tasks/{taskIdentifier} and produces 500).
      const result = await client.post<unknown>("/tasks/messages", params);
```

To:
```typescript
    async (params) => {
      const taskId = await resolveTaskId(client, params);
      // Endpoint is /api/tasks/messages (NOT /api/customer/tasks/messages — that path
      // is method-mismatched with PUT /api/customer/tasks/{taskIdentifier} and produces 500).
      const result = await client.post<unknown>("/tasks/messages", { taskId, message: params.message });
```

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/tasks.ts
git commit -m "fix(tools/tasks): resolve uuid to taskId before backend call (B1-B6)"
```

---

### Task 16: Document broken endpoints in tool descriptions

These methods can't be fixed by the wrapper — the backend route or method is wrong. Until backend ticket lands, the tool descriptions should fail-fast and direct the agent away from them.

**Files:**
- Modify: `src/tools/webhooks.ts` (`createOrUpdateWebhook`, `deleteWebhook`, `getWebhook` — D1, D2, D3)
- Modify: `src/tools/documents.ts` (`downloadDocument` — D4)
- Modify: `src/tools/freelancers.ts` (`removeFreelancer` — D5)
- Modify: `src/tools/scout/positions.ts` (`scout_updatePosition` — D6)
- Modify: `src/tools/tasks.ts` (`getTaskMessages` — D7)

- [ ] **Step 1: Add backend-pending warning to `createOrUpdateWebhook`**

In `src/tools/webhooks.ts`, replace the description string for `createOrUpdateWebhook`:

From:
```typescript
    "Create or update a webhook configuration. Only one webhook per company; receiver MUST be idempotent (up to 6 retries within ~30 minutes).",
```

To:
```typescript
    "Create or update a webhook configuration. Only one webhook per company; receiver MUST be idempotent (up to 6 retries within ~30 minutes). BACKEND ISSUE (2026-04-30): POST /api/webhooks returns 404 — endpoint not implemented. Tool returns the underlying error; do not expect success until backend ticket lands.",
```

- [ ] **Step 2: Add backend-pending warning to `deleteWebhook`**

For `deleteWebhook`:

From:
```typescript
    "Delete a webhook.",
```

To:
```typescript
    "Delete a webhook. BACKEND ISSUE (2026-04-30): DELETE /api/webhooks/{id} returns 404 — endpoint not implemented.",
```

- [ ] **Step 3: Add backend-pending warning to `downloadDocument`**

In `src/tools/documents.ts`, replace the description for `downloadDocument`:

From:
```typescript
    "Download a specific document by ID.",
```

To:
```typescript
    "Download a specific document by ID. BACKEND ISSUE (2026-04-30): GET /api/customer/documents/{id}/download returns 404 — endpoint missing. Until fixed, surface the document's metadata via listDocuments and ask the user to download via the Mellow web UI.",
```

- [ ] **Step 4: Add backend-pending warning to `removeFreelancer`**

In `src/tools/freelancers.ts`, prepend a warning to the existing description:

From:
```typescript
    "Soft-delete the freelancer's membership in the active company. Backend BLOCKS the delete with HTTP 422 'Worker have not finished tasks' if any task is in a non-terminal state in this company — so no task-zombies. The DELETE is async — HTTP 200 returns before the status flip is fully reflected. Re-invite reactivates the same membership record (per-company note + specialization survive). Idempotent on already-excluded freelancers.",
```

To:
```typescript
    "Soft-delete the freelancer's membership in the active company. BACKEND ISSUE (2026-04-30): DELETE /api/customer/freelancers/{id} returns 405 Method Not Allowed — possibly wrong HTTP verb or path. Backend BLOCKS the delete with HTTP 422 'Worker have not finished tasks' if any task is in a non-terminal state in this company — so no task-zombies. The DELETE is async — HTTP 200 returns before the status flip is fully reflected. Re-invite reactivates the same membership record (per-company note + specialization survive). Idempotent on already-excluded freelancers.",
```

- [ ] **Step 5: Add backend-pending warning to `scout_updatePosition`**

In `src/tools/scout/positions.ts`, find the description string of `scout_updatePosition` (around line 92, the second `server.tool(` call). Replace:

From:
```typescript
    "Update an existing position",
```

To:
```typescript
    "Update an existing position. BACKEND ISSUE (2026-04-30): PUT /positions/{uuid} returns 500 Internal Server Error even with valid payload. Until fixed, prefer scout_closePosition + scout_createPosition as a workaround for breaking-change updates.",
```

- [ ] **Step 6: Add backend-pending warning to `getTaskMessages`**

In `src/tools/tasks.ts`, replace the description for `getTaskMessages`:

From:
```typescript
    "Get all messages for a task. Pass either taskId (numeric) or uuid.",
```

To:
```typescript
    "Get all messages for a task. Pass either taskId (numeric) or uuid. BACKEND ISSUE (2026-04-30): returns 500 Internal Server Error on tasks in DRAFT (state 17) — the messages collection is not initialised until the task is published. Call only after publishDraftTask.",
```

- [ ] **Step 7: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/tools/webhooks.ts src/tools/documents.ts src/tools/freelancers.ts src/tools/scout/positions.ts src/tools/tasks.ts
git commit -m "docs(tools): document backend-pending issues (D1-D7) in tool descriptions"
```

---

### Task 17: Final Batch 2 verification and PR

- [ ] **Step 1: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 2: Build dry-run**

Run: `npx wrangler deploy --dry-run --outdir=/tmp/mcp-build-check`
Expected: success.

- [ ] **Step 3: Push branch and open PR**

```bash
git switch -c vova_audit_batch2_params_paths
git push -u origin vova_audit_batch2_params_paths
gh pr create --repo kroshilin/mellow-mcp --base master --head volodyach9494-hash:vova_audit_batch2_params_paths \
  --title "fix(tools): param translation + backend-pending docs (audit batch 2)" \
  --body "$(cat <<'EOF'
## Summary

Closes audit categories E (camelCase→snake_case) and B (uuid→taskId), and surfaces D-class backend issues in tool descriptions so the agent fails fast instead of looping.

- **E1, E2:** `scout_getShortLink` and `scout_sharePosition` now serialize params as `reference_type`/`reference_id`/`share_target`.
- **B1–B6:** `addTaskMessage`, `declineTask`, `resumeTask`, `acceptTask`, `changeDeadline`, `changeTaskStatus`, `payForTask` resolve `uuid → numeric taskId` via `getTask` lookup before posting. The documented "pass uuid OR taskId" contract now actually holds.
- **D1, D2, D4, D5, D6, D7:** descriptions now include `BACKEND ISSUE (2026-04-30)` warnings naming the exact failure (404/405/500) and a workaround when one exists.

## Test plan

- [x] `npm run type-check` clean
- [x] `npx wrangler deploy --dry-run` clean
- [ ] Re-run audit subset (E1, E2, B1–B6): expect 200 OK with structured content
- [ ] Re-run audit subset (D1, D2, D4–D7): expect tool to error with the BACKEND ISSUE message included; agent reads description and avoids retry storms

## Backend coordination

This PR does not fix the underlying D-class issues — it only surfaces them. Backend tickets will be filed in batch 3 (`docs/BACKEND_TICKETS.md`).
EOF
)"
```

---

## Batch 3 — Documentation alignment

### Task 18: Drop `createType="draft"` enum value (F1)

**Files:**
- Modify: `src/tools/tasks.ts` (`createTask` `createType` Zod enum)

The audit shows the backend rejects `createType="draft"` with 409 `"draft is not a part of enum"`. The reality from row 33: when `createType` is omitted, the backend creates a DRAFT (state 17) automatically. So `published` is the only valid explicit value, and DRAFT mode is achieved by omitting `createType`.

- [ ] **Step 1: Replace the `createType` schema**

In `src/tools/tasks.ts`, find the `createType` field in `createTask` schema (around line 147-150). Replace:

From:
```typescript
      createType: z
        .enum(["draft", "published"])
        .optional()
        .describe("Create as DRAFT or directly published (NEW). Default is published. Use 'draft' for review-before-publish flows."),
```

To:
```typescript
      createType: z
        .literal("published")
        .optional()
        .describe(
          "Pass 'published' to create directly in NEW state (publishes immediately, equivalent to createTask + publishDraftTask in one step). Omit this field to create as DRAFT (state 17) — the agent can later call publishDraftTask. NOTE: 'draft' is NOT a valid enum value (server returns 409); DRAFT mode is achieved by omitting createType.",
        ),
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/tools/tasks.ts
git commit -m "fix(tools/tasks): drop invalid 'draft' enum value from createTask.createType (F1)"
```

---

### Task 19: Make `getAllowedCurrencies.companyId` honestly required (F2)

**Files:**
- Modify: `src/tools/tasks.ts` (`getAllowedCurrencies`)

`Props.activeCompanyId` is plumbed through `mellow-client` but the OAuth callback never writes it (known issue M9 from prior code review). So the tool description's promise of "X-Company-Id header fallback" is a lie — the audit confirms 400 in F2.

We have two options:

- **(a) Make `companyId` required in the schema** — small, honest, ships now.
- **(b) Wire `Props.activeCompanyId` write-side** in `src/mellow-handler.ts` after `/userinfo` — fixes the broader plumbing too.

**This task implements (a).** Path (b) is captured as a separate backend-coordination follow-up.

- [ ] **Step 1: Make `companyId` required**

In `src/tools/tasks.ts`, find the `getAllowedCurrencies` schema (around line 198-203). Replace:

From:
```typescript
    {
      companyId: z
        .number()
        .optional()
        .describe("Company ID. Optional — defaults to the active company context (X-Company-Id header or user default)."),
    },
```

To:
```typescript
    {
      companyId: z
        .number()
        .describe(
          "Company ID (required). Look up via listCompanies(). The X-Company-Id session-level fallback is not implemented end-to-end yet — backend always requires this in the query string.",
        ),
    },
```

Also remove the `companyId !== undefined` guard in the handler:

From:
```typescript
    async ({ companyId }) => {
      const query: Record<string, string | undefined> = {};
      if (companyId !== undefined) query.companyId = companyId.toString();
      const result = await client.get<unknown>("/customer/tasks/allowed-currencies", query);
```

To:
```typescript
    async ({ companyId }) => {
      const result = await client.get<unknown>("/customer/tasks/allowed-currencies", { companyId: companyId.toString() });
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/tools/tasks.ts
git commit -m "fix(tools/tasks): make getAllowedCurrencies.companyId required (F2)"
```

---

### Task 20: Document `short_link` async generation (F5)

**Files:**
- Modify: `src/tools/scout/positions.ts` (`scout_createPosition` description)

Audit row 67: `short_link` is `null` immediately after create — generated asynchronously. Agent that reads the field at create time will think it failed. Document this.

- [ ] **Step 1: Append a note to the description**

In `src/tools/scout/positions.ts`, find the `scout_createPosition` description (around line 50). Replace:

From:
```typescript
    "Create a new hiring position",
```

To:
```typescript
    "Create a new hiring position. NOTE: the response's short_link is null immediately after creation — it is generated asynchronously. To get it, call scout_getShortLink({referenceType: 'POSITION', referenceId: <position uuid>}) or scout_getPosition a few seconds later.",
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/tools/scout/positions.ts
git commit -m "docs(tools/scout): document short_link async generation on createPosition (F5)"
```

---

### Task 21: Update DOMAIN.md insufficient-funds error codes (F3, F4)

**Files:**
- Modify: `docs/DOMAIN.md`

Audit findings:
- F3: `publishDraftTask` returns **409** `"Top-up your balance"` (domain guide says 400)
- F4: `payForTask` returns **422** `"There is a lack of funds…"` (domain guide says 400)

- [ ] **Step 1: Locate the insufficient-funds section**

```bash
grep -n -i "insufficient\|insufficient funds\|top.up" docs/DOMAIN.md
```

- [ ] **Step 2: Update the error code documentation**

In `docs/DOMAIN.md`, find the section that lists task lifecycle errors (it's referenced from the `payForTask` tool description as "Returns HTTP 400 if balance is insufficient"). Replace any line claiming HTTP 400 for insufficient funds with the actual codes:

The text to find (it may be split across lines or appear inside §5 Task lifecycle):

```
HTTP 400 if balance is insufficient
```

Replace with:

```
HTTP 409 (publishDraftTask, body: "Top-up your balance") or HTTP 422 (payForTask, body: "There is a lack of funds…") if balance is insufficient. The two endpoints differ in error code; pre-check via getCompanyBalance to avoid either.
```

If the exact phrase is not present in `DOMAIN.md`, search for "balance" and update the nearest match. Do NOT add a new section — only correct the existing claim.

- [ ] **Step 3: Update the `payForTask` tool description in `src/tools/tasks.ts`**

Find `payForTask` description (around line 291). Replace:

From:
```typescript
    "Trigger payout for a task already accepted. Legal only in FOR_PAYMENT (4). Transitions FOR_PAYMENT → PAYMENT_QUEUED (12); the final debit to FINISHED (5) is asynchronous. Returns HTTP 400 if balance is insufficient — pre-check getCompanyBalance.",
```

To:
```typescript
    "Trigger payout for a task already accepted. Legal only in FOR_PAYMENT (4). Transitions FOR_PAYMENT → PAYMENT_QUEUED (12); the final debit to FINISHED (5) is asynchronous. Returns HTTP 422 'There is a lack of funds…' if balance is insufficient — pre-check getCompanyBalance.",
```

- [ ] **Step 4: Update the `publishDraftTask` tool description**

Find `publishDraftTask` description (around line 176). Replace:

From:
```typescript
    "Publish a draft task (DRAFT → NEW). Provide either taskId or uuid (not both).",
```

To:
```typescript
    "Publish a draft task (DRAFT → NEW). Provide either taskId or uuid (not both). Returns HTTP 409 'Top-up your balance' if the company balance is insufficient — pre-check getCompanyBalance.",
```

- [ ] **Step 5: Type-check (catches the .ts edits)**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/DOMAIN.md src/tools/tasks.ts
git commit -m "docs: correct insufficient-funds error codes in DOMAIN and tool descs (F3, F4)"
```

---

### Task 22: Track backend-coordination items in BACKEND_TICKETS.md

**Files:**
- Create or modify: `docs/BACKEND_TICKETS.md`

This file is git-only (not bundled in the worker, not served as a resource). It tracks backend issues affecting MCP tools so engineering has a single ledger.

- [ ] **Step 1: Check if the file exists**

```bash
ls -la docs/BACKEND_TICKETS.md 2>&1
```

If it does not exist, create it with this header:

```markdown
# Backend tickets affecting MCP tools

Engineering ledger of open backend issues that constrain Mellow MCP wrapper behaviour. Not bundled in the worker, not served as a resource.

| ID | Reported | Endpoint | Symptom | MCP wrapper status | Backend ticket |
|----|----------|----------|---------|--------------------|----------------|
```

- [ ] **Step 2: Append the rows from the 2026-04-30 audit**

Append the following rows under the table header (or beneath any existing rows):

```markdown
| BUG-D1 | 2026-04-30 | `POST /api/webhooks` | 404 No route found | Description warns; tool unusable | TODO: file with backend |
| BUG-D2 | 2026-04-30 | `DELETE /api/webhooks/{id}` | 404 No route found | Description warns; tool unusable | TODO: file with backend |
| BUG-D3 | 2026-04-29 | `GET /api/customer/web-hook` | 404 when none configured | Description warns; could return `{webhook:null}` (deferred) | Confirm 404 vs empty by design |
| BUG-D4 | 2026-04-30 | `GET /api/customer/documents/{id}/download` | 404 | Description warns; UI download is workaround | TODO |
| BUG-D5 | 2026-04-30 | `DELETE /api/customer/freelancers/{id}` | 405 Method Not Allowed | Description warns | Verify correct HTTP verb / path |
| BUG-D6 | 2026-04-30 | `PUT /positions/{uuid}` (Scout) | 500 Internal Server Error | Description warns; close+create as workaround | TODO |
| BUG-D7 | 2026-04-30 | `GET /tasks/{id}/messages` | 500 on DRAFT tasks | Description warns; only call after publish | Confirm whether DRAFT-state messages collection is intentional |
| BUG-C1 | 2026-04-30 | task-action endpoints (accept/decline/resume/changeDeadline/changeStatus) | Returns 403 Access Denied for "wrong state" instead of 400 | DOMAIN guide already notes the ambiguity | Backend should distinguish 400 (state) vs 403 (permission) |
| BUG-F1 | 2026-04-30 | `POST /customer/tasks` `createType="draft"` | 409 "draft is not a part of enum" | Schema removed `draft`; only `published` is valid | Either accept "draft" enum value or document omission as the only path |
| BUG-F2 | 2026-04-30 | `GET /customer/tasks/allowed-currencies` | 400 when companyId omitted, despite X-Company-Id header context being intended | `companyId` made required in schema | Decide: implement X-Company-Id fallback OR keep query param mandatory |
| BUG-F3 | 2026-04-30 | `publishDraftTask` insufficient funds | Returns 409 (DOMAIN.md said 400) | DOMAIN.md and description corrected | Prefer consistent error code across publish/pay |
| BUG-F4 | 2026-04-30 | `payForTask` insufficient funds | Returns 422 (DOMAIN.md said 400) | DOMAIN.md and description corrected | Prefer consistent error code across publish/pay |
| BUG-G1 | 2026-04-30 | (missing endpoint) | No way to delete a DRAFT task | Workaround: leave drafts; support cleans up | Add `DELETE /customer/tasks/{id}` for DRAFT state |
```

- [ ] **Step 3: Commit**

```bash
git add docs/BACKEND_TICKETS.md
git commit -m "docs: log backend tickets from 2026-04-30 audit"
```

---

### Task 23: Final Batch 3 verification and PR

- [ ] **Step 1: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 2: Build dry-run**

Run: `npx wrangler deploy --dry-run --outdir=/tmp/mcp-build-check`
Expected: success.

- [ ] **Step 3: Push branch and open PR**

```bash
git switch -c vova_audit_batch3_docs
git push -u origin vova_audit_batch3_docs
gh pr create --repo kroshilin/mellow-mcp --base master --head volodyach9494-hash:vova_audit_batch3_docs \
  --title "docs: audit batch 3 — descriptions, DOMAIN, BACKEND_TICKETS" \
  --body "$(cat <<'EOF'
## Summary

Documentation alignment for audit findings F1–F5 plus a fresh `docs/BACKEND_TICKETS.md` ledger of all backend-coordination items.

- **F1:** drop invalid `createType="draft"` enum value; clarify that omitting `createType` produces DRAFT.
- **F2:** make `getAllowedCurrencies.companyId` required (X-Company-Id end-to-end fallback is not implemented).
- **F3, F4:** correct insufficient-funds error codes — 409 for publishDraft, 422 for pay (DOMAIN.md and tool descriptions updated).
- **F5:** document `short_link: null` async generation on `scout_createPosition`.
- New `docs/BACKEND_TICKETS.md` lists D1–D7, C1, F1–F4, G1 with status and proposed backend action.

## Test plan

- [x] `npm run type-check` clean
- [x] `npx wrangler deploy --dry-run` clean
- [ ] Audit re-run confirms F1 (draft enum) no longer crashes; F2 (companyId always passed) returns 200; F3/F4 errors match documented codes
EOF
)"
```

---

## Out-of-scope items (not addressed by this plan)

These need backend coordination, design decisions, or larger refactors:

- **C-class 403-vs-400 ambiguity** — backend should distinguish "permission denied" from "wrong state". Tracked in `BACKEND_TICKETS.md` as BUG-C1.
- **D1, D2 webhooks endpoints missing** — backend must implement `POST /api/webhooks` and `DELETE /api/webhooks/{id}`. Tracked as BUG-D1, BUG-D2.
- **D4 downloadDocument 404** — backend must implement `GET /api/customer/documents/{id}/download`. Tracked as BUG-D4.
- **D5 removeFreelancer 405** — backend HTTP verb mismatch. Tracked as BUG-D5.
- **D6 scout_updatePosition 500** — backend exception. Tracked as BUG-D6.
- **D7 getTaskMessages 500 on DRAFT** — backend exception or intentional design needing confirmation. Tracked as BUG-D7.
- **G1 missing `deleteTask`** — backend must add `DELETE /customer/tasks/{id}` for DRAFT cleanup. Tracked as BUG-G1.
- **`Props.activeCompanyId` write-side** (would close F2 from option B) — needs OAuth callback change to call `/customer/companies` and pick a default. Captured as a follow-up but not in this plan's scope.
- **`addTaskFiles` multipart upload** — pre-existing wrapper bug surfaced in prior code review (Tier 1 review I3); description claims multipart, handler sends JSON. Out of scope; needs multipart support in `mellow-client.ts`.

---

## Verification matrix (all batches combined)

After all three batches merge:

- [ ] `npm run type-check` — PASS
- [ ] `npx wrangler deploy --dry-run` — PASS, ~2.79 MB total
- [ ] `grep -rn "result as { \[key: string\]: unknown }" src/tools/` — empty
- [ ] Tool count = 77 (`grep -h "server\.tool" src/tools/*.ts src/tools/scout/*.ts | wc -l`)
- [ ] Re-run full audit suite: 11 wrapper-level -32602 failures → 0; 8 param/path bugs (B1–B6, E1–E2) → 0; 6 backend-pending (D1, D2, D4, D5, D6, D7) → tool returns clear BACKEND ISSUE message rather than agent retry storm.
