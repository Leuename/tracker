import { CSYM } from '../data.js'
import { symbolOf } from '../logic.js'
import { Field } from '../ui.jsx'

/**
 * The peso rate a wire is valued at, on both transfer forms.
 *
 * Editable on purpose. Six of the nine wires on the sheet when this shipped were
 * released at some bank's real rate rather than at the ECB's reference fix, and
 * the person entering one is the only one who knows what it actually cost. The
 * fetched rate is a good default, not an authority.
 *
 * The hint under it is the whole point of the feature. A number with no
 * provenance is what this replaced: five constants, no date, no source, running
 * 7% to 15% low. So the field always says where its number came from —
 * the ECB and which day, or that it is a hand-entered figure, or that nothing
 * is priced and the totals are falling back to constants.
 */
export default function RateField({ w, cur, onChange, live }) {
  const rate = w.rate == null ? '' : String(w.rate)
  const fed = live && live.rate != null ? String(live.rate) : ''

  const hint = !rate
    ? 'no rate — totals fall back to constants'
    : rate === fed && w.rate_as_of
      ? 'ECB ' + w.rate_as_of
      : 'entered by hand'

  return (
    <Field label={'Rate — ₱ per ' + (symbolOf(cur, CSYM) || cur)} hint={hint}>
      <input
        className="field num"
        inputMode="decimal"
        placeholder={fed || 'no rate available'}
        value={rate}
        onChange={onChange}
      />
    </Field>
  )
}
