# Tier 1 Quality Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply two parallel work tracks: Track A reviews the freshly rewritten `docs/DOMAIN.md` for agent-readiness; Track B applies SDK-native quality improvements to all 76 MCP tools, adds a tool-shaped doc fallback, and removes inline backend-bug warnings per research findings.

**Architecture:** Track A is a manual review checklist (no code changes). Track B touches `src/tools/**/*.ts` plus `src/index.ts` to add `title` / `readOnlyHint` annotations, return `structuredContent` from every handler, register one new `mellow_read_reference` tool, and strip `KNOWN BUG` strings from descriptions in 4 files.

**Tech Stack:** TypeScript 5.9, `@modelcontextprotocol/sdk`, Cloudflare Workers (Wrangler 4.63), Zod schemas, `npm run type-check` is the only automated gate (no test suite).

**Parallelization note:** Track A is review-only and can run **simultaneously** with Track B. Track B tasks are sequential within themselves (each depends on type-check from the previous). Both tracks merge into a single commit batch at the end.

---

## File Structure

| File | Track | Action |
|---|---|---|
| `docs/DOMAIN.md` | A | Read-only review |
| `src/tools/tasks.ts` | B | Modify — annotations + structuredContent + drop `declineTask` 403 note |
| `src/tools/freelancers.ts` | B | Modify — annotations + structuredContent + drop BUG-1 note |
| `src/tools/finances.ts` | B | Modify — annotations + structuredContent |
| `src/tools/companies.ts` | B | Modify — annotations + structuredContent |
| `src/tools/documents.ts` | B | Modify — annotations + structuredContent + drop `downloadDocument` BUG note |
| `src/tools/profile.ts` | B | Modify — annotations + structuredContent |
| `src/tools/reference.ts` | B | Modify — annotations + structuredContent + drop `getTaxDocumentTypes` BUG note |
| `src/tools/task-groups.ts` | B | Modify — annotations + structuredContent |
| `src/tools/webhooks.ts` | B | Modify — annotations + structuredContent + drop "Backend support is currently incomplete" note (3 tools) |
| `src/tools/chatgpt.ts` | B | Modify — annotations + structuredContent (already has `readOnlyHint` partially) |
| `src/tools/scout/positions.ts` | B | Modify — annotations + structuredContent |
| `src/tools/scout/applications.ts` | B | Modify — annotations + structuredContent |
| `src/tools/scout/ai-tasks.ts` | B | Modify — annotations + structuredContent |
| `src/tools/scout/promo-posts.ts` | B | Modify — annotations + structuredContent |
| `src/tools/scout/pool.ts` | B | Modify — annotations + structuredContent |
| `src/tools/scout/companies.ts` | B | Modify — annotations + structuredContent |
| `src/tools/scout/lookup.ts` | B | Modify — annotations + structuredContent |
| `src/tools/scout/attachments.ts` | B | Modify — annotations + structuredContent |
| `src/tools/reference-tool-fallback.ts` | B | **Create** — new module exporting `registerReferenceFallbackTool` |
| `src/index.ts` | B | Modify — register the new fallback tool |

---

## Track A — DOMAIN.md Review (review-only, no code)

**Files:**
- Read: `docs/DOMAIN.md` (408 lines, 26 KB)

### Task A1: Read top to bottom

- [ ] **Step 1: Read sections 1–4 (Actors, Multi-company, Scout↔CoR, Glossary)**

Verify:
- §1 Actors table covers all 5 roles (Customer Admin, Customer Member, Freelancer, Applicant, Pool Freelancer).
- §1 ID synonyms note: `workerId ≡ freelancerId` is explicit.
- §2 has both `X-Company-Id` and `switchCompany` mechanisms with the decision table.
- §3 explicitly states Scout and CoR are separate databases; `scout_inviteApplicant` ≠ CoR invite.
- §4 Glossary one-liners present for: Task, Task Group, Service, Service Attribute, Specialization, Acceptance Document, Position, Application, Pool, Promo Post, Transaction, Balance, Allowed Currencies, Exchange Rate, Documents (INVOICE/REPORT), Taxation status.

- [ ] **Step 2: Read section 5 (Task lifecycle)**

Verify:
- §5.1 single combined table covers all 14 task states with Group column (active/transient/terminal/side).
- §5.2 transitions table is complete; "Not reachable via this MCP" line covers freelancer-driven and system-driven transitions.
- §5.3 mutation guards table covers `changeDeadline`, `addTaskFiles`, `addTaskMessage`, edit price/currency.
- §5.4 `createTask` preconditions: 4-item list + "not checked at create" callout.
- §5.5 two-step accept-and-pay is **front-and-center** (the most agent-traps-here area). Hold mechanics table is here.
- §5.6 cancellation paths covers DRAFT (no-op), NEW/IN_WORK (no direct cancel), WAITING states.

- [ ] **Step 3: Read sections 6–7 (Freelancers, Scout)**

Verify:
- §6.1 composite onboarding state lists the 4 enums (status_id, isVerified, agree, taxationStatus) — one line each.
- §6.1 lists all 8 `checkTaskRequirements` items.
- §6.2 mutations: `inviteFreelancer` (idempotent rules), `removeFreelancer` (422 if open tasks), `editFreelancer` (PUT-overwrites), `editFreelancerProfile` (locks after KYC, EN/RU/ES/PT), `getFreelancerTaxInfo` (404 = no tax data filled).
- §6.3 lookup: `findFreelancerByEmail` `+`-aliasing caveat, `findFreelancerByPhone` digits-only.
- §7.1 Position states: `active`/`closed`, no drafts, transitions, idempotency warning.
- §7.2 Application states: `new`/`in_review`/`short_list`/`rejected`, no `accepted`, no transition guards.
- §7.3 permissive backend warnings: `scout_changeApplicationStatus`, `scout_deletePoolFreelancersBatch`, `scout_sharePosition`.

- [ ] **Step 4: Read sections 8–9 (Cross-cutting, Decision trees)**

Verify:
- §8.1 errors table covers HTTP 400/403/409/422/423.
- §8.2 idempotency: no `Idempotency-Key`, `uuid` is NOT one, use `externalId` + `listTasks`.
- §8.3 pagination: 500 cap, silent fallback to 20.
- §8.4 read-your-writes: `listTasks` is search-index-backed.
- §8.5 roles: only admin / member.
- §8.6 webhooks: 1 per company, no HTTPS enforcement, retry 6/30min, idempotent receivers.
- §8.7 money: major units everywhere.
- §9 decision trees cover Tasks, Freelancers, Money, Company, Scout, Cross-cutting — all expected user intents have a tree.

### Task A2: Cross-reference & duplication check

- [ ] **Step 5: Verify no remaining internal-doc references**

Run: `grep -nE "TODO_MCP_CLEANUP|AGENT_GUIDE_QA|TASK_STATES_Q27|METHOD_DEEP_DIVE|WORKFLOWS_SWEEP|WORKFLOW_AUDIT|BUG-[0-9]|src/tools/" /Users/vladimir/Dev/mcp_mellow/docs/DOMAIN.md`

Expected: **no output** (zero matches).

If any match: open `docs/DOMAIN.md` and rewrite the offending line in agent-observable terms (no backend internals, no engineering doc names, no `BUG-N` ids).

- [ ] **Step 6: Verify cross-section refs are valid**

Run: `grep -nE "see §[0-9]+\.?[0-9]?" /Users/vladimir/Dev/mcp_mellow/docs/DOMAIN.md`

Expected: every `§N.M` reference points to a real numbered heading in the file (e.g. `§5.6` should map to a `### 5.6` line).

If any broken: fix the cross-ref to the correct number.

- [ ] **Step 7: Verify file size**

Run: `wc -l docs/DOMAIN.md && wc -c docs/DOMAIN.md`

Expected: ~408 lines, ~26 KB. If significantly larger after edits, consider whether new content is necessary or if it duplicates the primer (`src/agent-primer.ts`).

### Task A3: Acceptance criteria

- [ ] **Step 8: Confirm or list deltas**

Document one of:
- ✅ DOMAIN.md is ready to commit as-is.
- 🔧 List specific edits needed (line numbers + proposed change). If list is short (≤5 items), apply inline. If longer, surface to user before committing.

No commit step for Track A — review only. The actual commit happens in the final batch (Track B's last commit).

---

## Track B — Tier 1 Code Improvements

### Background

The MCP SDK supports two ways to register a tool. We currently use the older `server.tool(name, description, paramsSchema, callback)` overload. The SDK exposes a richer overload accepting **annotations**:

```typescript
server.tool(
  name: string,
  description: string,
  paramsSchema: ZodRawShape,
  annotations: ToolAnnotations,   // ← new positional arg
  callback: ToolCallback
)
```

`ToolAnnotations` (from `node_modules/@modelcontextprotocol/sdk/dist/esm/types.js`):

```typescript
{
  title?: string;           // human-readable label distinct from snake_case name
  readOnlyHint?: boolean;   // tool does not modify environment (true for GET/list/search)
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}
```

We will pass `title` + `readOnlyHint` for read-only tools, and `title` only for write tools (default `readOnlyHint: false`). We will also enrich every handler's response with `structuredContent` alongside the existing `content[]` array, so clients that prefer structured output get parsed JSON without re-parsing the text content.

### Read-only vs write classification

Read-only tools (add `readOnlyHint: true`): all `list*`, `get*`, `find*`, `check*`, `search`, `fetch`, plus `getCurrencies`, `getExchangeRate`, etc. Full list — apply `readOnlyHint: true` to every tool whose name starts with `list`, `get`, `find`, `check`, plus `search`, `fetch`, `scout_getShortLink`, `scout_getAttachmentMetadata`.

Write tools (no `readOnlyHint`): all `create*`, `update*`, `delete*`, `add*`, `edit*`, `remove*`, `accept*`, `decline*`, `resume*`, `change*`, `publish*`, `pay*`, `invite*`, `share*`, `close*`, `open*`, `switchCompany`, `downloadDocument` (triggers async ZIP build, has side effect), `renameTaskGroup`, `createOrUpdateWebhook`.

---

### Task B1: Pilot — convert one tool & confirm pattern

**Files:**
- Modify: `src/tools/profile.ts` (1 tool — smallest module)

- [ ] **Step 1: Read current `getUserProfile` registration**

Open `src/tools/profile.ts`. Current shape:

```typescript
server.tool(
  "getUserProfile",
  "Get the current user's profile information",
  {},
  async () => {
    const result = await client.get("/profile");
    return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] };
  },
);
```

- [ ] **Step 2: Apply annotations + structuredContent**

Replace with:

```typescript
server.tool(
  "getUserProfile",
  "Get the current user's profile information",
  {},
  { title: "Get user profile", readOnlyHint: true },
  async () => {
    const result = await client.get<unknown>("/profile");
    return {
      structuredContent: result as { [key: string]: unknown },
      content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }],
    };
  },
);
```

Note the type annotation on `client.get<unknown>` — required because the schema-less `client.get` defaults to `Promise<unknown>` and the new return type expects an indexable object for `structuredContent`. The `as { [key: string]: unknown }` cast keeps TypeScript satisfied without changing runtime behavior.

- [ ] **Step 3: Type-check**

Run: `npm run type-check`

Expected: PASS (no errors).

If errors: examine carefully. Most likely fix is broadening the `as` cast or adjusting the generic on `client.get`. Do **not** add `// @ts-ignore`.

- [ ] **Step 4: Build sanity check**

Run: `npx wrangler deploy --dry-run --outdir=/tmp/mcp-build-check`

Expected: `Total Upload: ~2800 KiB / gzip: ~485 KiB`. No errors.

- [ ] **Step 5: Document the pattern**

Confirm the working pattern is the same as Step 2 above. This is the template for B2–B11. If anything differs (e.g. SDK requires a slightly different cast), update this plan inline before continuing.

- [ ] **Step 6: Commit pilot**

```bash
git add src/tools/profile.ts
git commit -m "feat(tools): pilot annotations + structuredContent on getUserProfile"
```

---

### Task B2: Convert reference.ts (9 lookup tools, all read-only)

**Files:**
- Modify: `src/tools/reference.ts`

**Tools:** `getCurrencies`, `getExchangeRate`, `getTaxStatuses`, `getServices`, `getTaskAttributes`, `getAcceptanceDocuments`, `getTaxDocumentTypes`, `getSpecializations`, `getCountries` — all 9 are read-only.

- [ ] **Step 1: Apply annotations to all 9 tools**

For each tool, transform from:

```typescript
server.tool("getCurrencies", "Get list of available currencies", {}, async () => {
  const result = await client.get("/lookups/currencies");
  return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] };
});
```

To:

```typescript
server.tool(
  "getCurrencies",
  "Get list of available currencies",
  {},
  { title: "Get currencies", readOnlyHint: true },
  async () => {
    const result = await client.get<unknown>("/lookups/currencies");
    return {
      structuredContent: result as { [key: string]: unknown },
      content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }],
    };
  },
);
```

Titles to use:
- `getCurrencies` → `"Get currencies"`
- `getExchangeRate` → `"Get exchange rates"`
- `getTaxStatuses` → `"Get taxation statuses"`
- `getServices` → `"Get service catalog"`
- `getTaskAttributes` → `"Get task attributes catalog"`
- `getAcceptanceDocuments` → `"Get acceptance document templates"`
- `getTaxDocumentTypes` → `"Get tax document types"`
- `getSpecializations` → `"Get freelancer specializations"`
- `getCountries` → `"Get countries"`

- [ ] **Step 2: Drop `getTaxDocumentTypes` KNOWN BUG note**

In the description for `getTaxDocumentTypes`, replace the current text:

```
"Returns possible tax-document types and their validation regexes. Pass `taxResidenceCountry` (alpha-2, e.g. RU, US, KZ) to scope the list to one country — strongly recommended, otherwise the response is the full cross-country catalogue. Use the result to validate `taxNumber` shape before calling tax-info update endpoints. Pair with `getFreelancerTaxInfo.taxResidenceCountry` to scope correctly."
```

(That description does NOT contain a KNOWN BUG line — it was already corrected per the recent backend response. Verify by reading the current file. If a stale `KNOWN BUG` remains anywhere, remove it.)

- [ ] **Step 3: Type-check**

Run: `npm run type-check`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/reference.ts
git commit -m "feat(tools/reference): annotations + structuredContent for 9 lookup tools"
```

---

### Task B3: Convert task-groups.ts (4 tools — 1 read, 3 write)

**Files:**
- Modify: `src/tools/task-groups.ts`

**Tools:**
- `listTaskGroups` → read-only, `title: "List task groups"`
- `createTaskGroup` → write, `title: "Create task group"`
- `renameTaskGroup` → write, `title: "Rename task group"`
- `deleteTaskGroup` → write, `title: "Delete task group"`

- [ ] **Step 1: Apply annotations + structuredContent (same pattern as B1)**

For read-only: pass `{ title: "...", readOnlyHint: true }`.
For write tools: pass `{ title: "..." }` only (no `readOnlyHint`).

- [ ] **Step 2: Type-check**

Run: `npm run type-check`. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/tools/task-groups.ts
git commit -m "feat(tools/task-groups): annotations + structuredContent"
```

---

### Task B4: Convert finances.ts (1 read tool — `listTransactions`)

**Files:**
- Modify: `src/tools/finances.ts`

- [ ] **Step 1: Apply annotations + structuredContent**

`listTransactions` → `{ title: "List transactions", readOnlyHint: true }`.

- [ ] **Step 2: Type-check + commit**

```bash
npm run type-check
git add src/tools/finances.ts
git commit -m "feat(tools/finances): annotations + structuredContent for listTransactions"
```

---

### Task B5: Convert companies.ts (3 tools — 2 read, 1 write)

**Files:**
- Modify: `src/tools/companies.ts`

**Tools:**
- `listCompanies` → read-only, `title: "List companies"`
- `switchCompany` → write, `title: "Switch active company"`
- `getCompanyBalance` → read-only, `title: "Get company balance"`

- [ ] **Step 1: Apply annotations + structuredContent**
- [ ] **Step 2: Type-check + commit**

```bash
git add src/tools/companies.ts
git commit -m "feat(tools/companies): annotations + structuredContent"
```

---

### Task B6: Convert documents.ts (2 tools, drop BUG note)

**Files:**
- Modify: `src/tools/documents.ts`

**Tools:**
- `listDocuments` → read-only, `title: "List documents"`
- `downloadDocument` → write (triggers async ZIP build, has side effect), `title: "Download document"`. **No `readOnlyHint`** since it queues a background job.

- [ ] **Step 1: Apply annotations + structuredContent**

- [ ] **Step 2: Drop `downloadDocument` KNOWN BUG line**

Current description:

```
"Download a specific document by ID. KNOWN BUG (2026-04-28): backend route is missing — returns HTTP 404 for all document IDs. Workaround: surface the document's fileId from listDocuments and have the user download via the web UI."
```

Replace with:

```
"Download a specific document by ID. Returns the prepared archive or queues async ZIP packaging — delivery is via notifications. If the call fails, surface the `fileId` from `listDocuments` and let the user download via the web UI."
```

- [ ] **Step 3: Type-check + commit**

```bash
git add src/tools/documents.ts
git commit -m "feat(tools/documents): annotations + structuredContent, drop inline BUG warning"
```

---

### Task B7: Convert webhooks.ts (3 write tools, drop BUG notes)

**Files:**
- Modify: `src/tools/webhooks.ts`

**Tools:**
- `getWebhook` → read-only, `title: "Get webhook"`
- `createOrUpdateWebhook` → write, `title: "Create or update webhook"`
- `deleteWebhook` → write, `title: "Delete webhook"`

- [ ] **Step 1: Apply annotations + structuredContent**

- [ ] **Step 2: Drop "Backend support is currently incomplete" lines from all three descriptions**

Replace `getWebhook` description:

```
"Get the current webhook configuration. Backend support is currently incomplete (returns 404) — tool registered for forward-compat. Surface gracefully if the call fails."
```

→

```
"Get the current webhook configuration. One webhook per company; surface gracefully if the call fails."
```

Replace `createOrUpdateWebhook` description (preserve the idempotent-receiver guidance):

```
"Create or update a webhook configuration. Only one webhook per company; receiver MUST be idempotent (up to 6 retries within ~30 minutes). Backend support is currently incomplete (returns 404) — tool registered for forward-compat. Surface gracefully if the call fails."
```

→

```
"Create or update a webhook configuration. Only one webhook per company. Receiver MUST be idempotent — the same event will be delivered up to 6 times within ~30 minutes on retry. Surface call failures gracefully to the user."
```

Replace `deleteWebhook` description:

```
"Delete a webhook. Backend support is currently incomplete (returns 404) — tool registered for forward-compat. Surface gracefully if the call fails."
```

→

```
"Delete the configured webhook for the active company."
```

- [ ] **Step 3: Type-check + commit**

```bash
git add src/tools/webhooks.ts
git commit -m "feat(tools/webhooks): annotations + structuredContent, drop forward-compat BUG warnings"
```

---

### Task B8: Convert chatgpt.ts (2 read tools — already partially annotated)

**Files:**
- Modify: `src/tools/chatgpt.ts`

**Tools:** `search` and `fetch` — both read-only. Both already have `{ readOnlyHint: true, destructiveHint: false, openWorldHint: false }` in the existing `tool()` call (note: the file uses the annotations overload already).

- [ ] **Step 1: Add `title` to existing annotations**

For `search`:
```typescript
{ readOnlyHint: true, destructiveHint: false, openWorldHint: false }
```
→
```typescript
{ title: "Search across tasks and freelancers", readOnlyHint: true, destructiveHint: false, openWorldHint: false }
```

For `fetch`:
```typescript
{ readOnlyHint: true, destructiveHint: false, openWorldHint: false }
```
→
```typescript
{ title: "Fetch entity by composite ID", readOnlyHint: true, destructiveHint: false, openWorldHint: false }
```

- [ ] **Step 2: Add `structuredContent` to both handlers**

Both currently return `{ content: [{ text: JSON.stringify(...), type: "text" }] }`. The `search` handler already builds a `{ results }` JSON object — wrap it in `structuredContent`. Same for `fetch`.

For `search` handler:
```typescript
return {
  structuredContent: { results } as { [key: string]: unknown },
  content: [{ text: JSON.stringify({ results }, null, 2), type: "text" as const }],
};
```

For `fetch` handler:
```typescript
return {
  structuredContent: { id, title, text: JSON.stringify(result, null, 2), metadata: { type } } as { [key: string]: unknown },
  content: [{ text: JSON.stringify({ id, title, text: JSON.stringify(result, null, 2), metadata: { type } }, null, 2), type: "text" as const }],
};
```

The error-path (`Unknown resource type:`) keeps `isError: true` and only `content[]` — no `structuredContent` for errors.

- [ ] **Step 3: Type-check + commit**

```bash
git add src/tools/chatgpt.ts
git commit -m "feat(tools/chatgpt): add titles + structuredContent to search/fetch"
```

---

### Task B9: Convert tasks.ts (15 tools — split by side-effect, drop declineTask 403 hint)

**Files:**
- Modify: `src/tools/tasks.ts`

**Read-only (5):** `listTasks`, `getTask`, `getTaskMessages`, `checkTaskRequirements`, `getAllowedCurrencies`

**Write (10):** `createTask`, `publishDraftTask`, `changeTaskStatus`, `changeDeadline`, `acceptTask`, `payForTask`, `declineTask`, `resumeTask`, `addTaskMessage`, `addTaskFiles`

- [ ] **Step 1: Apply annotations + structuredContent**

Titles:
- `listTasks` → `"List tasks"`
- `getTask` → `"Get task"`
- `createTask` → `"Create task"`
- `publishDraftTask` → `"Publish draft task"`
- `changeTaskStatus` → `"Change task status"`
- `changeDeadline` → `"Extend task deadline"`
- `acceptTask` → `"Accept task result"`
- `payForTask` → `"Pay for accepted task"`
- `declineTask` → `"Confirm freelancer's decline"`
- `resumeTask` → `"Return task for rework"`
- `getTaskMessages` → `"Get task chat messages"`
- `addTaskMessage` → `"Send task chat message"`
- `addTaskFiles` → `"Upload task file"`
- `checkTaskRequirements` → `"Check freelancer task requirements"`
- `getAllowedCurrencies` → `"Get allowed task currencies"`

For read-only tools: `{ title, readOnlyHint: true }`. For write tools: `{ title }` only.

- [ ] **Step 2: Drop `declineTask` 403 hint from description**

Current description:

```
"Confirm the freelancer's decline request. Only valid when the task is in state WAITING_DECLINE_BY_WORKER (11) → transitions to DECLINED_BY_CUSTOMER (8). Does NOT cancel a live task — there is no single-call cancel. Note: from any other state the backend currently returns HTTP 403 (Access Denied) rather than 422; treat 403 here as 'wrong state', not as a permissions error."
```

Replace with:

```
"Confirm the freelancer's decline request. Only valid when the task is in state WAITING_DECLINE_BY_WORKER (11) → transitions to DECLINED_BY_CUSTOMER (8). Does NOT cancel a live task — there is no single-call cancel. From any other state the call fails with a 4xx; treat any 4xx here as 'wrong state'."
```

(The reformulation removes the dated `2026-04-28` artefact and the specific 403-vs-422 note; the actionable rule for the agent — treat 4xx as wrong-state — survives.)

- [ ] **Step 3: Type-check**

Run: `npm run type-check`. Expected: PASS.

This is the largest single file in the batch; if there are type errors, work through them carefully — likely on the `client.post`/`get` generics.

- [ ] **Step 4: Commit**

```bash
git add src/tools/tasks.ts
git commit -m "feat(tools/tasks): annotations + structuredContent for 15 task tools, drop declineTask 403 hint"
```

---

### Task B10: Convert freelancers.ts (9 tools, drop BUG-1 note)

**Files:**
- Modify: `src/tools/freelancers.ts`

**Read-only (4):** `listFreelancers`, `getFreelancer`, `findFreelancerByEmail`, `findFreelancerByPhone`, `getFreelancerTaxInfo` — wait, that's 5

Recount:
- Read-only (5): `listFreelancers`, `getFreelancer`, `findFreelancerByEmail`, `findFreelancerByPhone`, `getFreelancerTaxInfo`
- Write (4): `inviteFreelancer`, `editFreelancer`, `editFreelancerProfile`, `removeFreelancer`

- [ ] **Step 1: Apply annotations + structuredContent**

Titles:
- `listFreelancers` → `"List freelancers"`
- `getFreelancer` → `"Get freelancer"`
- `inviteFreelancer` → `"Invite freelancer"`
- `findFreelancerByEmail` → `"Find freelancer by email"`
- `findFreelancerByPhone` → `"Find freelancer by phone"`
- `editFreelancer` → `"Edit freelancer alias"`
- `editFreelancerProfile` → `"Edit freelancer profile (pre-KYC)"`
- `removeFreelancer` → `"Remove freelancer from team"`
- `getFreelancerTaxInfo` → `"Get freelancer tax info"`

- [ ] **Step 2: Drop `findFreelancerByEmail` BUG-1 note**

Current description:

```
"Find a freelancer in the active company by email. Returns the same shape as getFreelancer. Case-sensitive — pass lowercase. KNOWN BUG-1 (2026-04-28): backend returns HTTP 422 for emails containing '+' aliasing in the path. Workaround: skip this lookup and call inviteFreelancer directly — duplicates return HTTP 422 'already in team' which is itself an existence signal."
```

Replace with:

```
"Find a freelancer in the active company by email. Returns the same shape as getFreelancer. Case-sensitive — pass lowercase. Note: emails containing '+' aliasing in the path may return HTTP 422; if that happens, fall back to calling inviteFreelancer directly (duplicates return 422 'already in team', which itself confirms existence)."
```

- [ ] **Step 3: Type-check + commit**

```bash
npm run type-check
git add src/tools/freelancers.ts
git commit -m "feat(tools/freelancers): annotations + structuredContent for 9 tools, drop BUG-1 note"
```

---

### Task B11: Convert Scout modules (8 files, 35 tools)

Process each file as one commit. Same pattern as B1-B10.

**B11a: `src/tools/scout/positions.ts` (7 tools)**

- Read-only (1): `scout_listPositions`, `scout_getPosition` — actually 2 read
- Read-only (2): `scout_listPositions`, `scout_getPosition`
- Write (5): `scout_createPosition`, `scout_updatePosition`, `scout_closePosition`, `scout_openPosition`, `scout_sharePosition`

Titles:
- `scout_listPositions` → `"Scout — list positions"`
- `scout_getPosition` → `"Scout — get position"`
- `scout_createPosition` → `"Scout — create position"`
- `scout_updatePosition` → `"Scout — update position"`
- `scout_closePosition` → `"Scout — close position"`
- `scout_openPosition` → `"Scout — reopen position"`
- `scout_sharePosition` → `"Scout — share position on social"`

- [ ] Apply pattern, type-check, commit:

```bash
git add src/tools/scout/positions.ts
git commit -m "feat(scout/positions): annotations + structuredContent"
```

**B11b: `src/tools/scout/applications.ts` (5 tools)**

Read-only (3): `scout_listApplications`, `scout_listPositionApplications`, `scout_getApplication`
Write (2): `scout_changeApplicationStatus`, `scout_inviteApplicant`

Titles:
- `scout_listApplications` → `"Scout — list applications"`
- `scout_listPositionApplications` → `"Scout — list applications for position"`
- `scout_getApplication` → `"Scout — get application"`
- `scout_changeApplicationStatus` → `"Scout — change application status"`
- `scout_inviteApplicant` → `"Scout — email applicant"`

- [ ] Apply, type-check, commit:

```bash
git add src/tools/scout/applications.ts
git commit -m "feat(scout/applications): annotations + structuredContent"
```

**B11c: `src/tools/scout/ai-tasks.ts` (2 tools)**

Write (1): `scout_generatePosition` — triggers async AI generation
Read-only (1): `scout_getGeneratePositionTask` — polls task status

Titles:
- `scout_generatePosition` → `"Scout — start AI position generation"`
- `scout_getGeneratePositionTask` → `"Scout — poll AI generation status"`

- [ ] Apply, type-check, commit:

```bash
git add src/tools/scout/ai-tasks.ts
git commit -m "feat(scout/ai-tasks): annotations + structuredContent"
```

**B11d: `src/tools/scout/promo-posts.ts` (2 tools)**

Write (1): `scout_createPromoPosts` — triggers async generation
Read-only (1): `scout_getPromoPosts` — polls

Titles:
- `scout_createPromoPosts` → `"Scout — start promo post generation"`
- `scout_getPromoPosts` → `"Scout — get promo posts"`

- [ ] Apply, type-check, commit:

```bash
git add src/tools/scout/promo-posts.ts
git commit -m "feat(scout/promo-posts): annotations + structuredContent"
```

**B11e: `src/tools/scout/pool.ts` (7 tools)**

Read-only (3): `scout_getPool`, `scout_listPoolFreelancers`, `scout_getPoolFreelancer`
Write (4): `scout_createPoolFreelancer`, `scout_editPoolFreelancer`, `scout_deletePoolFreelancer`, `scout_deletePoolFreelancersBatch`

Titles:
- `scout_getPool` → `"Scout — get private pool"`
- `scout_listPoolFreelancers` → `"Scout — list pool freelancers"`
- `scout_getPoolFreelancer` → `"Scout — get pool freelancer"`
- `scout_createPoolFreelancer` → `"Scout — add pool freelancer"`
- `scout_editPoolFreelancer` → `"Scout — edit pool freelancer (PUT)"`
- `scout_deletePoolFreelancer` → `"Scout — remove pool freelancer"`
- `scout_deletePoolFreelancersBatch` → `"Scout — bulk remove pool freelancers"`

- [ ] Apply, type-check, commit:

```bash
git add src/tools/scout/pool.ts
git commit -m "feat(scout/pool): annotations + structuredContent"
```

**B11f: `src/tools/scout/companies.ts` (1 tool)**

Read-only (1): `scout_listCompanies`

Title:
- `scout_listCompanies` → `"Scout — list companies"`

- [ ] Apply, type-check, commit:

```bash
git add src/tools/scout/companies.ts
git commit -m "feat(scout/companies): annotations + structuredContent"
```

**B11g: `src/tools/scout/lookup.ts` (2 tools)**

Read-only (2): `scout_getCountries`, `scout_getShortLink`

Titles:
- `scout_getCountries` → `"Scout — get countries"`
- `scout_getShortLink` → `"Scout — get short link"`

- [ ] Apply, type-check, commit:

```bash
git add src/tools/scout/lookup.ts
git commit -m "feat(scout/lookup): annotations + structuredContent"
```

**B11h: `src/tools/scout/attachments.ts` (1 tool)**

Read-only (1): `scout_getAttachmentMetadata`

Title:
- `scout_getAttachmentMetadata` → `"Scout — get attachment metadata"`

- [ ] Apply, type-check, commit:

```bash
git add src/tools/scout/attachments.ts
git commit -m "feat(scout/attachments): annotations + structuredContent"
```

---

### Task B12: Add `mellow_read_reference` fallback tool

**Files:**
- Create: `src/tools/reference-tool-fallback.ts`
- Modify: `src/index.ts`

**Why:** some MCP clients (Cursor, ChatGPT plugin, older Claude variants) don't surface MCP **resources** in their tool-picker UI. To keep `mellow://domain` etc. discoverable from those clients, register a tool-shaped pass-through that returns the same markdown content.

- [ ] **Step 1: Create the new module**

File: `src/tools/reference-tool-fallback.ts`

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const REFERENCE_DOCS: Record<string, string> = {};

/**
 * Tool-shaped pass-through over the MCP resources (`mellow://domain` etc.).
 * Some clients don't surface resources in their UI — this tool keeps the
 * three reference docs reachable in those environments. Returns the same
 * markdown content the resource handlers serve.
 */
export function registerReferenceFallbackTool(
	server: McpServer,
	docs: { domain: string; workflows: string; antiPatterns: string },
) {
	REFERENCE_DOCS["mellow://domain"] = docs.domain;
	REFERENCE_DOCS["mellow://workflows"] = docs.workflows;
	REFERENCE_DOCS["mellow://anti-patterns"] = docs.antiPatterns;

	server.tool(
		"mellow_read_reference",
		"Read one of the Mellow reference documents. Use this when the client doesn't surface MCP resources directly. Available URIs: mellow://domain (full domain guide — actors, state machines, decision trees), mellow://workflows (12 end-to-end recipes), mellow://anti-patterns (common agent mistakes catalogue).",
		{
			uri: z
				.enum(["mellow://domain", "mellow://workflows", "mellow://anti-patterns"])
				.describe("Reference document URI to read."),
		},
		{ title: "Read Mellow reference doc", readOnlyHint: true },
		async ({ uri }) => {
			const text = REFERENCE_DOCS[uri];
			if (!text) {
				return {
					content: [{ type: "text" as const, text: `Unknown reference URI: ${uri}` }],
					isError: true,
				};
			}
			return {
				structuredContent: { uri, mimeType: "text/markdown", text },
				content: [{ type: "text" as const, text }],
			};
		},
	);
}
```

- [ ] **Step 2: Wire up in `src/index.ts`**

Add the import next to the existing tool-module imports:

```typescript
import { registerReferenceFallbackTool } from "./tools/reference-tool-fallback";
```

In `MyMCP.init()`, after `registerChatGptTools(this.server, client);` and before the `scoutClient` block, add:

```typescript
registerReferenceFallbackTool(this.server, {
  domain: DOMAIN_MD,
  workflows: WORKFLOWS_MD,
  antiPatterns: ANTI_PATTERNS_MD,
});
```

- [ ] **Step 3: Type-check + build sanity check**

```bash
npm run type-check
npx wrangler deploy --dry-run --outdir=/tmp/mcp-build-check
```

Expected: PASS, build under ~2.85 MB.

- [ ] **Step 4: Verify the tool is in the registered list**

Run: `grep -c "server\.tool" src/tools/*.ts src/tools/scout/*.ts`

Expected: total = 77 (76 existing + 1 new fallback). Each per-file count should match the inventory in §"File Structure" above.

- [ ] **Step 5: Update primer to mention the fallback**

Open `src/agent-primer.ts`. In the "Where to read more" section, after the three resource bullets, add:

```
Some MCP clients do not surface resources in their UI. If your client only shows tools, call \`mellow_read_reference({uri: "mellow://domain" | "mellow://workflows" | "mellow://anti-patterns"})\` instead — it returns the same content.
```

- [ ] **Step 6: Type-check + commit**

```bash
npm run type-check
git add src/tools/reference-tool-fallback.ts src/index.ts src/agent-primer.ts
git commit -m "feat(tools): add mellow_read_reference tool-shaped fallback for resources"
```

---

### Task B13: Final integration check

- [ ] **Step 1: Full type-check**

Run: `npm run type-check`

Expected: PASS, no errors.

- [ ] **Step 2: Full build**

Run: `npx wrangler deploy --dry-run --outdir=/tmp/mcp-build-check`

Expected: `Total Upload: ~2810 KiB / gzip: ~488 KiB` (slightly more than current due to new module). No errors.

- [ ] **Step 3: Confirm no lingering KNOWN BUG strings in tool descriptions**

Run: `grep -rn "KNOWN BUG\|currently incomplete\|2026-04-28\|2026-04-29" src/tools/`

Expected: **no output**.

If any remain (other than in comments outside descriptions): remove them.

- [ ] **Step 4: Confirm tool count**

Run: `grep -hcE 'server\.tool' src/tools/*.ts src/tools/scout/*.ts | awk '{s+=$1} END {print s}'`

Expected: `77` (76 existing + `mellow_read_reference`).

- [ ] **Step 5: Optional manual smoke test in MCP Inspector**

Run: `npx @modelcontextprotocol/inspector@latest`

Connect to the deployed Worker (or `wrangler dev` locally). Verify:
- `tools/list` returns 77 tools, each with a `title`, and read-only ones with `readOnlyHint: true`.
- `tools/call` on `getCompanyBalance` returns both `structuredContent` and `content[]`.
- `tools/call` on `mellow_read_reference` with `{uri: "mellow://domain"}` returns the markdown.
- `resources/list` still shows 3 resources.
- `initialize` response carries the primer in `instructions`.

If any check fails, fix before proceeding to Track A's commit.

---

## Track A — Final commit (after Track B is complete)

- [ ] **Step 1: Apply any review-driven adjustments to DOMAIN.md**

If Task A3 surfaced edits, apply them now.

- [ ] **Step 2: Commit DOMAIN.md if changed**

```bash
git add docs/DOMAIN.md
git commit -m "docs(domain): review pass — adjustments after agent-readiness check"
```

If no changes: skip this step.

---

## Self-Review

**Spec coverage:**
- Track A `Read DOMAIN.md` → Tasks A1, A2, A3 ✅
- Track B sub-task 1 (annotations + structuredContent on all 76 tools) → Tasks B1 (pilot) + B2–B11 (per-module) ✅
- Track B sub-task 2 (mellow_read_reference fallback) → Task B12 ✅
- Track B sub-task 3 (remove KNOWN BUG warnings) → embedded in B6, B7, B9, B10 + final scan in B13 ✅
- Final commit batch → B13 + Track A final ✅

**Placeholder scan:**
- No "TBD", "implement later", or unspecified code blocks — every step has either a code template or an exact file/text reference.
- Each task has explicit type-check + build verification.

**Type consistency:**
- `structuredContent` is consistently typed as `{ [key: string]: unknown }` (cast from `unknown` returned by `client.get` etc.).
- `ToolAnnotations` field name `readOnlyHint` is consistent across all tasks.
- Tool count expectation (`77` after fallback) matches the cumulative additions.

**Parallelization:**
- Track A is review-only and runs concurrently with Track B.
- Track B tasks B1 → B2 → ... → B13 are sequential (each depends on type-check from the previous).
- Final commit batch happens after both tracks complete.
