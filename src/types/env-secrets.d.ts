/**
 * Secret bindings declared via `wrangler secret put`. Wrangler's `cf-typegen`
 * does not include secrets in the generated `worker-configuration.d.ts`, so we
 * augment the Env interface here to keep the source code typed.
 *
 * Set these in production via:
 *   npx wrangler secret put MELLOW_CLIENT_ID
 *   npx wrangler secret put MELLOW_CLIENT_SECRET
 *   npx wrangler secret put COOKIE_ENCRYPTION_KEY
 *
 * For local development, set them in `.dev.vars`.
 */
declare namespace Cloudflare {
  interface Env {
    MELLOW_CLIENT_ID: string;
    MELLOW_CLIENT_SECRET: string;
    COOKIE_ENCRYPTION_KEY: string;
  }
}
