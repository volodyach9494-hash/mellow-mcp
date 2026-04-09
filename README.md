# Mellow & Scout MCP Server

Remote [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) server for **Mellow** and **AI Scout** products, deployed on Cloudflare Workers with Mellow OAuth.

## Architecture

The server acts as an OAuth proxy:
- **OAuth Server** to MCP clients (Claude, Cursor, etc.)
- **OAuth Client** to Mellow's auth service (`wlcm.mellow.io`)

Both products share the same auth flow and access token. The server creates two API clients — one for each product's base URL — and registers tools from both.

### Stack

- [Cloudflare Workers](https://developers.cloudflare.com/workers/) + Durable Objects
- [`workers-oauth-provider`](https://github.com/cloudflare/workers-oauth-provider) for OAuth 2.1
- [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/sdk) for MCP protocol
- [Hono](https://hono.dev/) for the OAuth callback handler
- [Zod](https://zod.dev/) for tool input validation

## Tools

### Mellow tools

| Module | Tools | Description |
|--------|-------|-------------|
| Tasks | listTasks, getTask, createTask, publishDraftTask, changeTaskStatus, changeDeadline, acceptTask, payForTask, quickPayTask, declineTask, resumeTask, getTaskMessages, addTaskMessage, addTaskFiles, checkTaskRequirements, getAllowedCurrencies, calculateTotalCost | Task lifecycle management |
| Task Groups | listTaskGroups, createTaskGroup, renameTaskGroup, deleteTaskGroup | Task organization |
| Freelancers | listFreelancers, getFreelancer, inviteFreelancer, findFreelancerByEmail, findFreelancerByPhone, editFreelancer, editFreelancerProfile, removeFreelancer, requestContactChangeCode, confirmContactChange, getVerificationLink, acceptOfferAgreement, getFreelancerTaxInfo, addTaxpayerId, linkTaxNumber, changeTaxationStatus | Freelancer management |
| Finances | createPayout, getPayoutStatus, listTransactions, getPaymentMethods, addBankCard, addBankAccount, addEWallet, deleteBankCard, deleteBankAccount, deleteEWallet, requestPaymentMethodCode | Payments and transactions |
| Companies | listCompanies, switchCompany, getCompanyBalance | Company management |
| Documents | listDocuments, downloadDocument | Document access |
| Profile | getUserProfile, changeLanguage | User profile |
| Reference | getCurrencies, getExchangeRate, getTaxStatuses, getTaskCategories, getServices, getTaskAttributes, getAcceptanceDocuments, getTaxDocumentTypes, getSpecializations, getCountries | Lookups and reference data |
| Webhooks | getWebhook, createOrUpdateWebhook, deleteWebhook | Webhook configuration |
| ChatGPT | search, fetch | Cross-entity search (tasks + freelancers) |

### AI Scout tools (prefixed with `scout_`)

| Module | Tools | Description |
|--------|-------|-------------|
| Positions | scout_listPositions, scout_getPosition, scout_createPosition, scout_updatePosition, scout_closePosition, scout_openPosition, scout_sharePosition | Hiring position management |
| Applications | scout_listApplications, scout_listPositionApplications, scout_getApplication, scout_changeApplicationStatus, scout_inviteApplicant | Application tracking |
| AI Tasks | scout_generatePosition, scout_getGeneratePositionTask | AI-powered position generation |
| Promo Posts | scout_createPromoPosts, scout_getPromoPosts | Social media promo generation |
| Pool | scout_getPool, scout_listPoolFreelancers, scout_getPoolFreelancer, scout_createPoolFreelancer, scout_editPoolFreelancer, scout_deletePoolFreelancer, scout_deletePoolFreelancersBatch | Private freelancer pool |
| Quiz | scout_createQuizAnswer, scout_linkQuizAnswerWithPosition, scout_getQuizSettings, scout_disableQuiz | Candidate quiz |
| Attachments | scout_getAttachmentMetadata | File metadata |
| Companies | scout_listCompanies | Company listing |
| Lookup | scout_getCountries, scout_getShortLink | Reference data and short links |

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

Configured in `wrangler.jsonc`:

| Variable | Value |
|----------|-------|
| `MELLOW_API_BASE_URL` | `https://my.mellow.io/api` |
| `MELLOW_BASE_URL` | `https://wlcm.mellow.io` |
| `SCOUT_API_BASE_URL` | `https://aiscout-api.mellow.io/api` |

### KV namespace

The OAuth KV namespace is already configured in `wrangler.jsonc`. If setting up fresh:

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

### Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector@latest
```

Enter `http://localhost:8788/sse` and connect. After the OAuth flow, all tools should be listed.

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
