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

/**
 * How long a push-down waits, as against an ordinary row save.
 *
 * The masterlist's own row write is a keystroke debounce: 500ms of quiet means
 * "they have stopped typing", and the worst case if that is wrong is the row
 * saves twice. A push-down is not that. It rewrites the amount on EVERY linked
 * open Tracker row — real money, in a ledger four people share — and 500ms of
 * quiet is a think-pause, not a decision.
 *
 * Round 45: type `1`, pause 600ms, finish `1250`, then clear the field because
 * the payable has no amount yet. The push for `1` had already gone out, the
 * retract could not recall it, and no compensating write is possible because a
 * blank is unpushable and the rows' previous amounts are gone. The payable ended
 * at "not decided" while the ledger said `1`, and the toast said the rows had
 * been "updated to match".
 *
 * Longer, so an ordinary hesitation stays inside the window and the retract
 * still works. Not a cure — only an explicit commit would be — which is why
 * `applyMasterlistEdit` also reports when a retract arrived too late.
 */
export const PUSH_DELAY = 2500

/** Create a registry. One per module in the app; one per test in the suite. */
export function createPending(setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout) {
  const timers = new Map()
  // Keys whose write actually CHANGED ROWS.
  //
  // Round 45 recorded this when the timer fired, which only means the callback
  // ran. Round 46 showed what that costs: with no linked rows the push writes
  // nothing, and if Postgres refuses it the write fails outright — yet both
  // reported "the rows were already updated", and because `flash` is a single
  // slot that warning ERASED the genuine error and told the person to go correct
  // rows that were never touched. Following that instruction is itself a wrong
  // money write.
  //
  // So the caller reports it, after the write comes back and only when it
  // changed something.
  //
  // **Only `forget` clears it, and only once the warning has been delivered.**
  // Round 46 wrote that `arm` cleared it too, and round 47 showed what that
  // cost: arming the NEXT push does not un-write the rows the last one already
  // wrote. One more keystroke between the write and the clear — type 1250,
  // pause, correct it to 1300, then empty the field — and the warning that the
  // ledger holds 1250 was silently dropped. Neither `arm` nor `cancel` may
  // touch this: what the rows hold is a fact about the database, not about the
  // timer.
  const wrote = new Set()

  const arm = (key, run, delay = DELAY) => {
    clearTimeoutFn(timers.get(key))
    timers.set(key, setTimeoutFn(() => {
      timers.delete(key)
      run()
    }, delay))
  }

  const cancel = (key) => {
    clearTimeoutFn(timers.get(key))
    timers.delete(key)
  }

  /** Forget that a key ever wrote, once its warning has been delivered. */
  const forget = (key) => wrote.delete(key)

  return {
    /** One row write per row, coalesced. */
    queueRow: (table, row, save, write, what) =>
      arm(keyOf(table, row.id), () => save(write(row), what)),

    /** The same coalescing for a write that is not one row. */
    queueCall: (key, run, delay) => arm(key, run, delay),

    /**
     * Is a write still armed under this key?
     *
     * `cancel` can only stop a timer that has not fired. Once `arm`'s callback
     * has run, a retract is a no-op against an `UPDATE` already on its way — and
     * for the masterlist push-down that meant a think-pause between two digits
     * wrote a transient amount to every linked open Tracker row and left it
     * there. The caller needs to know the difference, because "cancelled" and
     * "too late, and the ledger now disagrees with the screen" are not the same
     * outcome. Round 45.
     */
    isArmed: (key) => timers.has(key),

    /** Did the push for this row and field actually change any rows? */
    pushWrote: (id, field) => wrote.has(pushKey(id, field)),

    /** The caller says so, after the write returns and only if it changed rows. */
    notePushWrote: (id, field) => wrote.add(pushKey(id, field)),

    /** One warning per push, not one per subsequent keystroke. */
    forgetPushWrote: (id, field) => forget(pushKey(id, field)),

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
