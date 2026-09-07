// Inline SVGs lifted from the prototype; stroke inherits currentColor.
const svg = (props, children) => (
  <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={props.w || 1.7} strokeLinecap="round" strokeLinejoin="round"
       aria-hidden="true">{children}</svg>
)

export const IconDashboard = (p) => svg(p, <>
  <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
  <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
  <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
  <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
</>)

export const IconTracker = (p) => svg(p, <>
  <path d="M4 6h16" /><path d="M4 12h11" /><path d="M4 18h7" />
</>)

export const IconAck = (p) => svg(p, <>
  <path d="M5 3h14v18l-3.5-2-3.5 2-3.5-2L5 21z" /><path d="M9 8h6" /><path d="M9 12h6" />
</>)

// The paper-plane the design uses for outbound wires.
export const IconTelegraphic = (p) => svg(p, <>
  <path d="M3 11l18-7-7 18-2.5-8z" />
</>)

export const IconMaster = (p) => svg(p, <>
  <path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" />
</>)

export const IconSettings = (p) => svg(p, <>
  <circle cx="12" cy="12" r="3.2" />
  <path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-2.9 1.2V22a2 2 0 11-4 0v-.1a1.7 1.7 0 00-2.9-1.2l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.7 1.7 0 002 15a2 2 0 010-4 1.7 1.7 0 001.51-2.87l-.06-.06A2 2 0 116.28 5.2l.06.06A1.7 1.7 0 009.3 4.1V4a2 2 0 114 0v.1a1.7 1.7 0 002.9 1.2l.06-.06a2 2 0 112.83 2.83l-.06.06A1.7 1.7 0 0022 11a2 2 0 010 4z" />
</>)

export const IconChevronRight = (p) => svg({ ...p, w: 2.2 }, <path d="M9 5l7 7-7 7" />)
export const IconChevronDown = (p) => svg({ ...p, w: 2.4 }, <path d="M5 9l7 7 7-7" />)
export const IconFilter = (p) => svg({ ...p, w: 1.9 }, <>
  <path d="M4 6h16" /><path d="M7 12h10" /><path d="M10 18h4" />
</>)
// The up/down arrow pair the Sort control uses, and the tray-arrow for Export.
export const IconSort = (p) => svg({ ...p, w: 1.9 }, <>
  <path d="M7 4v16" /><path d="M4 8l3-4 3 4" />
  <path d="M17 20V4" /><path d="M14 16l3 4 3-4" />
</>)
export const IconExport = (p) => svg({ ...p, w: 1.9 }, <>
  <path d="M12 4v11" /><path d="M8 11l4 4 4-4" /><path d="M4 19h16" />
</>)
export const IconPencil = (p) => svg({ ...p, w: 2 }, <>
  <path d="M4 20h4l10-10-4-4L4 16v4z" /><path d="M14 6l4 4" />
</>)

export const IconCheckCircle = (p) => svg({ ...p, w: 2 }, <>
  <circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.6 2.5L16 9.5" />
</>)
export const IconTrash = (p) => svg({ ...p, w: 1.9 }, <>
  <path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M6.5 7l.9 13h9.2l.9-13" />
  <path d="M10 11v6" /><path d="M14 11v6" />
</>)

export const IconSignOut = (p) => svg(p, <>
  <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h11" />
</>)
