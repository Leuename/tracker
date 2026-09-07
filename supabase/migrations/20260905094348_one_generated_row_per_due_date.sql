-- Generate's "already on the sheet?" rule lived only in JavaScript, and it
-- asked a page-load snapshot. The scheduler writes the same month unattended,
-- so a tab opened hours earlier saw none of those rows and could duplicate a
-- whole month of liability on one click. The client now re-reads first; this is
-- the backstop for the case where two writers race anyway.
--
-- Scoped to generated rows on purpose. A row carrying `src` was produced by a
-- machine from one payable for one due date, so a second copy is always wrong.
--
-- There is deliberately NO equivalent index for hand-entered rows
-- (`src is null`). The app's duplicate warning there is advisory and
-- dismissible by design — "save again to add it anyway" — because two genuine
-- payments for the same thing in the same period are a real thing a person may
-- record. A unique index would turn that feature into an error.
--
-- Verified before applying: zero existing violations on either shape.

create unique index txns_one_generated_row_per_due_date
  on public.txns (src, due)
  where src is not null;
