/**
 * Centralized, server-side access to environment variables.
 *
 * This module reads `process.env` and must be imported ONLY from server-side
 * code (Route Handlers, Server Components, or server services). Browser code
 * must never import it so that `OPENROUTER_API_KEY` is never exposed to the
 * client or bundled into browser JS.
 */
export const env = {
  /** OpenRouter API key. Server-side secret — never expose to the browser. */
  get openRouterApiKey(): string | undefined {
    return process.env.OPENROUTER_API_KEY;
  },
  /** OpenRouter model slug (e.g. "openrouter/free" or a "…:free" model). */
  get openRouterModel(): string | undefined {
    return process.env.OPENROUTER_MODEL;
  },
} as const;
