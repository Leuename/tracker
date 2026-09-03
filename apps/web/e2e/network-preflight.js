/**
 * Fail fast when the deployment under test cannot serve, before 29 specs do it
 * slowly and confusingly.
 *
 * Three uncached GETs, run before any browser starts. The cache-buster is why
 * they are uncached in practice rather than only by header: a CDN that ignores
 * `cache-control` still has to treat a unique query string as a distinct URL.
 *
 * ## Why status is checked and not just the absence of a throw
 *
 * `fetch` resolves for 4xx and 5xx — it rejects only on a transport failure.
 * The first version of this file awaited the three requests and looked no
 * further, so a deployment answering `503` on every request cleared the gate
 * and the suite failed twenty-nine times instead of once, which is the exact
 * outcome the preflight exists to prevent. A typo in `E2E_BASE_URL` answering
 * `404` sailed through the same way. Assert the response, not the absence of
 * an error — the same rule this project applies to a refused policy.
 *
 * ## Why the classifications are distinct
 *
 * `NETWORK_PREFLIGHT_SLOW` means the deployment did not answer in time. A
 * refusal, a bad status and a malformed URL are different faults with different
 * fixes, and calling all of them "slow" sends the next person to look at the
 * network when the answer is a wrong environment variable. They get their own
 * labels.
 */
const PREFLIGHT_TIMEOUT_MS = 30_000
const PROBES = 3

export const SLOW = 'NETWORK_PREFLIGHT_SLOW'
export const UNREACHABLE = 'NETWORK_PREFLIGHT_UNREACHABLE'
export const BAD_STATUS = 'NETWORK_PREFLIGHT_BAD_STATUS'
export const BAD_URL = 'NETWORK_PREFLIGHT_BAD_URL'

/**
 * Probe `baseURL` three times and throw a classified error if it cannot serve.
 *
 * `fetchImpl` is injectable so the failure paths can be tested without a
 * network or a deployment — the negative cases are the whole point of this
 * file, and they are the ones a live run never exercises.
 */
export async function preflight(baseURL, fetchImpl = fetch) {
  let target
  try {
    target = new URL(baseURL)
  } catch {
    // Not a network fault. Almost always E2E_BASE_URL set to something that is
    // not a URL, so say that rather than blaming the deployment.
    throw new Error(`${BAD_URL}: ${baseURL} is not a valid URL. Check E2E_BASE_URL.`)
  }

  const responses = await Promise.all(Array.from({ length: PROBES }, async (_, index) => {
    const url = new URL(target)
    url.searchParams.set('__playwright_preflight', `${Date.now()}-${index}`)
    try {
      return await fetchImpl(url, {
        cache: 'no-store',
        headers: { 'cache-control': 'no-cache' },
        signal: AbortSignal.timeout(PREFLIGHT_TIMEOUT_MS),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      // AbortSignal.timeout rejects with a TimeoutError; everything else that
      // throws here is a transport failure — DNS, refused, TLS.
      const timedOut = (error && error.name === 'TimeoutError') || /timeout|timed out/i.test(message)
      throw new Error(timedOut
        ? `${SLOW}: ${baseURL} did not answer within ${PREFLIGHT_TIMEOUT_MS} ms.`
        : `${UNREACHABLE}: ${baseURL} could not be reached — ${message}`)
    }
  }))

  // The check the original omitted. A deployment that answers is not a
  // deployment that works.
  const bad = responses.find((r) => !r.ok)
  if (bad) {
    throw new Error(`${BAD_STATUS}: ${baseURL} answered HTTP ${bad.status}. ` +
      'The deployment is reachable but not serving; running the suite against it would ' +
      'fail every spec for one reason.')
  }
}

export default async function globalSetup(config) {
  // Resolved config: Playwright has already merged the top-level `use` into
  // every project, so the first project carries the effective baseURL.
  await preflight(config.projects[0].use.baseURL)
}
