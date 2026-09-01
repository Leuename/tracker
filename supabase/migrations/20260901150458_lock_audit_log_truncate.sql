-- `revoke insert, update, delete` was not enough. Supabase's default privileges
-- on `public` grant ALL on a new table to `authenticated`, and ALL includes
-- TRUNCATE and TRIGGER. Verified against information_schema.role_table_grants
-- immediately after the audit_log migration: authenticated still held both.
--
-- TRUNCATE is the one that matters. Row-level security does not apply to it, so
-- a grant that survives is a grant to erase the entire audit log in one
-- statement — the exact thing the table exists to make impossible. TRIGGER goes
-- with it: a role that can attach its own trigger to the log can rewrite what
-- lands in it.
--
-- Same shape as Decisions D23 on transfers: revoke everything, then grant back
-- the one privilege intended, and verify against the catalogue rather than
-- trusting the success response.

revoke all on public.audit_log from anon, authenticated;

grant select on public.audit_log to authenticated;
