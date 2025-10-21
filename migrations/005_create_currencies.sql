create table if not exists currencies (
  code char(3) primary key,
  name text not null,
  symbol text,
  created_at timestamptz default now()
);

insert into currencies (code, name, symbol) values
  ('USD', 'US Dollar', '$'),
  ('GYD', 'Guyana Dollar', '$'),
  ('CAD', 'Canadian Dollar', '$'),
  ('GBP', 'British Pound', '£'),
  ('EUR', 'Euro', '€')
on conflict (code) do nothing;
