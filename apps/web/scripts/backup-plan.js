export const KEY = {
  txns: 'id', receipts: 'id', recurring: 'id', transfers: 'id',
  audit_log: 'id', app_config: 'id', profiles: 'user_id',
}

export const keyFor = (table) => {
  if (KEY[table]) return KEY[table]
  if (table === 'fx_rates') return null
  throw new Error('backup: no paging key for ' + table + '. Add one to KEY, or justify offset paging for it.')
}

export const planPage = (table, { cursor = null, from = 0, page = 1000 } = {}) => {
  const key = keyFor(table)
  if (key) return { mode: 'keyset', key, order: [{ column: key, ascending: true }], cursor, gt: cursor, limit: page }
  return { mode: 'range', order: [{ column: 'as_of', ascending: true }, { column: 'cur', ascending: true }], from, to: from + page - 1 }
}

export const nextCursor = (rows, key, cursor = null) => {
  if (!rows.length) return null
  let previous = cursor
  for (const row of rows) {
    const value = row[key]
    if (value === undefined || (previous !== null && !(value > previous))) {
      throw new Error('backup: paging cursor did not advance')
    }
    previous = value
  }
  return previous
}
