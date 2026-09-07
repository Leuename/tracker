/**
 * The two writes that can reach many ledger rows at once, built where a test
 * can watch them.
 *
 * `src/db.js` imports the live Supabase client at module load, so nothing
 * offline can import it — which meant the filters below had **no coverage at
 * all**. Both could be deleted with the whole suite green, turning a masterlist
 * keystroke into an unfiltered `UPDATE` across every row in the shared ledger.
 *
 * These take `from` rather than reaching for the client, so `queries.test.js`
 * can pass a recorder and assert on the filters themselves. `db.js` supplies
 * the real one. Nothing here talks to the network; the caller awaits the
 * builder these return.
 */

/**
 * Push a masterlist change onto the payable's linked open rows.
 *
 * Three filters and every one is load-bearing:
 *
 * - `eq('src', src)` chooses the rows **in the write**. Filtering this tab's
 *   snapshot instead missed any linked row another session created after the
 *   page loaded, while the toast still claimed the rows had been updated.
 * - `neq('status', 'completed')` is the same guard the client could not make
 *   honestly: a row another session has since paid is still `pending` in this
 *   tab's snapshot, and a keystroke would have overwritten a settled amount.
 * - `select('id')` returns what was actually written, so the count in the toast
 *   is true and the screen repaints exactly the rows the ledger changed.
 */
export const pushDownTxns = (from, patch, src) =>
  from('txns').update(patch)
    .eq('src', src)
    .neq('status', 'completed')
    .select('id')

/**
 * Undo a generate: remove the rows it created, and only those.
 *
 * `neq('status','completed')` and `is('done', null)` are belt and braces on
 * purpose. Undo promises in its own toast to keep anything already paid, and
 * a row can carry a payment date without this tab knowing its status changed.
 */
export const deleteGeneratedTxns = (from, ids) =>
  from('txns').delete()
    .in('id', ids)
    .neq('status', 'completed')
    .is('done', null)
    .select('id')
