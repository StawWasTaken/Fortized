-- Fortized public IDs migration
-- Adds Discord-style stable public IDs without replacing usernames as display/login names.
-- Users:    raw.id = ftz-u<number>
-- Bastions: global_bastions.id / data.id / data.globalId = ftz-b<number>

begin;

create table if not exists ftz_id_counters (
  type text primary key,
  value bigint not null default 0
);

create or replace function ftz_next_id(p_type text)
returns bigint
language plpgsql
as $$
declare
  next_value bigint;
begin
  insert into ftz_id_counters(type, value)
  values (p_type, 1)
  on conflict (type) do update set value = ftz_id_counters.value + 1
  returning value into next_value;
  return next_value;
end;
$$;

-- Backfill users that do not already have ftz-u<number> in raw.id.
with numbered as (
  select username, row_number() over (order by coalesce(created_at::text, ''), username) as rn
  from users
  where not coalesce(raw->>'id', '') ~ '^ftz-u[0-9]+$'
), base as (
  select coalesce(max((substring(raw->>'id' from '^ftz-u([0-9]+)$'))::bigint), 0) as max_id
  from users
  where coalesce(raw->>'id', '') ~ '^ftz-u[0-9]+$'
)
update users u
set raw = coalesce(u.raw, '{}'::jsonb) || jsonb_build_object('id', 'ftz-u' || (base.max_id + numbered.rn)::text)
from numbered, base
where u.username = numbered.username;

insert into ftz_id_counters(type, value)
select 'user', coalesce(max((substring(raw->>'id' from '^ftz-u([0-9]+)$'))::bigint), 0) from users
on conflict (type) do update set value = greatest(ftz_id_counters.value, excluded.value);

-- Build a map for bastion IDs that are missing or still using legacy formats.
create temporary table if not exists ftz_bastion_id_map(old_id text primary key, new_id text not null) on commit drop;
insert into ftz_bastion_id_map(old_id, new_id)
with legacy as (
  select id as old_id, row_number() over (order by id) as rn
  from global_bastions
  where id !~ '^ftz-b[0-9]+$'
), base as (
  select coalesce(max((substring(id from '^ftz-b([0-9]+)$'))::bigint), 0) as max_id
  from global_bastions
  where id ~ '^ftz-b[0-9]+$'
)
select old_id, 'ftz-b' || (base.max_id + legacy.rn)::text
from legacy, base
on conflict (old_id) do nothing;

-- Insert canonical bastion rows. Old rows are kept as legacy aliases for rollback/history.
insert into global_bastions(id, data)
select m.new_id,
       (gb.data || jsonb_build_object(
          'id', m.new_id,
          'globalId', m.new_id,
          'legacyGlobalId', m.old_id
       ))
from global_bastions gb
join ftz_bastion_id_map m on m.old_id = gb.id
on conflict (id) do update set data = excluded.data;

-- Ensure already-canonical rows also carry id/globalId inside data.
update global_bastions
set data = data || jsonb_build_object('id', id, 'globalId', id)
where id ~ '^ftz-b[0-9]+$';

insert into ftz_id_counters(type, value)
select 'bastion', coalesce(max((substring(id from '^ftz-b([0-9]+)$'))::bigint), 0) from global_bastions
where id ~ '^ftz-b[0-9]+$'
on conflict (type) do update set value = greatest(ftz_id_counters.value, excluded.value);

-- Update users.bastions JSONB arrays to point at canonical ftz-b IDs.
update users u
set bastions = (
  select coalesce(jsonb_agg(
    case
      when m.new_id is not null then elem || jsonb_build_object('globalId', m.new_id, 'legacyGlobalId', m.old_id)
      when elem ? 'globalId' and (elem->>'globalId') ~ '^ftz-b[0-9]+$' then elem
      else elem
    end
  ), '[]'::jsonb)
  from jsonb_array_elements(coalesce(u.bastions, '[]'::jsonb)) elem
  left join ftz_bastion_id_map m on m.old_id = elem->>'globalId' or m.old_id = elem->>'id' or m.old_id = elem->>'name'
)
where jsonb_typeof(coalesce(u.bastions, '[]'::jsonb)) = 'array';

-- Move DM storage keys from username__username to ftz-u#__ftz-u# while preserving message ids.
with user_ids as (
  select username, raw->>'id' as public_id from users where coalesce(raw->>'id', '') ~ '^ftz-u[0-9]+$'
), mapped as (
  select d.dm_key as old_key,
         least(u1.public_id, u2.public_id) || '__' || greatest(u1.public_id, u2.public_id) as new_key
  from dms d
  join user_ids u1 on u1.username = split_part(d.dm_key, '__', 1)
  join user_ids u2 on u2.username = split_part(d.dm_key, '__', 2)
  where d.dm_key !~ '^ftz-u[0-9]+__ftz-u[0-9]+$'
)
update dms d
set dm_key = mapped.new_key
from mapped
where d.dm_key = mapped.old_key
  and not exists (
    select 1 from dms existing
    where existing.dm_key = mapped.new_key and existing.id = d.id
  );

commit;
