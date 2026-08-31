// Constants and seed rows, transcribed verbatim from
// company_tracker/ERP Prototype.dc.html (<script type="text/x-dc">).
// The prototype freezes "now" so its overdue/completed sample reads the same on
// every run. Keep it a knob: swap for new Date().toISOString().slice(0,10) once
// this is backed by real records rather than the demo seed.
export const TODAY = '2026-08-30'

export const CO = ['GTOI', 'VAR', 'VER', 'ANG', 'DNN', 'ZON', 'WDO', 'BSC', 'HAL', 'VNQ', 'OPT', 'FEPA', 'SHK', 'TOR', 'ZSM', 'GZZ', 'MIC', 'CUPA', 'BAR', 'MCR', 'ZPH']

export const CAT = ['Accounting Services', 'Legal Services', 'Rental Expense', 'Withholding Taxes', 'Alan Expense', 'Jack Expense', 'Salary & Wages', 'Petty Cash Fund', 'General Expense', 'Credit card', 'Consultancy Fee', 'Advertising Expense', 'Other']

export const TAG = {
  completed: { bg: '#DFF0E6', fg: '#5C8F72', label: 'Completed' },
  pending: { bg: '#F9EFDC', fg: '#BE8A38', label: 'Pending' },
  overdue: { bg: '#FADCE6', fg: '#C4566E', label: 'Overdue' },
  hold: { bg: '#F1E7EC', fg: '#8B7079', label: 'On hold' },
  released: { bg: '#EEE4F4', fg: '#7A5C93', label: 'Released' },
  liquidated: { bg: '#DFF0E6', fg: '#5C8F72', label: 'Liquidated' },
}

export const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export const FREQ = ['Once', 'Daily', 'Weekly', 'Bi-weekly', 'Bi-monthly', 'Monthly', 'Quarterly', 'Yearly']

// A Daily rule would otherwise write a row for every day of the month.
export const MAX_OCC = 6

export const PERIOD_PRESETS = ['Aug 2026', 'Sep 2026', 'Jul 2026', 'Jul–Sep 2026', 'Oct–Dec 2026']

export const SETTINGS_TABS = [
  { k: 'masterlist', label: 'Masterlist settings', title: 'Masterlist settings', sub: 'the lists behind every dropdown, and how recurring payables behave' },
  { k: 'ackrec', label: 'AckRec settings', title: 'AckRec settings', sub: 'how acknowledgement receipts are released and liquidated' },
  { k: 'tracker', label: 'Tracker settings', title: 'Tracker settings', sub: 'defaults for the payables sheet' },
  { k: 'dashboard', label: 'Dashboard settings', title: 'Dashboard settings', sub: 'what the landing screen opens with' },
]

const txns = [
  { id: 1, co: 'GTOI', cat: 'Rental Expense', desc: 'Warehouse B monthly rent', period: 'Aug 2026', due: '2026-08-24', amount: 45000, status: 'pending', done: '' },
  { id: 2, co: 'GTOI', cat: 'Accounting Services', desc: 'Monthly bookkeeping retainer', period: 'Aug 2026', due: '2026-09-05', amount: 30000, status: 'pending', done: '' },
  { id: 3, co: 'GTOI', cat: 'Salary & Wages', desc: 'Semi-monthly payroll, 2nd half', period: 'Aug 2026', due: '2026-08-30', amount: 210000, status: 'completed', done: '2026-08-29' },
  { id: 4, co: 'GTOI', cat: 'Credit card', desc: 'Corporate card settlement', period: 'Jul 2026', due: '2026-09-12', amount: 88400, status: 'hold', done: '' },
  { id: 5, co: 'GTOI', cat: 'Withholding Taxes', desc: 'BIR 1601-C remittance', period: 'Aug 2026', due: '2026-08-20', amount: 18200, status: 'pending', done: '' },
  { id: 6, co: 'GTOI', cat: 'Petty Cash Fund', desc: 'Replenishment — admin', period: 'Aug 2026', due: '2026-09-01', amount: 8000, status: 'pending', done: '' },
  { id: 7, co: 'GTOI', cat: 'Consultancy Fee', desc: 'IT retainer — 3rd quarter', period: 'Jul–Sep 2026', due: '2026-09-20', amount: 75000, status: 'pending', done: '' },
  { id: 8, co: 'ZON', cat: 'Salary & Wages', desc: 'Payroll, 2nd half of August', period: 'Aug 2026', due: '2026-09-04', amount: 210000, status: 'pending', done: '' },
  { id: 9, co: 'ZON', cat: 'Jack Expense', desc: 'Site visit reimbursements', period: 'Aug 2026', due: '2026-09-02', amount: 24000, status: 'hold', done: '' },
  { id: 10, co: 'ZON', cat: 'General Expense', desc: 'Office supplies restock', period: 'Aug 2026', due: '2026-08-26', amount: 9400, status: 'completed', done: '2026-08-26' },
  { id: 11, co: 'VAR', cat: 'Withholding Taxes', desc: 'BIR 1601-C remittance', period: 'Jul 2026', due: '2026-08-28', amount: 18200, status: 'pending', done: '' },
  { id: 12, co: 'VAR', cat: 'Rental Expense', desc: 'Sales office lease', period: 'Aug 2026', due: '2026-09-01', amount: 52000, status: 'pending', done: '' },
  { id: 13, co: 'BSC', cat: 'Accounting Services', desc: 'Monthly bookkeeping retainer', period: 'Aug 2026', due: '2026-09-05', amount: 30000, status: 'pending', done: '' },
  { id: 14, co: 'BSC', cat: 'Rental Expense', desc: 'Head office lease', period: 'Aug 2026', due: '2026-09-01', amount: 62000, status: 'pending', done: '' },
  { id: 15, co: 'FEPA', cat: 'Consultancy Fee', desc: 'IT retainer — 3rd quarter', period: 'Jul–Sep 2026', due: '2026-09-20', amount: 75000, status: 'pending', done: '' },
  { id: 16, co: 'DNN', cat: 'Alan Expense', desc: 'Field allowance — August', period: 'Aug 2026', due: '2026-08-29', amount: 12500, status: 'pending', done: '' },
  { id: 17, co: 'ZSM', cat: 'Petty Cash Fund', desc: 'Replenishment — warehouse', period: 'Aug 2026', due: '2026-08-29', amount: 8000, status: 'pending', done: '' },
  { id: 18, co: 'MIC', cat: 'General Expense', desc: 'Utilities and internet', period: 'Aug 2026', due: '2026-08-27', amount: 6400, status: 'pending', done: '' },
  { id: 19, co: 'MCR', cat: 'Advertising Expense', desc: 'Regional campaign placement', period: 'Aug 2026', due: '2026-09-15', amount: 99000, status: 'pending', done: '' },
  { id: 20, co: 'FEPA', cat: 'Legal Services', desc: 'Contract review retainer', period: 'Aug 2026', due: '2026-08-31', amount: 61000, status: 'completed', done: '2026-08-28' },
]

const receipts = [
  { id: 1, co: 'GTOI', name: 'Nicholas Gordon', desc: 'Site inspection cash advance', amount: 25000, status: 'liquidated', date: '2026-08-22', actual: 23400 },
  { id: 2, co: 'ZON', name: 'Maria Lansang', desc: 'Client meeting expenses', amount: 12000, status: 'liquidated', date: '2026-08-18', actual: 13850 },
  { id: 3, co: 'VAR', name: 'Jack Rivera', desc: 'Permit filing fees', amount: 40000, status: 'released', date: '', actual: null },
  { id: 4, co: 'BSC', name: 'Alan Mercado', desc: 'Equipment purchase advance', amount: 85000, status: 'released', date: '', actual: null },
  { id: 5, co: 'MCR', name: 'Grace Bautista', desc: 'Travel — Cebu branch visit', amount: 18000, status: 'pending', date: '', actual: null },
  { id: 6, co: 'FEPA', name: 'Ramon Cruz', desc: 'Advertising placement deposit', amount: 30000, status: 'hold', date: '', actual: null },
]

const recurring = [
  { id: 1, co: 'GTOI', cat: 'Rental Expense', freq: 'Monthly', desc: 'Warehouse B monthly rent', dueDate: '2026-08-24', amount: 45000 },
  { id: 2, co: 'GTOI', cat: 'Accounting Services', freq: 'Monthly', desc: 'Bookkeeping retainer', dueDate: '2026-09-05', amount: 30000 },
  { id: 3, co: 'ZON', cat: 'Salary & Wages', freq: 'Bi-monthly', desc: 'Payroll, 15th and end of month', dueDate: '2026-08-15', amount: 210000 },
  { id: 4, co: 'VAR', cat: 'Withholding Taxes', freq: 'Monthly', desc: 'BIR 1601-C remittance', dueDate: '2026-08-10', amount: 18200 },
  { id: 5, co: 'FEPA', cat: 'Consultancy Fee', freq: 'Quarterly', desc: 'IT retainer', dueDate: '2026-09-20', amount: 75000 },
  { id: 6, co: 'BSC', cat: 'Rental Expense', freq: 'Monthly', desc: 'Head office lease', dueDate: '2026-09-01', amount: 62000 },
]

export const blankForm = () => ({ co: '', cat: '', desc: '', period: 'Aug 2026', due: TODAY, amount: '', status: 'pending', notes: '' })

export const initialState = {
  screen: 'dashboard',
  scope: 'All companies',
  txns,
  receipts,
  recurring,
  notes: [
    { t: 'Follow up BIR receipt — GTOI', done: false, linked: true },
    { t: 'Ask ZON for the signed lease copy', done: false, linked: false },
    { t: 'Reconcile petty cash for August', done: true, linked: false },
  ],
  noteDraft: '',
  companies: CO.slice(),
  categories: CAT.slice(),
  coDraft: '',
  catDraft: '',
  coFilter: 'All companies',
  catFilter: 'All categories',
  statuses: { pending: true, overdue: true, completed: false, hold: false },
  filtersOpen: false,
  settingsMenuOpen: false,
  settingsTab: 'masterlist',
  settings: {
    autoGen: true, warnDuplicate: true, mlDefaultFreq: 'Monthly',
    ackRequirePhoto: true, ackAutoNotify: false, ackDefaultStatus: 'Pending',
    trkShowGrandTotal: true, trkGroupDefault: 'Company', trkOverdueRed: true,
    dashDefaultScope: 'All companies', dashWindow: 'Next 30 days', dashShowNotes: true,
  },
  groupBy: 'company',
  collapsed: {},
  search: '',
  periodOpen: null,
  periodRange: false,
  periodFrom: TODAY.slice(0, 7),
  periodTo: '2026-09',
  periodFromDay: '',
  periodToDay: '',
  addOpen: false,
  form: null,
  formError: '',
  editOpen: false,
  editId: null,
  edit: null,
  editOrig: null,
  payOpen: false,
  payId: null,
  payFor: 'row',
  payPrev: 'pending',
  payType: 'Cash',
  payCheck: '',
  payErr: false,
  liqOpen: false,
  liqId: null,
  liqDate: TODAY,
  liqAmount: '',
  liqErr: false,
  recOpen: false,
  rec: { co: '', cat: '', desc: '', freq: 'Monthly', dueDate: TODAY, amount: '' },
  bannerOpen: false,
  bannerText: '',
  generatedIds: [],
  genMonth: TODAY.slice(0, 7),
  genMenuOpen: false,
  toast: '',
}
