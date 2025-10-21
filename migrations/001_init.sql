create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists assets (
  id uuid primary key,
  tenant_id uuid not null,
  asset_tag text not null,
  description text not null,
  category_id uuid not null,
  acquisition_cost numeric(18,4) not null,
  currency char(3) not null,
  location_id uuid not null,
  status text not null check (status in ('active','disposed','written_off','transferred')),
  created_at timestamptz not null default now()
);

create unique index if not exists uq_assets_tenant_tag on assets(tenant_id, asset_tag);
