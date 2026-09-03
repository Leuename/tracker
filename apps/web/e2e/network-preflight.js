const PREFLIGHT_TIMEOUT_MS = 30_000

export async function preflight(baseURL, fetchImpl = fetch) {
  try {
    await Promise.all(Array.from({ length: 3 }, (_, index) => {
      const url = new URL(baseURL)
      url.searchParams.set('__playwright_preflight', `${Date.now()}-${index}`)
      return fetchImpl(url, {
        cache: 'no-store',
        headers: { 'cache-control': 'no-cache' },
        signal: AbortSignal.timeout(PREFLIGHT_TIMEOUT_MS),
      })
    }))
  } catch (error) {
    throw new Error(`NETWORK_PREFLIGHT_SLOW: ${error instanceof Error ? error.message : error}`)
  }
}

export default async function globalSetup(config) {
  await preflight(config.projects[0].use.baseURL)
}
