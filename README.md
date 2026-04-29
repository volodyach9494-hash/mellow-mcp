# Mellow & Scout MCP Server

Remote [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) server for **Mellow** and **AI Scout**, deployed on Cloudflare Workers with Mellow OAuth.

Mellow helps companies hire, manage, and pay contractors globally — handling contracts, compliance, onboarding, and international payments. Two products are exposed through this server:

- **Contractor of Record (CoR)** — engage contractors, run task lifecycle (draft → publish → accept → pay), collect closing documents.
- **AI Scout** — find candidates, AI-generate position descriptions, share externally, manage applications and a private contractor pool.

## What an agent gets at install time

When any MCP client (Claude Desktop, Cursor, MCP Inspector, ChatGPT) connects, the server returns three things:

1. **Tools** — 76 callable tools, each with an enriched description that spells out preconditions, error semantics, and known-bug warnings.
2. **`instructions`** (~6 KB primer) — auto-injected as system prompt by most clients. Covers identity, the two-step accept-and-pay flow, ID semantics (`workerId` ≡ `freelancerId`), task state machine, multi-company via `X-Company-Id`, top traps to avoid, and pointers to the resources below.
3. **Resources** — three on-demand reference documents the agent can read by URI:
   - `mellow://domain` — full domain guide (actors, products, state machines, preconditions, decision trees)
   - `mellow://workflows` — 12 end-to-end recipes (onboarding, accept-and-pay, Scout hiring, multi-currency, bulk import)
   - `mellow://anti-patterns` — common agent mistakes with bad/good examples

The primer is engineered so that an agent who reads it **before** the first tool call already knows the non-obvious rules — for example, that `acceptTask` does not pay (a separate `payForTask` step is required), and that `declineTask` is not a generic cancel.

## Architecture

The server acts as an OAuth proxy:
- **OAuth Server** to MCP clients (Claude, Cursor, etc.)
- **OAuth Client** to Mellow's auth service (`wlcm.mellow.io`)

Both products share the same auth flow and access token. The server creates two API clients — one for `my.mellow.io` (CoR) and one for `aiscout-api.mellow.io` (Scout) — and registers tools from both. A per-session `X-Company-Id` header (driven by `Props.activeCompanyId`) handles multi-company users.

### Stack

- [Cloudflare Workers](https://developers.cloudflare.com/workers/) + Durable Objects
- [`workers-oauth-provider`](https://github.com/cloudflare/workers-oauth-provider) for OAuth 2.1
- [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/sdk) for MCP protocol
- [Hono](https://hono.dev/) for the OAuth callback handler
- [Zod](https://zod.dev/) for tool input validation

## Tools (76 total)

### Mellow (CoR)

| Module | Tools | Description |
|--------|-------|-------------|
| Tasks (15) | `listTasks`, `getTask`, `createTask`, `publishDraftTask`, `changeTaskStatus`, `changeDeadline`, `acceptTask`, `payForTask`, `declineTask`, `resumeTask`, `getTaskMessages`, `addTaskMessage`, `addTaskFiles`, `checkTaskRequirements`, `getAllowedCurrencies` | Task lifecycle. Accept-and-pay is two-step: `acceptTask` → `payForTask`. |
| Task Groups (4) | `listTaskGroups`, `createTaskGroup`, `renameTaskGroup`, `deleteTaskGroup` | Project / discipline grouping for document exports. |
| Freelancers (9) | `listFreelancers`, `getFreelancer`, `inviteFreelancer`, `findFreelancerByEmail`, `findFreelancerByPhone`, `editFreelancer`, `editFreelancerProfile`, `removeFreelancer`, `getFreelancerTaxInfo` | Per-company contractor management. KYC / contact change / taxation status are handled by the freelancer in their own UI, not via this MCP. |
| Transactions (1) | `listTransactions` | Company financial ledger (top-ups, debits, corrections, taxes). |
| Companies (3) | `listCompanies`, `switchCompany`, `getCompanyBalance` | Multi-company support. Prefer `X-Company-Id` per request over `switchCompany` for parallel sessions. |
| Documents (2) | `listDocuments`, `downloadDocument` | Closing documents (invoices type 6, period reports type 7). |
| Profile (1) | `getUserProfile` | Current user info. |
| Reference (9) | `getCurrencies`, `getExchangeRate`, `getTaxStatuses`, `getServices`, `getTaskAttributes`, `getAcceptanceDocuments`, `getTaxDocumentTypes`, `getSpecializations`, `getCountries` | Lookups for catalog values. |
| Webhooks (3) | `getWebhook`, `createOrUpdateWebhook`, `deleteWebhook` | Webhook configuration. **Backend route currently 404 (BUG-6)** — tools registered for forward compat. |
| ChatGPT bridge (2) | `search`, `fetch` | Cross-entity search across tasks and freelancers. |

### AI Scout (`scout_` prefix)

| Module | Tools | Description |
|--------|-------|-------------|
| Positions (7) | `scout_listPositions`, `scout_getPosition`, `scout_createPosition`, `scout_updatePosition`, `scout_closePosition`, `scout_openPosition`, `scout_sharePosition` | Contractor request lifecycle. Two states: `active` ↔ `closed`. |
| Applications (5) | `scout_listApplications`, `scout_listPositionApplications`, `scout_getApplication`, `scout_changeApplicationStatus`, `scout_inviteApplicant` | Candidate pipeline. Backend has no transition guards — the agent must enforce sensible status flow. `scout_inviteApplicant` is an email, not a CoR engagement. |
| AI Tasks (2) | `scout_generatePosition`, `scout_getGeneratePositionTask` | Async AI generation of position description. |
| Promo Posts (2) | `scout_createPromoPosts`, `scout_getPromoPosts` | Async social-media post generation for sharing positions. |
| Pool (7) | `scout_getPool`, `scout_listPoolFreelancers`, `scout_getPoolFreelancer`, `scout_createPoolFreelancer`, `scout_editPoolFreelancer`, `scout_deletePoolFreelancer`, `scout_deletePoolFreelancersBatch` | Private contractor database per company. `scout_deletePoolFreelancersBatch` has no backend size cap — confirm with the user for large batches. |
| Attachments / Companies / Lookup (4) | `scout_getAttachmentMetadata`, `scout_listCompanies`, `scout_getCountries`, `scout_getShortLink` | Misc Scout reference / metadata. |

For full per-tool semantics, fetch the `mellow://workflows` and `mellow://anti-patterns` resources at runtime, or read [`docs/DOMAIN.md`](docs/DOMAIN.md) and [`docs/WORKFLOWS.md`](docs/WORKFLOWS.md) at design time.

## Documentation

All docs in `docs/` are agent-facing — three are also bundled into the worker and served as MCP resources:

- [`docs/DOMAIN.md`](docs/DOMAIN.md) — domain guide: products, actors, ID semantics, multi-company, state machines, preconditions, decision trees. Served as `mellow://domain`.
- [`docs/WORKFLOWS.md`](docs/WORKFLOWS.md) — 12 end-to-end recipes with concrete tool sequences and error handling. Served as `mellow://workflows`.
- [`docs/ANTI_PATTERNS.md`](docs/ANTI_PATTERNS.md) — catalogue of common agent mistakes (Bad → Why → Good). Served as `mellow://anti-patterns`.
- [`docs/BACKEND_TICKETS.md`](docs/BACKEND_TICKETS.md) — live status of open backend issues affecting MCP tools. Engineering-facing only (not bundled).

`CLAUDE.md` at the repo root is the project-instructions file used by Claude Code when editing this repository.

## Setup

### Prerequisites

- Node.js 20+
- Cloudflare account with Workers enabled
- Mellow OAuth app credentials

### Install

```bash
npm install
```

### Secrets

Set via Wrangler (one-time):

```bash
npx wrangler secret put MELLOW_CLIENT_ID
npx wrangler secret put MELLOW_CLIENT_SECRET
npx wrangler secret put COOKIE_ENCRYPTION_KEY  # openssl rand -hex 32
```

### Environment variables

Non-secret config lives in `wrangler.jsonc`:

| Variable | Value |
|----------|-------|
| `MELLOW_API_BASE_URL` | `https://my.mellow.io/api` |
| `MELLOW_BASE_URL` | `https://wlcm.mellow.io` |
| `SCOUT_API_BASE_URL` | `https://aiscout-api.mellow.io/api` |

### KV namespace

The OAuth KV namespace is already configured in `wrangler.jsonc`. If setting up a fresh deployment:

```bash
npx wrangler kv namespace create "OAUTH_KV"
```

Update the `id` in `wrangler.jsonc` with the returned namespace ID.

## Development

```bash
npx wrangler dev
```

Server starts at `http://localhost:8788`. Create a `.dev.vars` file for local OAuth credentials:

```
MELLOW_CLIENT_ID=your_dev_client_id
MELLOW_CLIENT_SECRET=your_dev_client_secret
COOKIE_ENCRYPTION_KEY=your_random_hex_string
```

### Type check

`npm run type-check` is the primary correctness gate (no test framework is configured).

### Regenerate Cloudflare types

After modifying `wrangler.jsonc` bindings or vars:

```bash
npm run cf-typegen
```

Note: secret bindings are *not* picked up by `wrangler types`. They are declared manually in `src/types/env-secrets.d.ts` to keep the source typed.

### Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector@latest
```

Enter `http://localhost:8788/sse` and connect. After the OAuth flow you should see:
- The agent primer in the **Server Info / Instructions** view
- 76 tools listed in **Tools**
- 3 resources listed in **Resources** (`mellow://domain`, `mellow://workflows`, `mellow://anti-patterns`)

## Deployment

```bash
npx wrangler deploy
```

## Connecting MCP clients

### Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "mellow": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://mcp.it-dep-271.workers.dev/sse"
      ]
    }
  }
}
```

### Cursor

Type: **Command**, Command: `npx mcp-remote https://mcp.it-dep-271.workers.dev/sse`

### ChatGPT (via mcp-remote)

Same pattern as Claude Code — the client connects, completes OAuth, then has access to tools, instructions, and resources.

## Adding a tool

1. Write the registration in the appropriate `src/tools/<module>.ts`. Use `server.tool(name, description, zodSchema, handler)` and let `MellowClient` handle HTTP via `client.get/post/put/patch/del`.
2. If the description teaches the agent something non-obvious about state, errors, or known bugs — say so explicitly. Agent system prompts and tool descriptions are the primary contract.
3. Wire-up in `src/index.ts` is only needed when creating a *new* module file.
4. Run `npm run type-check`, then `npx wrangler deploy --dry-run` for a build sanity check.

For broader edits to the agent surface (primer, resources), see `src/agent-primer.ts` and the `registerResource()` calls in `src/index.ts`.
