---
title: Papa Tracker Design Brief
tags: [papa, construction, design, ui, ux, brief]
created: 2026-09-24
status: draft. Input for the Claude Design session. Every pattern below is read from the shipped ERP app, with its file cited.
related:
  - "[[PRD]]"
  - "[[App Flows]]"
  - "[[Data Model]]"
  - "[[Claude Design Prompt]]"
---

# Papa Tracker Design Brief

## 0. Rule for this brief

Nothing here is new design. Each item is either:

- **Observed**: taken from the running ERP app, with the file that proves it.
- **Mapped**: a Papa screen assigned to an existing pattern.
- **Open**: a gap the sheet or the owner has not settled. Designers must show these as marked placeholders, not decide them.

Trap 77 from the design-port handoff applies: a prototype shows what a screen looks like, never what was asked for. The requirements live in [[PRD]], not in the pictures.

## 1. Sources of truth

| Source | Path | Use |
|---|---|---|
| Shipped styles | `apps/web/src/styles.css` | Palette, components, layout. **Wins over every other source** |
| Tokens | `apps/web/src/tokens/spacing.css`, `typography.css` | Spacing rhythm, radii, type scale |
| Status tags | `apps/web/src/data.js` `TAG` | The only status colors in the app |
| Screens | `apps/web/src/screens/*.jsx` | Layout and toolbar order per screen |
| Dialog behavior | `apps/web/src/ui.jsx` | Escape and backdrop rules |
| Original prototype | `company_tracker/ERP Prototype.dc.html` | The export the ERP app was transcribed from |
| Design system | `company_tracker/_ds/craftui-crm-design-system-*/` | CraftUI CRM kit, includes the `zone-crm` UI kit (Dashboard, Pipeline, Contacts screens) |
| Papa spec | `construction_tracker/construction.csv` | Identical to the `papa` sheet tab |

## 2. Design system, as shipped

### 2.1 Color (observed, `styles.css :root`)

The app uses the prototype's own plum palette, not the CraftUI kit's green palette.

| Token | Value | Role |
|---|---|---|
| `--ink` | `#2A1A22` | Primary text |
| `--ink-mid` | `#5A4550` | Secondary text in pills |
| `--muted` | `#8B7079` | Labels, subtitles, hints |
| `--muted-2` | `#9A8891` | Menu notes, rules |
| `--faint` | `#B79FA9` | Optional markers, carets |
| `--accent` | `#A8577B` | Primary buttons, links, active states |
| `--accent-dark` | `#7E3F5C` | Nav rail background, primary hover |
| `--accent-wash` | `#F7E9F0` | Group headers, selected menu items, banners |
| `--page` | `#FDF7FA` | Page canvas |
| `--surface` | `#FFFFFF` | Cards, sheets, fields |
| `--sunken` | `#FCF5F8` | Sheet headers, footers, strips, sunken fields |
| `--border` | `#EFDCE4` | All borders |
| `--border-soft` | `#F5E7EE` | Row dividers |
| `--danger` | `#C4566E` | Overdue, required, destructive |

### 2.2 Status tags (observed, `data.js TAG`)

| Key | Background | Text | Label |
|---|---|---|---|
| completed | `#DFF0E6` | `#5C8F72` | Completed |
| pending | `#F9EFDC` | `#BE8A38` | Pending |
| overdue | `#FADCE6` | `#C4566E` | Overdue |
| hold | `#F1E7EC` | `#8B7079` | On hold |
| released | `#EEE4F4` | `#7A5C93` | Released |
| cancelled | `#EDEAEB` | `#9A8A90` | Cancelled |

Tag shape: `.tag`, radius 11px, padding 3px 9px, 11px semibold.

### 2.3 Type (observed)

- Font renders as **Inter** (`--font-ui` in `styles.css`). `typography.css` says Lato in a comment, but the app never loads Lato. Use Inter.
- Topbar title 22px bold. Modal title 19px bold. Card title 16px bold. Body 13 to 13.5px. Labels 12px muted. Eyebrow 11px, weight 800, uppercase, tracking .11em. Sheet header 10.5px, weight 800, uppercase, tracking .06em.

### 2.4 Spacing and shape (observed, `spacing.css`)

- 7px base rhythm: 7 / 14 / 21 / 28. Screen gutter is 28px.
- Radii: inputs 10px, buttons and tags 11px, tiles and menus 13px, cards and modals 16px.

### 2.5 Money and dates (observed, `logic.js`)

- `fmt`: `₱` plus whole pesos with en-US grouping, for example `₱45,000`. Compact form `₱1.25M`, `₱45K`.
- Dates are Manila calendar days. Dashboard subtitle reads "as of 30 August 2026".
- Amount columns are right-aligned (`.right`, `.field.num`).

## 3. App shell (observed, `App.jsx`, `styles.css`)

| Part | Pattern |
|---|---|
| Nav rail | Left, 84px wide, `--accent-dark` background. Logo tile on top. Items are icon plus a 9.5px label. Active item has a white 18% wash. Settings sits below the items and opens a 212px flyout with sub-pages. Sign out is the last rail item |
| Topbar | 76px, white, bottom border. Order: `h1` title, muted subtitle, flexible spacer, search field, menu buttons (Sort, Filters with count badge, Export), primary `+ Add ...` button last |
| Background | Photo (`assets/tracker-background.jpg`) under a 70% page-color wash, inside the signed-in app only. Sign-in screen uses the plain canvas |
| Dialogs | Scrim shows the photo under a dark tint. Modal is a frosted white pane, 80% wash |
| Filters | Right-side drawer, 312px, live screen visible behind a light tint |
| Feedback | Toast bottom center, dark ink. Viewer accounts get a permanent small "viewing only" pill at the bottom, not repeated toasts |
| Responsive | **None.** `styles.css` has no media queries. The ERP app is desktop-only |

## 4. Component inventory (observed class names)

| Class | What it is | Where used |
|---|---|---|
| `.tiles` / `.tile` | 5-column grid of clickable KPI tiles: eyebrow, 24px value, count line | Dashboard |
| `.card` | White panel, 16px radius, 21px padding | Dashboard columns, Settings |
| `.deadline` + `.chip-date` | Date chip (month and day) with title and sub line. Red border when overdue | Upcoming deadlines |
| `.sheet`, `.sheet-head`, `.sheet-row` | Grid table with sticky uppercase header and hover rows | Tracker, AckRec, Masterlist, Telegraphic |
| `.group-head` | Collapsible group row in accent-wash with name, meta count, subtotal | Tracker grouping by company or category |
| `.sheet-foot` | Sunken footer with shown count and grand total | Tracker |
| `.strip` | Sunken summary band under the topbar | AckRec outstanding totals |
| `.sync-bar` | Green or amber status line with dot and action | Tracker, Masterlist link |
| `.banner` | Accent-wash notice with Review and Undo | Masterlist Generate |
| `.inline-field` | Edit-in-place input inside a sheet row | Masterlist recurring payables |
| `.choice` | Radio-style option cards | Payment method dialog |
| `.dashed` | Dashed drop zone for a receipt photo or PDF | Liquidate dialog |
| `.period-trigger` / `.period-pop` | Month or date-range picker with a range toggle | Add and edit transaction |
| `.menu` | Dropdown with eyebrow, options, rule, accent action | Sort, Export, Generate |
| `.chip` | Removable list item | Settings list editors |
| `.split-btn` | Button with a dropdown cap | Masterlist Generate |
| `.empty` | Centered muted message with a link to clear filters | Every sheet |

## 5. Interaction rules (observed, must carry over)

1. Clicking the backdrop never closes a form. Escape closes the innermost dialog only (`ui.jsx`).
2. The space bar never opens a row (`Telegraphic.jsx`, `AckRec.jsx`, `Tracker.jsx`).
3. Add dialogs offer **Save & add another** beside Save.
4. Computed values are shown, never typed. Example: the Liquidate dialog works out the difference for you.
5. Status values the system decides are not offered in dropdowns. Example: "Overdue isn't on the list, the system marks that for you."
6. Required fields carry a red `required` marker. Optional fields carry a faint `optional` marker.
7. Tiles and dashboard rows open the destination screen already filtered.
8. Subtitles are lowercase explanatory phrases. Example: "the payables that repeat, and the lists behind every dropdown".

## 6. Papa screens mapped to existing patterns

Field labels are exactly the ones in the `papa` sheet.

| Papa screen | Built from | Notes |
|---|---|---|
| Rail | Same rail. Items: Dashboard, Projects, Cash Flow, Attendance, Payroll, Payables, Materials, Masterlist. Settings flyout | Eight items where the ERP has five. See Open O6 |
| Dashboard | Topbar "Dashboard / as of ...". **Tiles** row for Daily Cash Flow Summary (Beginning Balance, Total Cash In, Total Cash Out, Ending Balance). **Dash-cols** cards: Projects (count by status plus active list), Payables (deadline rows by due date), Debts (creditor name and balance) | Four tiles, not five |
| Projects | Zone CRM **Pipeline** screen from the design system kit: columns by Project Status, one card per project. Detail opens as a modal with the project fields and read-only computed totals | Pattern exists in the kit, not yet in the ERP app. See Open O1 |
| Cash Flow | **Strip** for the read-only daily summary. **Sheet** of entries grouped by date with **group-head** subtotals. **Sheet-foot** grand totals. Add dialog uses **choice** cards for Cash In or Cash Out, then Date, Project, Category, Description, amount, Remarks, receipt **dashed** zone | Summary block is marked read-only in the sheet |
| Attendance | Topbar holds Date and Project selectors. **Sheet** rows per worker with **inline-field** Time In and Time Out, computed hours, Remarks | Worker Name and Position fill from the masterlist |
| Payroll | Topbar holds **period-trigger** (date range) and Project. **Sheet** columns: Worker Name, Position, Rate per day, Days/Hrs Worked, Gross Pay, Cash Vale, Other Deductions, Net Pay, Payment Status (tag). Row action "Mark as paid" like the Tracker | Gross formula pending, see O2 |
| Payables | **Sheet** grouped by Debt Type or Creditor (**group-head**, same toggle as Tracker grouping). Record-payment dialog modeled on **Liquidate**: required date and amount, receipt drop zone, computed balance | Payables and Debts shown as one list, see O3 |
| Materials | **Sheet** plus add dialog. Fields: Project, Date Requested, Materials, Qty, Unit, Unit Cost, Total Cost (computed), Supplier, Status, Receipt | Status values missing, see O4 |
| Masterlist | **Sheet** with **inline-field** editing, same as Recurring payables. Fields: Worker Name, Position, Daily Rate, Project Assigned, Start Date, Status, Phone Number | |
| Settings | **Flyout** sub-pages with **chip** list editors: Project Status, Expense Categories, Income Categories, Worker Positions, Debt Types | |

## 7. Open items for the designer (show as placeholders, do not decide)

| # | Open item | How to show it |
|---|---|---|
| O1 | Projects as Pipeline board: owner has not confirmed that is what "Opportunity (ref. Zone CRM)" means | Design the board, plus one alternate frame as a grouped sheet |
| O2 | Payroll gross formula (daily vs hourly, lunch, half days) | Show both Days and Hrs columns. Mark Gross Pay with a "formula pending" note |
| O3 | Payables and Debts merged or separate | Design as one list with a "by due date / by creditor" grouping toggle |
| O4 | Materials status values | Use a single neutral `pending` tag with a "status list pending" note |
| O5 | Tag color for statuses the ERP palette lacks (project Active, Partial Paid) | Use only the six existing tags. Proposed mapping: Active = released, Complete = completed, Hold = hold, Cancelled = cancelled, Partial Paid = pending with percent in the label. Mark as proposal |
| O6 | Eight rail items vs five | Keep one rail. Flag if labels do not fit at 9.5px |
| O7 | Mobile layout. The ERP app has none; a foreman may want attendance on a phone | Desktop only, 1440 wide. List mobile as out of scope |
| O8 | Same background photo, or a different one for Papa | Reuse the ERP photo slot, labeled placeholder |
| O9 | Centavos. `fmt` rounds to whole pesos; payroll may need centavos | Show whole pesos, flag on the Payroll frame |
| O10 | Forecast and Receivables | Out of scope for this design pass |

## 8. What the design session must not do

- Introduce colors, fonts, radii or shadows not listed in section 2.
- Use the CraftUI kit's green palette. The app deliberately does not.
- Add fields, statuses, categories or sections that are not in the `papa` sheet or the [[PRD]].
- Close forms on backdrop click.
- Put computed money in editable fields.
- Use real ledger data from `backups/` as sample content. Use obviously fake sample rows.
