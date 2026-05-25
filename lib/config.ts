/** Shape of the response from GET /api/config. */
export interface AppConfig {
  couchdbUrl: string | null;
}

let configPromise: Promise<AppConfig> | null = null;

/**
 * Fetches runtime configuration from /api/config once and caches the result
 * for the lifetime of the page. Safe to call from any client-side module.
 *
 * Pure helper — exported for unit tests.
 */
export function getConfig(): Promise<AppConfig> {
  if (configPromise) return configPromise;
  configPromise = fetch("/api/config").then((res) => {
    if (!res.ok) throw new Error(`Failed to load config: ${res.status}`);
    return res.json() as Promise<AppConfig>;
  });
  return configPromise;
}

/** Test-only: reset the cached config promise. */
export function _resetConfigForTests(): void {
  configPromise = null;
}
