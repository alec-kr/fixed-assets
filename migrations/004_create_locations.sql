create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  created_at timestamptz default now()
);

insert into locations (code, name)
values
  ('LOC1', 'Location 1'),
  ('LOC2', 'Location 2'),
  ('LOC3', 'Location 3'),
  ('LOC4', 'Location 4'),
  ('LOC5', 'Location 5'),
  ('LOC6', 'Location 6'),
  ('LOC7', 'Location 7'),
  ('LOC8', 'Location 8'),
  ('LOC9', 'Location 9'),
  ('LOC10', 'Location 10'),
  ('LOC11', 'Location 11'),
  ('LOC12', 'Location 12')
on conflict (code) do nothing;
