import type { APIRequestContext } from "@playwright/test";

/**
 * Per-request bound for cleanup DELETEs, well below the 60s test timeout.
 * Healthy deletes complete in well under a second; this only kicks in when
 * the dev server is saturated by parallel workers.
 */
const CLEANUP_DELETE_TIMEOUT_MS = 5_000;

/**
 * Best-effort cleanup DELETE.
 *
 * Cleanup runs after a test's functional assertions have already passed or
 * failed. Under multi-worker server saturation a DELETE can stall long enough
 * to consume the entire test timeout, turning an otherwise-passing test into a
 * failure. Bound each cleanup DELETE with a short timeout and treat it as
 * best-effort: if it does not complete, log and move on instead of failing the
 * test.
 *
 * Skipping a cleanup DELETE never breaks isolation: the Playwright data
 * directory is reset between runs (e2e/start-servers.mjs), and tests seed
 * uniquely-named entities, so a leaked record cannot collide with or be counted
 * by a later test.
 */
export async function bestEffortDelete(request: APIRequestContext, url: string): Promise<void> {
  try {
    await request.delete(url, { timeout: CLEANUP_DELETE_TIMEOUT_MS });
  } catch (error) {
    console.warn(`[cleanup] best-effort DELETE ${url} did not complete:`, error);
  }
}
