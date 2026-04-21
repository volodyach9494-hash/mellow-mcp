# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install deps
- `npm run dev` / `npx wrangler dev` — run locally on `http://localhost:8788` (requires `.dev.vars`)
- `npm run type-check` — `tsc --noEmit`, primary correctness check (no test suite exists)
- `npm run cf-typegen` — regenerate `worker-configuration.d.ts` from `wrangler.jsonc` bindings
- `npm run deploy` / `npx wrangler deploy` — deploy to Cloudflare
- `npx wrangler secret put <NAME>` — set `MELLOW_CLIENT_ID`, `MELLOW_CLIENT_SECRET`, `COOKIE_ENCRYPTION_KEY`
- `npx @modelcontextprotocol/inspector@latest` — manual smoke test; connect to `http://localhost:8788/sse`

## Architecture

Single-Worker MCP server deployed on Cloudflare Workers. Acts as an OAuth proxy: exposes OAuth 2.1 to MCP clients while delegating user auth to Mellow (`wlcm.mellow.io`). The same Mellow access token is used against two product APIs — **Mellow** (`my.mellow.io`) and **AI Scout** (`aiscout-api.mellow.io`) — via two separately-constructed clients inside one `McpAgent`.

### Request flow

1. `src/index.ts` exports `OAuthProvider` (from `@cloudflare/workers-oauth-provider`) as the Worker entrypoint. It routes `/mcp` to `MyMCP.serve`, and `/authorize` + `/callback` + `/register` + `/token` to `MellowHandler`.
2. `src/mellow-handler.ts` (Hono app) renders the approval dialog, redirects to Mellow's `/authorize`, then handles `/callback` — exchanging the code for an access token, fetching `/userinfo`, and completing authorization with `OAUTH_PROVIDER.completeAuthorization`. User identity + upstream tokens are stored as **`props`** in the issued MCP token.
3. When an MCP client calls a tool, `MyMCP.init()` runs with `this.props.accessToken` available. It constructs two `MellowClient`s (one per base URL) and calls every `register*Tools(server, client)` function.
4. Refresh: `OAuthProvider.tokenExchangeCallback` in `src/index.ts` intercepts `refresh_token` grants, calls `refreshUpstreamToken`, and rotates the stored `accessToken`/`refreshToken` in `props` transparently.

### Durable Object + KV

- `MyMCP` is registered as a SQLite-backed Durable Object (`durable_objects.bindings` in `wrangler.jsonc`, migration tag `v1`). Each MCP session gets its own DO instance; access token lives in `props`, not in the DO itself.
- `OAUTH_KV` stores OAuth state tokens, approved-client cookies, and session bindings. The namespace ID in `wrangler.jsonc` is the live production one — do not change without a `wrangler kv namespace create`.

### Tool registration pattern

Every module under `src/tools/` and `src/tools/scout/` exports one `registerXxxTools(server, client)` function that calls `server.tool(name, description, zodSchema, handler)`. Mellow tools use unprefixed names; Scout tools are prefixed `scout_`. Adding a tool = add a `server.tool(...)` call in the right module; wiring in `src/index.ts` is only needed when creating a **new module**.

### Mellow API client

`src/mellow-client.ts` is intentionally thin: a closure over `{baseUrl, accessToken}` returning `{get, post, put, patch, del}`. It throws on non-2xx with the response body included — tool handlers let errors propagate and the MCP SDK surfaces them to the client. Query string filters for list endpoints use the bracketed form `filter[key]=value` (see `src/tools/tasks.ts` for the canonical example) — match this when adding new list tools.

### OAuth security model

`src/workers-oauth-utils.ts` implements:
- **CSRF**: double-submit cookie on the approval form
- **State binding**: `createOAuthState` stores the `AuthRequest` in KV keyed by a random token; `bindStateToSession` sets a `__Host-CONSENTED_STATE` cookie; `validateOAuthState` on `/callback` requires both KV lookup **and** cookie match. This defeats state-token injection where an attacker substitutes their own state into a victim's flow.
- **Approved clients**: once a user consents for a `clientId`, an encrypted cookie skips the approval dialog on subsequent authorizations.

Do not loosen these checks without understanding the injection attack they prevent.

## Conventions

- Tabs for indentation (see `.prettierrc` — `useTabs: false` is contradicted by the actual codebase; keep tabs to match existing files).
- No test framework is configured. `npm run type-check` is the only automated gate.
- `worker-configuration.d.ts` is generated — never hand-edit. Regenerate after changing bindings or vars in `wrangler.jsonc`.
- `Props` type in `src/utils.ts` is the contract between `MellowHandler` and `MyMCP`; adding a field requires updating both.
- Secrets (`MELLOW_CLIENT_ID`, `MELLOW_CLIENT_SECRET`, `COOKIE_ENCRYPTION_KEY`) live in Wrangler secrets in prod and `.dev.vars` locally — never in `wrangler.jsonc`.
