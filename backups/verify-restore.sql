-- Verify a restore. Read-only apart from one write that is rolled back.
--
--   psql "$CONNECTION_STRING" -v ON_ERROR_STOP=1 -f backups/verify-restore.sql
--
-- Run it as `postgres`, against the RESTORED project, after every step in
-- README.md including the sequence. It raises an exception on the first thing
-- that is wrong, so a clean run to the end is the pass.
--
-- Why this file exists. A restore fails quietly in three different ways, and
-- every one of them has happened here:
--
--   * the roster comes back short and nothing throws, because an account with
--     no `profiles` row is a viewer rather than an error;
--   * a table comes back truncated at 1,000 rows, because PostgREST caps a read
--     and says nothing;
--   * the sequence is left behind, and the duplicate key arrives days later on
--     every audited write at once.
--
-- "Can I still write? yes" passes while broken. These assertions do not.
--
-- Set the expected values from the MANIFEST.md of the snapshot you restored —
-- not from today's production, which has moved on. Override any of them:
--   psql ... -v expect_audit_log=1129 -v expect_fingerprint=05a0…
--
-- WHAT THIS DOES NOT PROVE: stored documents in the `receipts` bucket (they are
-- not in the database, and `backups/files/` has never been exercised), and the
-- passwords, which are deliberately not in the backup and must be reset by hand.

\set ON_ERROR_STOP on

\if :{?expect_txns}        \else \set expect_txns        21          \endif
\if :{?expect_transfers}   \else \set expect_transfers   9           \endif
\if :{?expect_receipts}    \else \set expect_receipts    0           \endif
\if :{?expect_recurring}   \else \set expect_recurring   0           \endif
\if :{?expect_app_config}  \else \set expect_app_config  1           \endif
\if :{?expect_profiles}    \else \set expect_profiles    4           \endif
\if :{?expect_audit_log}   \else \set expect_audit_log   1129        \endif
\if :{?expect_txns_total}  \else \set expect_txns_total  226000.00   \endif
\if :{?expect_fingerprint} \else \set expect_fingerprint '05a080127ca18b46dc693edbd22b5168' \endif

\echo '== 1. row counts'
do $$
declare
  expected constant jsonb := jsonb_build_object(
    'txns', :expect_txns, 'transfers', :expect_transfers, 'receipts', :expect_receipts,
    'recurring', :expect_recurring, 'app_config', :expect_app_config,
    'profiles', :expect_profiles, 'audit_log', :expect_audit_log);
  t text; want bigint; got bigint;
begin
  for t, want in select key, value::bigint from jsonb_each_text(expected) loop
    execute format('select count(*) from public.%I', t) into got;
    if got <> want then
      raise exception 'public.% holds % rows, expected %. A short table is the F1 shape: PostgREST caps a read at 1000 and says nothing.', t, got, want;
    end if;
    raise notice '  % % rows', t, got;
  end loop;
end $$;

\echo '== 2. the ledger came back byte-for-byte'
do $$
declare got text; total text;
begin
  select md5(string_agg(x::text, chr(10) order by x.id)), sum(x.amount)::text
    into got, total from public.txns x;
  if got is distinct from :'expect_fingerprint' then
    raise exception 'txns fingerprint is %, expected %. The rows loaded but they are not the rows that were saved.', got, :'expect_fingerprint';
  end if;
  if total is distinct from :'expect_txns_total' then
    raise exception 'txns total is %, expected %', total, :'expect_txns_total';
  end if;
  raise notice '  fingerprint % · total %', got, total;
end $$;

\echo '== 3. the roster, and that it is not silently read-only'
do $$
declare total int; admins int; orphans int;
begin
  select count(*), count(*) filter (where role = 'admin') into total, admins from public.profiles;
  if total <> :expect_profiles then
    raise exception 'profiles holds % rows, expected %. An account with no profile row is a VIEWER, so a short roster returns a ledger nobody can write to and throws nothing.', total, :expect_profiles;
  end if;
  if admins <> total then
    raise exception '% of % profiles are admin. The rest are viewers and can change nothing.', admins, total;
  end if;
  select count(*) into orphans
    from public.profiles p left join auth.users u on u.id = p.user_id where u.id is null;
  if orphans > 0 then
    raise exception '% profile rows point at accounts that do not exist. auth.users is not in backups/; recreate the accounts from accounts.json first.', orphans;
  end if;
  raise notice '  % profiles, all admin, all joined to auth.users', total;
end $$;

\echo '== 4. the sequence, which is the one that fails days late'
do $$
declare seq bigint; top bigint;
begin
  select max(id) into top from public.audit_log;
  select last_value into seq from public.audit_log_id_seq;
  if seq < top then
    raise exception 'audit_log_id_seq is at % but the table reaches %. The next write will SUCCEED and so will the next; the duplicate key arrives when the sequence climbs into the restored block, then on every audited write across all six tables at once. Run the setval step.', seq, top;
  end if;
  raise notice '  sequence at %, table reaches %', seq, top;
end $$;

\echo '== 5. the triggers are back on'
do $$
declare missing text;
begin
  select string_agg(want.name, ', ') into missing
  from (values ('txns_audit'), ('receipts_audit'), ('recurring_audit'), ('transfers_audit'),
               ('app_config_audit'), ('profiles_audit'), ('app_config_touch')) as want(name)
  left join pg_trigger t on t.tgname = want.name and t.tgenabled <> 'D'
  where t.tgname is null;
  if missing is not null then
    raise exception 'these triggers are missing or still disabled: %. The restore disables them on purpose; leaving them off means the next change is never recorded.', missing;
  end if;
  raise notice '  all seven enabled';
end $$;

\echo '== 6. an audited write actually works, and is recorded (rolled back)'
begin;
do $$
declare before_count bigint; after_count bigint; probe_id bigint := 999000000000001;
begin
  select count(*) into before_count from public.audit_log;
  insert into public.txns (id, co, description, amount, due, status, period, cat)
    values (probe_id, 'VERIFY', 'restore verification probe', 1, current_date, 'pending', 'verify', 'Other');
  select count(*) into after_count from public.audit_log;
  if after_count <> before_count + 1 then
    raise exception 'a write produced % audit rows, expected exactly 1. Either a trigger is off or it is firing twice.', after_count - before_count;
  end if;
  raise notice '  write accepted and logged once';
end $$;
rollback;

\echo '== 7. nothing was left behind'
do $$
declare leftovers bigint;
begin
  select count(*) into leftovers from public.txns where co = 'VERIFY';
  if leftovers > 0 then
    raise exception 'the probe row survived the rollback (% rows). Something committed that should not have.', leftovers;
  end if;
end $$;

\echo ''
\echo 'PASS. Counts, fingerprint, roster, sequence, triggers and an audited write all hold.'
\echo 'Still unproven by this script: stored documents, and every account password.'
