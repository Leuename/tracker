import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanup, hold, releaseHeld, useClient } from './db.js'

/**
 * Models `merge_app_config` as the migration actually defines it:
 *
 *   data = (data || (patch - 'settings'))
 *          || jsonb_build_object('settings', data->'settings' || patch->'settings')
 *
 * Top-level keys in the patch REPLACE their section; `settings` merges key by
 * key. Getting this wrong in the fake would make the tests agree with a
 * function that does not exist, so it is written from the SQL, not from memory.
 */
const fakeDb = (initial, faults = {}) => {
  let row = initial === null ? null : { data: structuredClone(initial) }
  return {
    row: () => row && row.data,
    // `readError` and `touched` exist because round 20 showed both guards could
    // be deleted with the suite green: a fake with no failure channel cannot
    // test what happens when the database says no.
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () =>
      (faults.readError ? { data: null, error: faults.readError } : { data: row, error: null }) }) }) }),
    rpc: async (name, { patch }) => {
      assert.equal(name, 'merge_app_config', 'writes must go through the merge function')
      if (faults.writeError) return { data: null, error: faults.writeError }
      if (faults.touched === 0) return { data: 0, error: null }
      const { settings: patchSettings, ...top } = patch
      row = { data: { ...row.data, ...top } }
      if (patchSettings) row.data.settings = { ...row.data.settings, ...patchSettings }
      return { data: 1, error: null }
    },
  }
}

const base = () => ({
  companies: ['GTOI', 'F5'],
  categories: ['Legal Services'],
  settings: { ackRequirePhoto: false, warnDuplicate: true, dashWindow: 'Next 30 days' },
})

test('a killed run gives back the value that was actually there', async () => {
  const c = fakeDb(base()); useClient(c)
  await hold(['settings.ackRequirePhoto'])
  c.row().settings.ackRequirePhoto = true          // the spec turns it on, then dies
  assert.deepEqual(await releaseHeld(), ['settings.ackRequirePhoto'])
  assert.equal(c.row().settings.ackRequirePhoto, false)
  assert.equal(c.row().settings.__e2eHeld, null, 'the marker is cleared')
})

// Finding 46: the version that forced documented defaults would turn this off.
test('an owner who deliberately turned a policy ON gets it back ON', async () => {
  const cfg = base(); cfg.settings.ackRequirePhoto = true
  const c = fakeDb(cfg); useClient(c)
  await hold(['settings.ackRequirePhoto'])
  c.row().settings.ackRequirePhoto = false
  await releaseHeld()
  assert.equal(c.row().settings.ackRequirePhoto, true, 'policy, not residue')
})

test('no marker means nothing is written at all', async () => {
  const c = fakeDb(base()); useClient(c)
  const before = structuredClone(c.row())
  assert.equal(await releaseHeld(), null)
  assert.deepEqual(c.row(), before)
})

// Finding 2 of round 19: settings alone could not give a company code back.
test('a top-level section is held and restored whole', async () => {
  const c = fakeDb(base()); useClient(c)
  await hold(['companies', 'categories'])
  c.row().companies = [...c.row().companies, 'E2E742']
  assert.deepEqual((await releaseHeld()).sort(), ['categories', 'companies'])
  assert.deepEqual(c.row().companies, ['GTOI', 'F5'], 'the stray code is gone')
})

test('two holds keep the value from the first, not one the suite already set', async () => {
  const c = fakeDb(base()); useClient(c)
  await hold(['settings.dashWindow'])
  c.row().settings.dashWindow = 'Next 7 days'
  await hold(['settings.dashWindow'])                 // a second spec, same key
  await releaseHeld()
  assert.equal(c.row().settings.dashWindow, 'Next 30 days')
})

test('holding several paths gives every one of them back', async () => {
  const c = fakeDb(base()); useClient(c)
  await hold(['settings.warnDuplicate', 'companies'])
  c.row().settings.warnDuplicate = false
  c.row().companies = []
  await releaseHeld()
  assert.equal(c.row().settings.warnDuplicate, true)
  assert.deepEqual(c.row().companies, ['GTOI', 'F5'])
})

// Finding 5 of round 19: recording absence as null would write null back, and
// `src/db.js` spreads the stored settings OVER the defaults — so a setting
// defaulting to true would come back false. Refusing is the only honest answer.
test('holding something not in the config throws instead of inventing null', async () => {
  const c = fakeDb(base()); useClient(c)
  await assert.rejects(() => hold(['settings.neverStored']), /not in the stored config/)
  await assert.rejects(() => hold(['notASection']), /not in the stored config/)
  assert.equal(c.row().settings.__e2eHeld, undefined, 'and nothing is marked')
})

test('the marker survives an unrelated settings save, the way the merge does', async () => {
  const c = fakeDb(base()); useClient(c)
  await hold(['settings.ackRequirePhoto'])
  await c.rpc('merge_app_config', { patch: { settings: { trkOverdueRed: true } } })
  assert.deepEqual(c.row().settings.__e2eHeld, { 'settings.ackRequirePhoto': false })
  await releaseHeld()
  assert.equal(c.row().settings.trkOverdueRed, true, 'the unrelated change is kept')
})

// Round 20, F3: `'settings' in cfg` is true, so this validated — and the
// release then wrote the settings object back over its own marker clear,
// re-arming the marker forever while REPORTING SUCCESS.
test('the settings section as a whole cannot be held', async () => {
  const c = fakeDb(base()); useClient(c)
  await assert.rejects(() => hold(['settings']), /not the whole settings section/)
  assert.equal(c.row().settings.__e2eHeld, undefined, 'and nothing is marked')
})

test('a top-level hold still clears the marker, rather than restoring it', async () => {
  const c = fakeDb(base()); useClient(c)
  await hold(['companies'])
  c.row().companies = ['E2E742']
  await releaseHeld()
  assert.equal(c.row().settings.__e2eHeld, null, 'the clear must survive the top-level patch')
  assert.deepEqual(c.row().companies, ['GTOI', 'F5'])
  assert.equal(await releaseHeld(), null, 'and a second release finds nothing to do')
})

// Round 20, F4: the read discarded `error`, so a transient 5xx or an expired
// token made this return null and the spec pass green — with the owner's
// setting left as the spec had set it and nothing reporting it.
test('a failed config read throws instead of silently doing nothing', async () => {
  // PostgREST rejects with a plain object, not an Error, and `throw error` is
  // what every other reader in `e2e/db.js` does — so assert the payload.
  useClient(fakeDb(base(), { readError: { message: 'JWT expired' } }))
  const isJwt = (e) => e.message === 'JWT expired'
  await assert.rejects(() => releaseHeld(), isJwt)
  await assert.rejects(() => hold(['settings.warnDuplicate']), isJwt)
})

test('a failed write throws rather than reporting the value given back', async () => {
  useClient(fakeDb(base(), { writeError: { message: 'permission denied' } }))
  await assert.rejects(() => hold(['settings.warnDuplicate']), (e) => e.message === 'permission denied')
})

// The `if (!touched) throw` guards: round 20 showed they could both be deleted
// with the suite green, because the fake always claimed one row written.
test('a merge that writes no row is an error, not a success', async () => {
  useClient(fakeDb(base(), { touched: 0 }))
  await assert.rejects(() => hold(['settings.warnDuplicate']), /wrote no row/)

  const c = fakeDb(base()); useClient(c)
  await hold(['settings.warnDuplicate'])
  useClient(fakeDb(c.row(), { touched: 0 }))
  await assert.rejects(() => releaseHeld(), /wrote no row/)
})

test('hold refuses when there is no config row at all', async () => {
  useClient(fakeDb(null))
  await assert.rejects(() => hold(['settings.warnDuplicate']), /no app_config row/)
  assert.equal(await releaseHeld(), null, 'and release simply finds nothing')
})


/**
 * A fake for the sweep. Models the two things that matter: a `delete` returns
 * the rows it removed, and the storage bucket holds files nobody asked it to
 * enumerate.
 */
const fakeSweep = (tables, bucket, faults = {}) => {
  const removed = []
  const order = []
  const rows = structuredClone(tables)
  const match = (table, column, pattern) => {
    const needle = pattern.replaceAll('%', '')
    return (rows[table] || []).filter((r) => String(r[column] ?? '').includes(needle))
  }
  return {
    removed: () => removed,
    left: () => rows,
    bucket: () => bucket,
    order: () => order,
    from: (table) => ({
      // A read, used to find the files BEFORE anything is deleted.
      select: () => ({
        like: async (column, pattern) => {
          if (faults.readError) return { data: null, error: faults.readError }
          return { data: match(table, column, pattern), error: null }
        },
      }),
      delete: () => ({
        like: (column, pattern) => {
          order.push('delete:' + table)
          const hit = match(table, column, pattern)
          rows[table] = (rows[table] || []).filter((r) => !hit.includes(r))
          return { select: async () => (faults.deleteError ? { data: null, error: faults.deleteError } : { data: hit, error: null }) }
        },
      }),
    }),
    storage: {
      from: () => ({
        remove: async (keys) => {
          order.push('remove')
          if (faults.removeError) return { data: null, error: faults.removeError }
          removed.push(...keys)
          for (const k of keys) delete bucket[k]
          return { data: keys, error: null }
        },
      }),
    },
  }
}

// The sweep used to list the whole bucket and delete every file NOT found in a
// `receipts` read — a read whose error it discarded, and which PostgREST caps
// at 1000 rows. A transient failure or a 1001st receipt meant deleting the
// owner's attachments. It now removes only files whose rows it just deleted.
test('the sweep removes only files belonging to rows it deleted', async () => {
  const c = fakeSweep({
    txns: [{ id: 1, description: 'E2E- one' }, { id: 2, description: 'the rent' }],
    recurring: [], transfers: [],
    receipts: [
      { name: 'E2E- receipt', file_path: 'e2e/tagged.png' },
      { name: 'Fuel, March', description: 'real', file_path: 'owner/keeps.png' },
    ],
  }, { 'e2e/tagged.png': 1, 'owner/keeps.png': 1, 'owner/unreferenced.png': 1 })
  useClient(c)

  const files = await cleanup('E2E-')
  assert.deepEqual(files, ['e2e/tagged.png'])
  assert.deepEqual(c.removed(), ['e2e/tagged.png'])
  assert.deepEqual(Object.keys(c.bucket()).sort(), ['owner/keeps.png', 'owner/unreferenced.png'],
    'a file the sweep deleted no row for is NOT its business')
  assert.deepEqual(c.left().txns.map((t) => t.id), [2], 'untagged rows are never swept')
  assert.deepEqual(c.left().receipts.map((r) => r.name), ['Fuel, March'])
})

test('a failed delete throws instead of sweeping on with a partial list', async () => {
  const c = fakeSweep({ txns: [], recurring: [], transfers: [], receipts: [] },
                      { 'owner/keeps.png': 1 }, { deleteError: { message: 'JWT expired' } })
  useClient(c)
  await assert.rejects(() => cleanup('E2E-'), (e) => e.message === 'JWT expired')
  assert.deepEqual(c.removed(), [], 'and nothing in the bucket is touched')
})

test('a failed storage remove is reported, not swallowed', async () => {
  const c = fakeSweep({ txns: [], recurring: [], transfers: [],
    receipts: [{ name: 'E2E- r', file_path: 'e2e/f.png' }] },
    { 'e2e/f.png': 1 }, { removeError: { message: 'storage down' } })
  useClient(c)
  await assert.rejects(() => cleanup('E2E-'), (e) => e.message === 'storage down')
})

test('a sweep with nothing to remove touches the bucket at all', async () => {
  const c = fakeSweep({ txns: [{ id: 1, description: 'the rent' }], recurring: [], transfers: [], receipts: [] },
                      { 'owner/keeps.png': 1 })
  useClient(c)
  assert.deepEqual(await cleanup('E2E-'), [])
  assert.deepEqual(Object.keys(c.bucket()), ['owner/keeps.png'])
})

// The ordering fix in `releaseHeld` is unreachable through `hold` now, because
// `hold` rejects the literal path 'settings'. It is load-bearing for exactly one
// case: a marker ALREADY wedged in the owner's config by the version that
// accepted it. Without this test the recovery could be deleted silently.
test('a marker wedged by the old code is released, not restored', async () => {
  const cfg = base()
  cfg.settings.__e2eHeld = { settings: { ackRequirePhoto: false, warnDuplicate: true } }
  cfg.settings.ackRequirePhoto = true          // as an interrupted run left it
  const c = fakeDb(cfg); useClient(c)

  assert.deepEqual(await releaseHeld(), ['settings'])
  assert.equal(c.row().settings.ackRequirePhoto, false, 'the held value comes back')
  assert.equal(c.row().settings.__e2eHeld, null,
    'and the marker is CLEARED — it used to restore itself here, forever')
  assert.equal(await releaseHeld(), null, 'so a second release finds nothing')
})

// Round 23: the sweep deleted rows first and removed their files afterwards, so
// a failed remove or a killed process orphaned those files PERMANENTLY — the
// rows that named them were gone. Reversed, a kill leaves the tagged rows in
// place and the next sweep finishes the job.
test('files are removed before the rows that name them', async () => {
  const c = fakeSweep({
    txns: [], recurring: [], transfers: [],
    receipts: [{ name: 'E2E- receipt', file_path: 'e2e/tagged.png' }],
  }, { 'e2e/tagged.png': 1, 'owner/keeps.png': 1 })
  useClient(c)
  await cleanup('E2E-')
  assert.equal(c.order()[0], 'remove', 'the storage remove comes first')
  assert.ok(c.order().includes('delete:receipts'), 'and the rows go after')
  assert.ok(c.order().indexOf('remove') < c.order().indexOf('delete:receipts'))
  assert.deepEqual(Object.keys(c.bucket()), ['owner/keeps.png'])
})

test('a failed remove leaves the rows in place for the next sweep to retry', async () => {
  const c = fakeSweep({ txns: [], recurring: [], transfers: [],
    receipts: [{ name: 'E2E- r', file_path: 'e2e/f.png' }] },
    { 'e2e/f.png': 1 }, { removeError: { message: 'storage down' } })
  useClient(c)
  await assert.rejects(() => cleanup('E2E-'), (e) => e.message === 'storage down')
  assert.deepEqual(c.left().receipts.map((r) => r.name), ['E2E- r'],
    'the row survives, still tagged, so the file is still findable')
})
