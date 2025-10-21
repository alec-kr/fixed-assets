-- 0001_add_asset_audit.sql
-- Run in psql or your migration tool, connected as a role that can create types/tables/functions/triggers.

begin;

-- 1) Enum for action (idempotent create)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'audit_action') then
    create type audit_action as enum ('insert','update','delete');
  end if;
end$$;

-- 2) Audit table (idempotent create)
create table if not exists asset_audit (
  id          bigserial primary key,
  asset_id    bigint null,                   -- your assets.id type; change to integer if needed
  table_name  text not null default 'assets',
  action      audit_action not null,
  changed_at  timestamptz not null default now(),
  changed_by  text null,                     -- from app: current_setting('app.user_id', true)
  request_id  text null,                     -- optional request trace id
  reason      text null,                     -- optional business reason (relocation, revaluation, etc.)
  old_row     jsonb null,
  new_row     jsonb null,
  diff        jsonb null
);

-- Helpful indexes
create index if not exists asset_audit_asset_time_idx on asset_audit (asset_id, changed_at desc);
create index if not exists asset_audit_time_idx on asset_audit (changed_at desc);

-- 3) Trigger function: writes an audit row on INSERT/UPDATE/DELETE
create or replace function audit_assets() returns trigger as $$
declare
  v_user text := current_setting('app.user_id', true);
  v_req  text := current_setting('app.request_id', true);
  v_old  jsonb;
  v_new  jsonb;
  v_diff jsonb := '{}'::jsonb;
  k text; v_new_val jsonb; v_old_val jsonb;

  -- exclude noisy columns here (add/remove as needed)
  exclude_cols text[] := array['updated_at'];
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(NEW) - exclude_cols;
    insert into asset_audit(asset_id, action, changed_by, request_id, old_row, new_row, diff)
    values (NEW.id, 'insert', v_user, v_req, null, v_new, null);
    return NEW;

  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(OLD) - exclude_cols;
    v_new := to_jsonb(NEW) - exclude_cols;

    -- build a field-wise diff: { field: {from: <old>, to: <new>} }
    for k, v_new_val in select key, value from jsonb_each(v_new) loop
      v_old_val := v_old -> k;
      if v_old_val is distinct from v_new_val then
        v_diff := v_diff || jsonb_build_object(k, jsonb_build_object('from', v_old_val, 'to', v_new_val));
      end if;
    end loop;

    insert into asset_audit(asset_id, action, changed_by, request_id, old_row, new_row, diff)
    values (NEW.id, 'update', v_user, v_req, v_old, v_new, nullif(v_diff, '{}'::jsonb));
    return NEW;

  elsif tg_op = 'DELETE' then
    v_old := to_jsonb(OLD) - exclude_cols;
    insert into asset_audit(asset_id, action, changed_by, request_id, old_row, new_row, diff)
    values (OLD.id, 'delete', v_user, v_req, v_old, null, null);
    return OLD;
  end if;

  return null; -- should never hit
end;
$$ language plpgsql;

-- 4) Attach trigger to assets
drop trigger if exists trg_audit_assets on assets;
create trigger trg_audit_assets
after insert or update or delete on assets
for each row execute function audit_assets();

commit;
