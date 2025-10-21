create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

-- minimal seed
insert into tenants (id, name) values
  ('11111111-1111-1111-1111-111111111111','Demo Tenant')
on conflict (id) do nothing;
