/**
 * The debounced-write registry, extracted so it can be tested.
 *
 * It used to live inside `actions.js`, where it was module-private to a React
 * hook and reachable only through the browser. That mattered: three separate
 * defects have been cancellation bugs in this registry — a delete that left a
 * push armed (D59), a clear that left a retracted value armed (D67) — and round
 * 15 proved the last fix could be deleted with the whole suite still green.
 *
 * Keys carry the table name because ids are `Date.now()` and two tables can
 * mint the same millisecond; a bare id would let one row's pending write cancel
 * an unrelated row's.
 */
export const DELAY = 500

export const keyOf = (table, id) => table + ':' + id
export const pushKey = (id, field) => 'push:' + id + ':' + field

/** Create a registry. One per module in the app; one per test in the suite. */
export function createPending(setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout) {
  const timers = new Map()

  const arm = (key, run) => {
    clearTimeoutFn(timers.get(key))
    timers.set(key, setTimeoutFn(() => {
      timers.delete(key)
      run()
    }, DELAY))
  }

  const cancel = (key) => {
    clearTimeoutFn(timers.get(key))
    timers.delete(key)
  }

  return {
    /** One row write per row, coalesced. */
    queueRow: (table, row, save, write, what) =>
      arm(keyOf(table, row.id), () => save(write(row), what)),

    /** The same coalescing for a write that is not one row. */
    queueCall: (key, run) => arm(key, run),

    cancelRow: (table, id) => cancel(keyOf(table, id)),

    /** One armed push-down, by payable and field. */
    cancelPush: (id, field) => cancel(pushKey(id, field)),

    /**
     * Everything armed for one masterlist row: its own write and every
     * push-down. Prefix-scanned rather than tracked separately, because a
     * second structure kept in step with this map is the failure it exists to
     * prevent. The trailing colon is load-bearing — without it `push:5:` would
     * also match `push:50:amount`.
     */
    cancelForRecurring: (id) => {
      cancel(keyOf('recurring', id))
      const prefix = pushKey(id, '')
      for (const key of [...timers.keys()]) if (key.startsWith(prefix)) cancel(key)
    },

    /** Test seam: which keys are armed right now. */
    armed: () => [...timers.keys()].sort(),
  }
}

/**
 * Read every row a paged source will give, keyset-style.
 *
 * `fetchPage(cursor)` returns one page; the loop stops on a short page and
 * otherwise carries the last row's `id` forward as the cursor. Split out from
 * `db.js` so it can be tested without a database — it replaced working code,
 * every ledger read goes through it, and it had no coverage at all until now.
 *
 * `key` names the column the cursor rides on — `id` for every ledger table, but
 * `profiles` is keyed by `user_id`, and a caller that paged on a column the rows
 * do not have would carry `undefined` forward and re-read page one forever.
 *
 * Keyset, not offset. `range(from, …)` re-counts from the start on every page,
 * so a row inserted between two pages shifts everything after it: one row comes
 * back twice, another is never seen, and an exact count still matches. A cursor
 * names a position rather than a distance, so it is immune.
 */
export const pageAll = async (fetchPage, size, key = 'id') => {
  const rows = []
  let cursor = null
  for (;;) {
    const page = (await fetchPage(cursor)) || []
    rows.push(...page)
    if (page.length < size) return rows
    const next = page[page.length - 1][key]
    // A full page whose last row carries no cursor value cannot advance: the
    // next request repeats this one, forever, reading the same page and growing
    // `rows` without bound. That is what paging `profiles` on `id` did before
    // `key` existed. Fail loudly instead of hanging — a backup or a restore plan
    // is the caller.
    if (next === undefined || next === null) {
      throw new Error('pageAll: no "' + key + '" on the last row of a full page, so the cursor cannot advance')
    }
    cursor = next
  }
}
