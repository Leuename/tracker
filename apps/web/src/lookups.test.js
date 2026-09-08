// Run with: npm test  (node --test, no framework)
//
// A ratchet, and the THIRD belt — not the guarantee.
//
// `obj[key]` finds `Object.prototype` members, and those are truthy, so they
// defeat every `|| fallback` written after them. That produced a finding in five
// consecutive rounds (32-36), each time in whichever site the previous round had
// not been pointed at.
//
// The guarantee is now `bare()` in `data.js`: every constant this app indexes by
// row data is built with `Object.create(null)`, so there is no prototype to
// inherit from and the lookup is safe **however it is spelled**. `own()` is the
// second belt. This file is the third: it keeps NEW raw lookups from appearing
// on maps that might not be bare.
//
// **What it cannot catch, stated plainly rather than discovered later.** Round 36
// defeated an earlier version of this file with each of these, and a regex over
// source text can always be out-written:
//
//   - a lookup split across two lines            `(rates || {})\n  [cur]`
//   - `Reflect.get(TAG, r.status)`               no brackets at all
//   - `` TAG[`${r.status}`] ``                   template-literal key
//   - `const { [key]: v } = TAG`                 destructured computed key
//
// Those are the reason `bare()` exists. Do not treat a green run here as proof
// that the class is closed — the proof is in `logic.test.js`, which asserts the
// maps have no prototype and that every one of those spellings returns
// `undefined`. Optional chaining and the allowlist holes ARE fixed below.
//
// When this fails: route the lookup through `own`, or — if the key cannot come
// from outside the code — add it to `ALLOWED` with a reason. Deleting it is not
// one of the options.
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
/**
 * An identifier, a dot-chain, or a closing paren — optionally followed by `?.` —
 * indexed by something that is not a plain number or a quoted literal.
 *
 * Defined ONCE. The previous version wrote this literal twice, so the self-test
 * below could validate a pattern the real check no longer used (round 36).
 */
export const LOOKUP =
  /(?:\)|(?<![.\w])(?:[A-Za-z_$][A-Za-z0-9_$]*)(?:\.[A-Za-z0-9_$]+)*)(?:\?\.)?\[(?![0-9'"`\]])[^\]]+\]/

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
  // `settings` and `patch` are `bare()` accumulators now, so a `__proto__` key
  // creates an own property instead of hitting the prototype's accessor and
  // vanishing. Round 38 — the WRITE half of the class.
  ['rows.js', 'settings[key] = next.settings[key]'],
  ['rows.js', 'patch[key] = next[key]'],
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

/**
 * Strip the allowed lookups out of a line, then judge what is left.
 *
 * The previous version skipped the WHOLE line on any allowed substring match, so
 * appending `const rogue = TAG[prev.status]` to an already-allowed line walked
 * straight through — round 36 proved it live. An allowance covers the snippet it
 * names, not everything that shares a line with it.
 */
const withoutAllowed = (file, line) =>
  ALLOWED.reduce((acc, [f, snippet]) =>
    (file.endsWith(f) ? acc.split(snippet).join(' ') : acc), line)

test('no raw bracket lookup on data the database does not constrain', () => {
  // An identifier indexed by something that is not a plain number.

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
      const rest = withoutAllowed(file, code)
      if (!LOOKUP.test(rest)) return
      offenders.push(`${file.replace(SRC, '')}: ${code.slice(0, 100)}`)
    })
  }

  assert.deepEqual(offenders, [],
    'route these through `own(obj, key)`, or add them to ALLOWED with a reason:\n  ' +
    offenders.join('\n  '))
})

test('the ratchet can actually fail, on the shapes it claims to catch', () => {
  // TRAP 104: a pin that cannot fail reads as coverage. This exercises the SAME
  // exported `LOOKUP` the real check uses — the previous version duplicated the
  // literal, so the two could drift and this would keep passing against a
  // pattern that was no longer in use (round 36).
  for (const bad of [
    "const sym = CSYM[w.cur] || ''",
    'const tag = TAG[r.status]',
    'if (!st.statuses[eff(t)]) return false',
    "status: ACK_STATUS[s.settings.ackDefaultStatus] || 'pending'",
    'const open = !state.collapsed[name]',
    // The parenthesised shape `curFmt` carried for thirty-three rounds.
    "const sym = ((symbols || {})[cur] || '')",
    'const live = (rates || {})[w && w.cur]',
    // Optional chaining, which defeated the previous matcher (round 36).
    'const live = rates?.[w && w.cur]',
    'const t = TAG?.[r.status]',
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

  // An allowance covers its own snippet, never the rest of the line. Round 36
  // smuggled a fresh `TAG[prev.status]` onto an already-allowed line and the
  // whole line was skipped.
  const line = "if (!same(prev[key], next[key])) patch[key] = next[key]; const rogue = TAG[prev.status]"
  const stripped = ['prev[key]', 'next[key]', 'patch[key] = next[key]']
    .reduce((acc, sn) => acc.split(sn).join(' '), line)
  assert.ok(LOOKUP.test(stripped), 'a smuggled lookup must survive the allowance strip')
})
