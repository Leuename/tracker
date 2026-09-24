---
title: Claude Design Prompt for the Papa Tracker
tags: [papa, construction, design, prompt, claude-design]
created: 2026-09-24
status: ready to paste
related:
  - "[[Design Brief]]"
  - "[[PRD]]"
  - "[[App Flows]]"
---

# Claude Design Prompt for the Papa Tracker

## How to use

1. Start a new Claude Design session.
2. Attach these files from the repo, in this order:
   1. `company_tracker/ERP Prototype.dc.html`
   2. `company_tracker/ERP Wireframes.dc.html`
   3. `apps/web/src/styles.css`
   4. `apps/web/src/tokens/spacing.css`
   5. `apps/web/src/tokens/typography.css`
   6. `construction_tracker/construction.csv`
   7. `docs/papa/PRD.md`
   8. `docs/papa/App Flows.md`
   9. `docs/papa/Design Brief.md`
3. Paste everything inside the fence below.
4. Review the first pass against section 8 of the Design Brief before asking for changes.

## The prompt

```text
ROLE
You are a senior product designer extending an existing, shipped web app. Your job is continuity, not
reinvention. Every visual and interaction choice must trace back to the attached ERP app or its
design system. If something is not covered there, mark it as a placeholder instead of inventing it.

CONTEXT
- The attached "ERP Prototype" is the design of a live bookkeeping app (Dashboard, Tracker, AckRec,
  Masterlist, Settings). Its shipped CSS (styles.css plus the two token files) is the source of truth
  and wins over the prototype wherever they differ.
- You are designing a second app for a small family construction business: the "Papa tracker". It
  shares the same design language as the ERP app, but has its own screens and its own data.
- The screen list and every field label come from construction.csv (a spreadsheet export). Column A
  lists the sidebar sections; the rows under each section list what that screen contains. Mixed
  English and Filipino notes in the CSV are instructions from the business owner.
- PRD.md defines requirements. App Flows.md defines the user flows. Design Brief.md maps every Papa
  screen to an existing ERP pattern and lists open items. Follow the Design Brief's mapping.

HARD CONSTRAINTS
1. Palette: plum only, exactly as in styles.css :root. Ink #2A1A22, muted #8B7079, accent #A8577B,
   accent-dark #7E3F5C (nav rail), accent-wash #F7E9F0, page #FDF7FA, surface #FFFFFF,
   sunken #FCF5F8, border #EFDCE4, danger #C4566E. Do NOT use the CraftUI kit's green palette.
2. Status tags: only the six in the Design Brief section 2.2 (completed, pending, overdue, hold,
   released, cancelled), with their exact colors.
3. Font: Inter. Sizes as shipped: topbar title 22px bold, modal title 19px bold, card title 16px
   bold, body 13 to 13.5px, labels 12px muted, eyebrow 11px weight 800 uppercase, sheet header
   10.5px weight 800 uppercase.
4. Spacing on the 7px rhythm (7, 14, 21, 28). Screen gutter 28px. Radii: inputs 10, buttons and
   tags 11, tiles and menus 13, cards and modals 16.
5. Shell: 84px nav rail on the left in accent-dark, icon plus 9.5px label per item, Settings
   flyout at the bottom, Sign out last. 76px white topbar: title, lowercase explanatory subtitle,
   spacer, then controls, with the primary "+ Add ..." button last.
6. Background photo under a 70% page wash inside the app; frosted modals over a tinted photo scrim.
   Reuse the ERP photo slot and label it as a placeholder.
7. Money: peso sign, whole pesos, en-US grouping (₱45,000). Amounts right-aligned. Computed money is
   read-only and visibly distinct from inputs.
8. Dialogs never close on backdrop click; Escape closes the innermost one. Add dialogs have
   "Save & add another" beside "Save". Required fields show a red "required" marker, optional
   fields a faint "optional" marker.
9. Desktop only, 1440 x 900 frames. The shipped app has no responsive layout.
10. Sample data must be obviously fake (e.g. "Sample Project A", "Worker 1"). Never invent
    real-looking companies, people or amounts that could be mistaken for real records.

SCREENS TO DESIGN
Use the exact field labels from construction.csv. For each screen, follow the pattern named here.

1. Dashboard: topbar "Dashboard" with subtitle "as of <date>". A row of four tiles for the Daily
   Cash Flow Summary (Beginning Balance, Total Cash In, Total Cash Out, Ending Balance). Below, cards
   in the dashboard column layout: Projects (count per Project Status, plus active projects with
   Contract Amount, Amount Collected, Outstanding), Payables (upcoming due dates using the ERP
   "Upcoming deadlines" date-chip rows, overdue in danger red), Debts (creditor name and balance).
   Every tile and row is clickable and says where it leads.
2. Projects: a pipeline board based on the Zone CRM Pipeline screen in the attached design system
   kit. One column per Project Status (Active, Complete, Hold, Cancelled). Cards show Project/Client
   Name, Location, Foreman Assigned, Contract Amount, Outstanding. Project detail as a modal:
   editable fields (Project/Client Name, Location, Foreman Assigned, Project Status, Start Date,
   Target Finish, Contract Amount, Budget Cost) and read-only computed totals (Amount Billed,
   Amount Collected, Outstanding, Actual Cost).
   ALSO provide one alternate frame showing Projects as a grouped sheet, because the pipeline
   interpretation is not yet confirmed.
3. Cash Flow: a read-only summary strip (Date, Beginning Balance, Total Cash In, Total Cash Out,
   Ending Balance), then a sheet of entries grouped by date with collapsible group headers and
   subtotals, and a footer with totals. "+ Add transaction" dialog: Cash In / Cash Out as radio
   choice cards first, then Date, Project (dropdown), Category (dropdown), Description, Amount,
   Remarks, receipt drop zone. When Category is "Cash Advance", a Worker field appears and is
   required.
4. Attendance: topbar holds Date and Project selectors. Sheet with one row per worker from the
   masterlist: Worker Name, Position (auto), Time In, Time Out (edit in place), computed hours,
   Remarks.
5. Payroll: topbar holds a Pay Period date-range picker (reuse the ERP period picker) and Project.
   Sheet columns: Worker Name, Position, Rate per day, Days/Hrs Worked, Gross Pay, Cash Vale, Other
   Deductions, Net Pay, Payment Status (tag). Cash Vale and Other Deductions are edit-in-place.
   Row action "Mark as paid". Put a visible "formula pending" note on Gross Pay.
6. Payables: one sheet for payables and debts, with a grouping toggle "by due date / by creditor".
   Columns: Creditor Name, Debt Type, Original Amount, Amount Paid, Balance, Next Payment, Status
   (tag, Partial Paid shows its percent), Contact. "Record payment" dialog modeled on the ERP
   Liquidate dialog: required Date and Amount, receipt drop zone, computed new balance.
7. Materials: sheet plus add dialog with Project, Date Requested, Materials, Qty, Unit, Unit Cost,
   Total Cost (computed), Supplier, Status, Receipt. Status values are not defined yet: use a
   neutral pending tag labeled "status list pending".
8. Masterlist: worker sheet with edit-in-place rows like the ERP Recurring payables list: Worker
   Name, Position, Daily Rate, Project Assigned, Start Date, Status, Phone Number.
9. Settings: flyout sub-pages with removable-chip list editors for Project Status, Expense
   Categories, Income Categories, Worker Positions, Debt Types.

STATES TO SHOW
- Empty state for Cash Flow, Attendance and Payables, using the ERP empty pattern (centered muted
  text with a link).
- Filtered state with the Filters count badge and a right-side filters drawer, on Cash Flow.
- Viewer (read-only) account on Dashboard, with the small permanent "viewing only" pill.
- Overdue payable on Dashboard and Payables.
- Validation error on the Add transaction dialog (danger border on the field).

FLOWS TO PROTOTYPE (clickable)
Follow App Flows.md:
A. Dashboard tile -> Cash Flow filtered to today -> Add transaction -> saved -> summary updates.
B. Attendance for a date -> Payroll for the period -> Mark as paid -> toast.
C. Payables -> Record payment -> status moves from Pending to Partial Paid.

OPEN ITEMS (do not decide these; mark each on its frame with a small labeled note)
O1 pipeline vs sheet for Projects. O2 payroll formula. O3 payables and debts as one list.
O4 materials statuses. O5 tag mapping for Active and Partial Paid (proposed: Active = released,
Partial Paid = pending with percent). O6 eight rail items fitting at 9.5px. O7 mobile is out of
scope. O8 background photo placeholder. O9 whole pesos vs centavos on Payroll.

DO NOT
- Add screens, fields, statuses or categories that are not in construction.csv or PRD.md.
- Design Forecast or Receivables.
- Change the ERP app's screens.
- Restyle anything "to modernize it". Continuity is the goal.

OUTPUT
1. A clickable prototype covering all nine screens and the three flows, in the same format as the
   attached ERP Prototype.
2. A wireframe sheet, like the attached ERP Wireframes, showing each screen's layout with the
   pattern name labeled on each region (e.g. "tiles", "sheet + group-head", "strip").
3. A short list of every place you had to choose something the sources did not specify, so the
   owner can confirm or reject each one.

Before designing, restate in five bullets how you read the constraints and the screen-to-pattern
mapping, then proceed.
```

## Why the prompt is built this way

| Choice | Reason |
|---|---|
| Palette and sizes repeated inside the prompt | Claude Design may weigh the prototype over the CSS. The shipped CSS differs from the kit, and the kit's green palette would be the most likely wrong turn |
| Exact CSV labels required | The port of the ERP app missed requirements hidden inside screens (trap 77). Labels anchor each field to the spec |
| Open items as on-frame notes | Forces every undecided point back to the owner instead of letting a design silently settle it |
| Alternate Projects frame | The pipeline reading of the Zone CRM note is an interpretation, not a confirmed requirement |
| Restate-then-proceed | Catches a misread mapping before nine screens are built on it |
