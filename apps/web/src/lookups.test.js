// Run with: npm test  (node --test, no framework)
//
// A ratchet, not a behaviour test.
//
// `obj[key]` finds `Object.prototype` members, and those are **truthy**, so they
// defeat every `|| fallback` written after them. That single fact has produced a
// finding in three consecutive rounds:
//
//   32  `TAG[r.status]` threw out of render and blanked the application
//   34  `curFmt` printed a function's source beside the amount on the transfer
//       sheet, a hole it had carried since it was written
//   35  the status filter PASSED a row it was meant to hold, and the receipt
//       form seeded itself with a function
//
// Each round fixed the sites it was pointed at, and the next round found one it
// was not. The behaviour of the guard is pinned in `logic.test.js`; what this
// file pins is that no NEW raw lookup appears. It is the check that would have
// caught rounds 33, 34 and 35 before they were written.
//
// When this fails you have two honest options: route the new lookup through
// `own`, or — if the key genuinely cannot come from outside the code — add it to
// `ALLOWED` with a reason. Deleting the test is not one of them.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SRC = new URL('.', import.meta.url).pathname

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f)
  return statSync(p).isDirectory() ? walk(p)
    : (/\.jsx?$/.test(f) && !/\.test\.js$/.test(f) ? [p] : [])
})

/**
 * Lookups that are safe because the key cannot come from outside the code.
 * Each entry is `file:snippet` and every one carries the reason it is here.
 */
const ALLOWED = [
  // The guard itself.
  ['logic.js', 'obj[key] : undefined'],
  // Numeric indices into a fixed twelve-element month table.
  ['logic.js', 'MON[+m.slice(5, 7) - 1]'],
  ['logic.js', 'MON[+p[1] - 1]'],
  ['logic.js', 'MON[Number(p[1]) - 1]'],
  ['data.js', 'MON[Number(key.slice(5, 7)) - 1]'],
  // Iterating an object's OWN keys: `Object.keys` never yields an inherited one.
  ['logic.js', 'st.statuses[k]'],
  ['rows.js', 'prev[key]'],
  ['rows.js', 'next[key]'],
  ['rows.js', 'patch[key]'],
  ['rows.js', 's[k]'],
  ['rows.js', 'next.settings[key]'],
  ['db.js', 'patch[k]'],
  // Keys that are literals in this codebase, not data: field names a caller
  // passes, and the fixed lists behind the settings and filter chrome.
  ['masterlist.js', 'next[k]'],
  ['actions.js', 'statuses[key] = true'],
  ['actions.js', 's.statuses[k]'],
  ['Filters.jsx', 'state.statuses[s.k]'],
  ['Settings.jsx', 'ROWS[tab.k]'],
  ['Settings.jsx', 'state.settings[r.k]'],
  ['AddReceipt.jsx', 'r[k]'],
  ['AddTransfer.jsx', 'w[k]'],
  ['AddTransaction.jsx', 'f[k]'],
  // Array indices.
  ['pending.js', 'page[page.length - 1][key]'],
  ['ui.jsx', 'openModals[openModals.length - 1]'],
  ['actions.js', 's.notes[i].t'],
  // WRITES to a fresh object, not lookups. Assigning `c['constructor'] = true`
  // creates an own property; it cannot read an inherited one.
  ['actions.js', 'statuses[k] = true'],
  ['Tracker.jsx', 'c[k] = true'],
  // A numeric month index into the same fixed twelve-element table.
  ['Dashboard.jsx', 'MON[+p[1] - 1]'],
]

const allowed = (file, line) =>
  ALLOWED.some(([f, snippet]) => file.endsWith(f) && line.includes(snippet))

test('no raw bracket lookup on data the database does not constrain', () => {
  // An identifier indexed by something that is not a plain number.
  // Matches an identifier OR a closing paren before the bracket. The paren case
  // is not hypothetical: `((symbols || {})[cur] || '')` is exactly what `curFmt`
  // carried, and an identifier-only matcher would have missed the very finding
  // that motivated this file.
  const LOOKUP = /(?:\)|(?<![.\w])(?:[A-Za-z_$][A-Za-z0-9_$]*)(?:\.[A-Za-z0-9_$]+)*)\[(?![0-9'"`\]])[^\]]+\]/

  const offenders = []
  for (const file of walk(SRC)) {
    const src = readFileSync(file, 'utf8')
    src.split('\n').forEach((line, i) => {
      const code = line.trim()
      if (!code || code.startsWith('//') || code.startsWith('*') || code.startsWith('/*')) return
      if (!LOOKUP.test(code)) return
      // Destructuring, array literals and assignments to a computed key are not
      // lookups. `own(...)` is the guard, so a line that uses it is the fix.
      if (/^(const|let|var)\s*\[/.test(code) || /own\(/.test(code)) return
      if (/\[[A-Za-z0-9_$.]+\]\s*:/.test(code)) return
      if (allowed(file, code)) return
      offenders.push(`${file.replace(SRC, '')}: ${code.slice(0, 100)}`)
    })
  }

  assert.deepEqual(offenders, [],
    'route these through `own(obj, key)`, or add them to ALLOWED with a reason:\n  ' +
    offenders.join('\n  '))
})

test('the ratchet can actually fail', () => {
  // TRAP 104: a pin that cannot fail reads as coverage. This proves the matcher
  // recognises the shape it exists to catch, without needing a real offender in
  // the tree.
  // Matches an identifier OR a closing paren before the bracket. The paren case
  // is not hypothetical: `((symbols || {})[cur] || '')` is exactly what `curFmt`
  // carried, and an identifier-only matcher would have missed the very finding
  // that motivated this file.
  const LOOKUP = /(?:\)|(?<![.\w])(?:[A-Za-z_$][A-Za-z0-9_$]*)(?:\.[A-Za-z0-9_$]+)*)\[(?![0-9'"`\]])[^\]]+\]/
  for (const bad of [
    'const sym = CSYM[w.cur] || \'\'',
    'const tag = TAG[r.status]',
    'if (!st.statuses[eff(t)]) return false',
    'status: ACK_STATUS[s.settings.ackDefaultStatus] || \'pending\'',
    'const open = !state.collapsed[name]',
    // The shape an identifier-only matcher misses, and the one `curFmt` had.
    "const sym = ((symbols || {})[cur] || '')",
    'const live = (rates || {})[w && w.cur]',
  ]) {
    assert.ok(LOOKUP.test(bad), 'must flag: ' + bad)
  }
  for (const fine of [
    'const sym = own(CSYM, w.cur)',
    'const first = rows[0]',
    'const m = MON[3]',
    "const x = obj['literal']",
  ]) {
    assert.ok(!LOOKUP.test(fine) || /own\(/.test(fine), 'must not flag: ' + fine)
  }
})
