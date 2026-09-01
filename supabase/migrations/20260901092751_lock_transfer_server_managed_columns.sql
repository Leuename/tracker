-- The previous migration granted column lists on public.transfers but never
-- took away the table-wide INSERT and UPDATE that Supabase's default
-- privileges on `public` had already handed to `authenticated`. A column-level
-- grant only adds; it cannot carve a column out of a table-wide grant. The net
-- effect was that `created_at` could be supplied on insert and `id` rewritten
-- on update — exactly the hole lock_server_managed_columns closed for txns,
-- receipts and recurring, reopened on a new table.
--
-- Verified before writing this: role_column_grants listed created_at and id
-- for both INSERT and UPDATE.

revoke insert, update on public.transfers from authenticated;

-- `id` is insertable because the client generates it (Date.now()), and never
-- updatable: rewriting a primary key is not part of editing a wire.
grant insert (id, co, name, cur, amount, status, note) on public.transfers to authenticated;
grant update (co, name, cur, amount, status, note)     on public.transfers to authenticated;
