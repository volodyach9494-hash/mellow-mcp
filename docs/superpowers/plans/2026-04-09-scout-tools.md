# AI Scout MCP Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI Scout product tools to the existing Mellow MCP server, prefixed with `scout_`, reusing the same auth token and `createMellowClient` abstraction.

**Architecture:** Create a second `MellowClient` instance pointing at `SCOUT_API_BASE_URL`. Organize Scout tools in `src/tools/scout/` subdirectory with one file per module. Register all Scout tools in `MyMCP.init()` alongside existing Mellow tools.

**Tech Stack:** TypeScript, Cloudflare Workers, `@modelcontextprotocol/sdk`, Zod

---

## File Structure

| File | Responsibility |
|------|---------------|
| `wrangler.jsonc` | Add `SCOUT_API_BASE_URL` env var |
| `worker-configuration.d.ts` | Add `SCOUT_API_BASE_URL` to `Env` type (via `wrangler types`) |
| `src/index.ts` | Create Scout client, register Scout tool modules |
| `src/tools/scout/positions.ts` | Position CRUD + close/open/share tools (7 tools) |
| `src/tools/scout/applications.ts` | Application listing, details, status, invite tools (5 tools) |
| `src/tools/scout/ai-tasks.ts` | AI position generation + polling tools (2 tools) |
| `src/tools/scout/promo-posts.ts` | Promo post creation + retrieval tools (2 tools) |
| `src/tools/scout/pool.ts` | Private pool + pool freelancer tools (7 tools) |
| `src/tools/scout/quiz.ts` | Quiz answer, settings, disable tools (4 tools) |
| `src/tools/scout/attachments.ts` | Attachment metadata tool (1 tool) |
| `src/tools/scout/companies.ts` | Company listing tool (1 tool) |
| `src/tools/scout/lookup.ts` | Countries + short links tools (2 tools) |

**Total: 31 new tools**

---

### Task 1: Add Scout env var to wrangler config

**Files:**
- Modify: `wrangler.jsonc:51-54`

- [ ] **Step 1: Add `SCOUT_API_BASE_URL` to vars in `wrangler.jsonc`**

In `wrangler.jsonc`, add the new var to the existing `vars` block:

```jsonc
"vars": {
    "MELLOW_API_BASE_URL": "https://my.mellow.io/api",
    "MELLOW_BASE_URL": "https://wlcm.mellow.io",
    "SCOUT_API_BASE_URL": "https://aiscout-api.mellow.io/api"
},
```

- [ ] **Step 2: Regenerate Env types**

Run: `npx wrangler types`

This updates `worker-configuration.d.ts` to include `SCOUT_API_BASE_URL: string` in the `Env` interface.

- [ ] **Step 3: Verify the type was added**

Run: `grep SCOUT worker-configuration.d.ts`
Expected: `SCOUT_API_BASE_URL: string;`

- [ ] **Step 4: Commit**

```bash
git add wrangler.jsonc worker-configuration.d.ts
git commit -m "feat: add SCOUT_API_BASE_URL env var"
```

---

### Task 2: Create Scout positions tools

**Files:**
- Create: `src/tools/scout/positions.ts`

- [ ] **Step 1: Create `src/tools/scout/positions.ts`**

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../../mellow-client"

export function registerScoutPositionTools(server: McpServer, client: MellowClient) {
	server.tool(
		"scout_listPositions",
		"List hiring positions with pagination and sorting",
		{
			page: z.number().optional().describe("Page number (default: 1)"),
			limit: z.number().max(100).optional().describe("Items per page (max 100, default: 20)"),
			sortDirection: z.enum(["ASC", "DESC"]).optional().describe("Sort direction (default: DESC)"),
		},
		async (params) => {
			const result = await client.get("/positions", {
				page: params.page?.toString(),
				limit: params.limit?.toString(),
				sortField: "createdAt",
				sortDirection: params.sortDirection,
			})
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_getPosition",
		"Get a position by UUID or short code",
		{
			id: z.string().describe("Position UUID or 8-character short code"),
			trackView: z.boolean().optional().describe("Whether to track this as a view"),
		},
		async ({ id, trackView }) => {
			const result = await client.get(`/positions/${id}`, {
				trackView: trackView?.toString(),
			})
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_createPosition",
		"Create a new hiring position",
		{
			title: z.string().describe("Position title"),
			description: z.string().describe("Position description"),
			company: z.object({
				id: z.string().uuid().optional().describe("Existing company UUID"),
				name: z.string().describe("Company name"),
				website: z.string().url().describe("Company website URL"),
			}).describe("Company details"),
			workModel: z.enum(["remote", "onsite"]).describe("Work model"),
			projectDuration: z.enum(["longTerm", "shortTerm"]).describe("Project duration"),
			isBudgetNegotiable: z.boolean().describe("Whether budget is negotiable"),
			location: z.string().optional().describe("Location (required if onsite)"),
			paymentType: z.enum(["hourly", "monthly", "fixed"]).optional().describe("Payment type (required if budget not negotiable)"),
			currency: z.enum(["eur", "usd"]).optional().describe("Currency (required if budget not negotiable)"),
			budgetFrom: z.number().optional().describe("Budget lower bound"),
			budgetTo: z.number().optional().describe("Budget upper bound"),
			budget: z.number().optional().describe("Exact budget amount"),
			aiTaskId: z.string().uuid().optional().describe("AI generation task ID that created this position"),
		},
		async (params) => {
			const result = await client.post("/positions", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_updatePosition",
		"Update an existing position",
		{
			id: z.string().uuid().describe("Position UUID"),
			title: z.string().describe("Position title"),
			description: z.string().describe("Position description"),
			company: z.object({
				id: z.string().uuid().optional().describe("Existing company UUID"),
				name: z.string().describe("Company name"),
				website: z.string().url().describe("Company website URL"),
			}).describe("Company details"),
			workModel: z.enum(["remote", "onsite"]).describe("Work model"),
			projectDuration: z.enum(["longTerm", "shortTerm"]).describe("Project duration"),
			isBudgetNegotiable: z.boolean().describe("Whether budget is negotiable"),
			location: z.string().optional().describe("Location (required if onsite)"),
			paymentType: z.enum(["hourly", "monthly", "fixed"]).optional().describe("Payment type"),
			currency: z.enum(["eur", "usd"]).optional().describe("Currency"),
			budgetFrom: z.number().optional().describe("Budget lower bound"),
			budgetTo: z.number().optional().describe("Budget upper bound"),
			budget: z.number().optional().describe("Exact budget amount"),
		},
		async ({ id, ...body }) => {
			const result = await client.put(`/positions/${id}`, body)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_closePosition",
		"Close a position so it no longer accepts applications",
		{
			id: z.string().uuid().describe("Position UUID"),
		},
		async ({ id }) => {
			const result = await client.del(`/positions/${id}`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_openPosition",
		"Reopen a previously closed position",
		{
			id: z.string().uuid().describe("Position UUID"),
		},
		async ({ id }) => {
			const result = await client.post(`/positions/${id}/open`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_sharePosition",
		"Share a position on social networks",
		{
			id: z.string().uuid().describe("Position UUID"),
			shareTarget: z.string().describe("Social network target to share on"),
		},
		async ({ id, shareTarget }) => {
			const result = await client.post(`/positions/${id}/share`, { shareTarget })
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/tools/scout/positions.ts`

- [ ] **Step 3: Commit**

```bash
git add src/tools/scout/positions.ts
git commit -m "feat: add scout position tools"
```

---

### Task 3: Create Scout applications tools

**Files:**
- Create: `src/tools/scout/applications.ts`

- [ ] **Step 1: Create `src/tools/scout/applications.ts`**

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../../mellow-client"

export function registerScoutApplicationTools(server: McpServer, client: MellowClient) {
	server.tool(
		"scout_listApplications",
		"List all applications across all positions with pagination",
		{
			page: z.number().optional().describe("Page number (default: 1)"),
			limit: z.number().max(100).optional().describe("Items per page (max 100, default: 20)"),
			sortDirection: z.enum(["ASC", "DESC"]).optional().describe("Sort direction (default: DESC)"),
		},
		async (params) => {
			const result = await client.get("/applications", {
				page: params.page?.toString(),
				limit: params.limit?.toString(),
				sortField: "createdAt",
				sortDirection: params.sortDirection,
			})
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_listPositionApplications",
		"List applications for a specific position",
		{
			positionId: z.string().uuid().describe("Position UUID"),
			page: z.number().optional().describe("Page number (default: 1)"),
			limit: z.number().max(100).optional().describe("Items per page (max 100, default: 20)"),
			sortDirection: z.enum(["ASC", "DESC"]).optional().describe("Sort direction (default: DESC)"),
		},
		async ({ positionId, ...params }) => {
			const result = await client.get(`/positions/${positionId}/applications`, {
				page: params.page?.toString(),
				limit: params.limit?.toString(),
				sortField: "createdAt",
				sortDirection: params.sortDirection,
			})
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_getApplication",
		"Get details of a specific application",
		{
			id: z.string().uuid().describe("Application UUID"),
			trackStatus: z.boolean().optional().describe("If true, changes status to IN_REVIEW"),
		},
		async ({ id, trackStatus }) => {
			const result = await client.get(`/applications/${id}`, {
				trackStatus: trackStatus?.toString(),
			})
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_changeApplicationStatus",
		"Change the status of an application (in_review, short_list, rejected, accepted)",
		{
			id: z.string().uuid().describe("Application UUID"),
			status: z.enum(["in_review", "short_list", "rejected", "accepted"]).describe("New application status"),
		},
		async ({ id, status }) => {
			const result = await client.patch(`/applications/${id}/status`, { status })
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_inviteApplicant",
		"Send an invitation to an applicant",
		{
			id: z.string().uuid().describe("Application UUID"),
		},
		async ({ id }) => {
			const result = await client.post(`/applications/${id}/invite`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/scout/applications.ts
git commit -m "feat: add scout application tools"
```

---

### Task 4: Create Scout AI tasks tools

**Files:**
- Create: `src/tools/scout/ai-tasks.ts`

- [ ] **Step 1: Create `src/tools/scout/ai-tasks.ts`**

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../../mellow-client"

export function registerScoutAiTaskTools(server: McpServer, client: MellowClient) {
	server.tool(
		"scout_generatePosition",
		"Generate a position description using AI. Returns a task ID to poll for results.",
		{
			request: z.string().min(5).max(1000).describe("Prompt describing the position to generate"),
		},
		async ({ request }) => {
			const result = await client.post("/ai/tasks/generate-position", { request, source: "APP" })
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_getGeneratePositionTask",
		"Get the status and result of an AI position generation task",
		{
			taskId: z.string().uuid().describe("AI task UUID returned by scout_generatePosition"),
		},
		async ({ taskId }) => {
			const result = await client.get(`/ai/tasks/generate-position/${taskId}`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/scout/ai-tasks.ts
git commit -m "feat: add scout AI task tools"
```

---

### Task 5: Create Scout promo posts tools

**Files:**
- Create: `src/tools/scout/promo-posts.ts`

- [ ] **Step 1: Create `src/tools/scout/promo-posts.ts`**

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../../mellow-client"

export function registerScoutPromoPostTools(server: McpServer, client: MellowClient) {
	server.tool(
		"scout_createPromoPosts",
		"Generate promotional social media posts for a position (async). Poll with scout_getPromoPosts for results.",
		{
			positionId: z.string().uuid().describe("Position UUID"),
		},
		async ({ positionId }) => {
			const result = await client.post(`/positions/${positionId}/promo-post`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_getPromoPosts",
		"Get generated promotional posts for a position",
		{
			positionId: z.string().uuid().describe("Position UUID"),
		},
		async ({ positionId }) => {
			const result = await client.get(`/positions/${positionId}/promo-post`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/scout/promo-posts.ts
git commit -m "feat: add scout promo post tools"
```

---

### Task 6: Create Scout pool and pool freelancer tools

**Files:**
- Create: `src/tools/scout/pool.ts`

- [ ] **Step 1: Create `src/tools/scout/pool.ts`**

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../../mellow-client"

export function registerScoutPoolTools(server: McpServer, client: MellowClient) {
	server.tool(
		"scout_getPool",
		"Get the current user's private freelancer pool",
		{},
		async () => {
			const result = await client.get("/private-pools/")
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_listPoolFreelancers",
		"List freelancers in a private pool with search, pagination and sorting",
		{
			poolId: z.string().uuid().describe("Pool UUID"),
			search: z.string().optional().describe("Search by name, email, or expertise area"),
			page: z.number().optional().describe("Page number (default: 1)"),
			limit: z.number().max(100).optional().describe("Items per page (max 100, default: 20)"),
			sortField: z.string().optional().describe("Sort field (default: createdAt)"),
			sortDirection: z.enum(["ASC", "DESC"]).optional().describe("Sort direction (default: DESC)"),
		},
		async ({ poolId, ...params }) => {
			const result = await client.get(`/private-pools/${poolId}/freelancers/`, {
				search: params.search,
				page: params.page?.toString(),
				limit: params.limit?.toString(),
				sortField: params.sortField,
				sortDirection: params.sortDirection,
			})
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_getPoolFreelancer",
		"Get details of a specific freelancer in a pool",
		{
			poolId: z.string().uuid().describe("Pool UUID"),
			freelancerId: z.string().uuid().describe("Freelancer UUID"),
		},
		async ({ poolId, freelancerId }) => {
			const result = await client.get(`/private-pools/${poolId}/freelancers/${freelancerId}`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_createPoolFreelancer",
		"Add a freelancer to a private pool",
		{
			poolId: z.string().uuid().describe("Pool UUID"),
			firstName: z.string().describe("First name"),
			lastName: z.string().describe("Last name"),
			email: z.string().email().describe("Email address"),
			expertiseArea: z.string().describe("Area of expertise"),
			experienceYears: z.number().min(0).describe("Years of experience (increments of 0.5)"),
			cvFileId: z.string().uuid().optional().describe("Uploaded CV attachment UUID"),
			notes: z.string().max(5000).optional().describe("Notes about the freelancer"),
			portfolioLinks: z.array(z.string().url()).max(4).optional().describe("Portfolio URLs (max 4)"),
			residenceCountry: z.string().optional().describe("ISO country code"),
		},
		async ({ poolId, ...body }) => {
			const result = await client.post(`/private-pools/${poolId}/freelancers/`, body)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_editPoolFreelancer",
		"Edit a freelancer in a private pool",
		{
			poolId: z.string().uuid().describe("Pool UUID"),
			freelancerId: z.string().uuid().describe("Freelancer UUID"),
			firstName: z.string().describe("First name"),
			lastName: z.string().describe("Last name"),
			email: z.string().email().describe("Email address"),
			expertiseArea: z.string().describe("Area of expertise"),
			experienceYears: z.number().min(0).describe("Years of experience (increments of 0.5)"),
			cvFileId: z.string().uuid().optional().describe("Uploaded CV attachment UUID"),
			notes: z.string().max(5000).optional().describe("Notes about the freelancer"),
			portfolioLinks: z.array(z.string().url()).max(4).optional().describe("Portfolio URLs (max 4)"),
			residenceCountry: z.string().optional().describe("ISO country code"),
		},
		async ({ poolId, freelancerId, ...body }) => {
			const result = await client.put(`/private-pools/${poolId}/freelancers/${freelancerId}`, body)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_deletePoolFreelancer",
		"Remove a freelancer from a private pool",
		{
			poolId: z.string().uuid().describe("Pool UUID"),
			freelancerId: z.string().uuid().describe("Freelancer UUID"),
		},
		async ({ poolId, freelancerId }) => {
			const result = await client.del(`/private-pools/${poolId}/freelancers/${freelancerId}`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_deletePoolFreelancersBatch",
		"Remove multiple freelancers from a private pool at once",
		{
			poolId: z.string().uuid().describe("Pool UUID"),
			ids: z.array(z.string().uuid()).describe("Array of freelancer UUIDs to delete"),
		},
		async ({ poolId, ids }) => {
			const result = await client.del(`/private-pools/${poolId}/freelancers/`, { ids })
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/scout/pool.ts
git commit -m "feat: add scout pool and pool freelancer tools"
```

---

### Task 7: Create Scout quiz tools

**Files:**
- Create: `src/tools/scout/quiz.ts`

- [ ] **Step 1: Create `src/tools/scout/quiz.ts`**

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../../mellow-client"

export function registerScoutQuizTools(server: McpServer, client: MellowClient) {
	server.tool(
		"scout_createQuizAnswer",
		"Submit an answer to a quiz associated with an AI task",
		{
			aiTaskId: z.string().uuid().describe("AI task UUID"),
			answer: z.number().describe("Quiz answer option (integer enum value)"),
		},
		async (params) => {
			const result = await client.post("/quiz/answers", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_linkQuizAnswerWithPosition",
		"Link a quiz answer to a position",
		{
			quizAnswerId: z.string().uuid().describe("Quiz answer UUID"),
			positionId: z.string().uuid().describe("Position UUID"),
		},
		async (params) => {
			const result = await client.post("/quiz/answers/link-with-position", params)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_getQuizSettings",
		"Get quiz settings for the current user",
		{},
		async () => {
			const result = await client.get("/quiz/settings")
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_disableQuiz",
		"Disable quiz for the current user",
		{},
		async () => {
			const result = await client.post("/quiz/settings/disable")
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/scout/quiz.ts
git commit -m "feat: add scout quiz tools"
```

---

### Task 8: Create Scout attachments, companies, and lookup tools

**Files:**
- Create: `src/tools/scout/attachments.ts`
- Create: `src/tools/scout/companies.ts`
- Create: `src/tools/scout/lookup.ts`

- [ ] **Step 1: Create `src/tools/scout/attachments.ts`**

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../../mellow-client"

export function registerScoutAttachmentTools(server: McpServer, client: MellowClient) {
	server.tool(
		"scout_getAttachmentMetadata",
		"Get metadata for an uploaded attachment (file name, type, size)",
		{
			id: z.string().uuid().describe("Attachment UUID"),
		},
		async ({ id }) => {
			const result = await client.get(`/attachments/${id}/metadata`)
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
```

- [ ] **Step 2: Create `src/tools/scout/companies.ts`**

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { MellowClient } from "../../mellow-client"

export function registerScoutCompanyTools(server: McpServer, client: MellowClient) {
	server.tool(
		"scout_listCompanies",
		"List all companies associated with the current user in AI Scout",
		{},
		async () => {
			const result = await client.get("/companies")
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
```

- [ ] **Step 3: Create `src/tools/scout/lookup.ts`**

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { MellowClient } from "../../mellow-client"

export function registerScoutLookupTools(server: McpServer, client: MellowClient) {
	server.tool(
		"scout_getCountries",
		"Get list of available countries with codes",
		{},
		async () => {
			const result = await client.get("/lookup/countries")
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)

	server.tool(
		"scout_getShortLink",
		"Get a short link by reference type and ID",
		{
			referenceType: z.string().describe("Reference type (e.g. POSITION)"),
			referenceId: z.string().uuid().describe("Reference UUID"),
		},
		async ({ referenceType, referenceId }) => {
			const result = await client.get("/short-link/", {
				referenceType,
				referenceId,
			})
			return { content: [{ text: JSON.stringify(result, null, 2), type: "text" as const }] }
		},
	)
}
```

- [ ] **Step 4: Commit**

```bash
git add src/tools/scout/attachments.ts src/tools/scout/companies.ts src/tools/scout/lookup.ts
git commit -m "feat: add scout attachment, company, and lookup tools"
```

---

### Task 9: Wire up Scout tools in index.ts

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add Scout imports to `src/index.ts`**

Add these imports after the existing tool imports:

```typescript
import { registerScoutAiTaskTools } from "./tools/scout/ai-tasks"
import { registerScoutApplicationTools } from "./tools/scout/applications"
import { registerScoutAttachmentTools } from "./tools/scout/attachments"
import { registerScoutCompanyTools } from "./tools/scout/companies"
import { registerScoutLookupTools } from "./tools/scout/lookup"
import { registerScoutPoolTools } from "./tools/scout/pool"
import { registerScoutPositionTools } from "./tools/scout/positions"
import { registerScoutPromoPostTools } from "./tools/scout/promo-posts"
import { registerScoutQuizTools } from "./tools/scout/quiz"
```

- [ ] **Step 2: Create Scout client and register tools in `init()`**

In the `init()` method, after the existing Mellow tool registrations, add:

```typescript
const scoutClient = createMellowClient(
    this.env.SCOUT_API_BASE_URL,
    this.props!.accessToken,
)

registerScoutPositionTools(this.server, scoutClient)
registerScoutApplicationTools(this.server, scoutClient)
registerScoutAiTaskTools(this.server, scoutClient)
registerScoutPromoPostTools(this.server, scoutClient)
registerScoutPoolTools(this.server, scoutClient)
registerScoutQuizTools(this.server, scoutClient)
registerScoutAttachmentTools(this.server, scoutClient)
registerScoutCompanyTools(this.server, scoutClient)
registerScoutLookupTools(this.server, scoutClient)
```

- [ ] **Step 3: Update server name**

Change the McpServer name to reflect both products:

```typescript
server = new McpServer({
    name: "Mellow MCP Server",
    version: "1.0.0",
})
```

Change to:

```typescript
server = new McpServer({
    name: "Mellow & Scout MCP Server",
    version: "1.1.0",
})
```

- [ ] **Step 4: Verify build**

Run: `npx wrangler deploy --dry-run`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat: wire up all scout tools in MCP server"
```

---

### Task 10: Smoke test locally

- [ ] **Step 1: Start dev server**

Run: `npx wrangler dev`
Expected: Server starts on port 8788 without errors.

- [ ] **Step 2: Verify all tools are registered**

Connect an MCP client (or use the MCP inspector) to `http://localhost:8788/mcp` and verify all 31 scout tools appear alongside the existing Mellow tools.

- [ ] **Step 3: Commit all remaining changes if any**

```bash
git add -A
git commit -m "chore: finalize scout tools integration"
```
