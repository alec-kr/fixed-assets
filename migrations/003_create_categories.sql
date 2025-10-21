create table if not exists asset_categories (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  useful_life_months int default 36,
  depreciation_method text default 'straight_line',
  created_at timestamptz default now()
);

insert into asset_categories (code, name) values
  ('IT', 'IT Equipment'),
  ('FURN', 'Furniture'),
  ('VEH', 'Vehicles'),
  ('HVAC', 'Air Conditioning Units')
on conflict do nothing;
