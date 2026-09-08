import { configPatch } from './rows.js'

/**
 * The config row's write decisions, kept where a test can reach them.
 *
 * `app_config` is one shared row and four people edit it, so what goes to the
 * database is a DIFF against what this tab last saved rather than the whole
 * config. That makes the baseline — what we believe the row holds — the single
 * piece of state everything else depends on, and it is the piece that has been
 * wrong three rounds running:
 *
 *   - Round 28: a refused write left the baseline advanced, so the next diff
 *     was computed against a value the database never received and the refused
 *     change was dropped for good.
 *   - Round 29: rolling the baseline back closed a feedback loop through the
 *     failure toast — 79 writes and 79 toasts from one toggle in 500ms.
 *   - Round 30: the rollback still lost the change, because the patch was
 *     computed when the effect ran and frozen in a debounce closure. Rolling
 *     the baseline back 600ms later changed nothing about what was already
 *     decided to send. **The patch is therefore computed at SEND time, here.**
 *
 * All three lived in `store.jsx`, which is React and which nothing offline
 * imports, so every one of them could be reintroduced with the suite green —
 * and round 30 proved that by reverting the lot and watching 201 tests pass.
 * This module exists so that stops being true. `store.jsx` keeps only the
 * debounce and the effect wiring; every decision about what to send and what
 * the baseline becomes is here.
 */
export const createConfigSync = ({ write }) => {
  let baseline = null

  return {
    /** What the row held when the page loaded. No write, no diff. */
    seed(next) { baseline = next },

    /** What the baseline currently claims the database holds. */
    current() { return baseline },

    /**
     * Is there anything to send? Used by the effect to decide whether to arm a
     * debounce at all. Never trust it as the patch — by the time the timer
     * fires the baseline may have moved, which is the whole of round 30.
     */
    pending(next) { return baseline === null ? null : configPatch(baseline, next) },

    /**
     * Send, if there is still something to send.
     *
     * Returns the write's promise so the caller can report a failure, or `null`
     * when the diff has already been covered by another write. The promise
     * rejects on failure **after** restoring the baseline, so the caller's
     * error handling and the rollback do not race.
     */
    send(next) {
      if (baseline === null) { baseline = next; return null }
      const patch = configPatch(baseline, next)
      if (!patch) return null
      const prev = baseline
      baseline = next
      return Promise.resolve(write(patch)).catch((e) => {
        // Unconditional. Guarding this on the baseline still equalling what we
        // sent skipped exactly the case it was written for — a refusal that
        // overlaps a later edit. Re-sending a value the row already holds is a
        // no-op merge (`data = data || patch`), so the next diff being a
        // superset costs an audit row and nothing else.
        baseline = prev
        throw e
      })
    },
  }
}
