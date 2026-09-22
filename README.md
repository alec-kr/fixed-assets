## Requirements

Install these first:

- Node.js 20+
- PostgreSQL 15+
- Git Bash / Terminal / PowerShell

## 1. Unzip the project

```bash
unzip fixed-assets.zip
cd fixed-assets
```

## 2. Install dependencies

```bash
npm install
npm install -D @types/pg
```

## 3. Create the PostgreSQL database

Login to PostgreSQL:

```bash
psql -U postgres
```

Run:

```sql
create database fixed_assets;
create user app_user with password 'app_pass';
grant all privileges on database fixed_assets to app_user;
\c fixed_assets
grant all on schema public to app_user;
alter schema public owner to app_user;
\q
```

## 4. Create `.env`

Create a file named `.env` in the project root:

```env
DATABASE_URL=postgres://app_user:app_pass@localhost:5432/fixed_assets
PORT=3000
```

## 5. Apply migrations

Run these one by one:

```bash
psql "postgres://app_user:app_pass@localhost:5432/fixed_assets" -f migrations/001_init.sql
psql "postgres://app_user:app_pass@localhost:5432/fixed_assets" -f migrations/003_create_categories.sql
psql "postgres://app_user:app_pass@localhost:5432/fixed_assets" -f migrations/004_create_locations.sql
psql "postgres://app_user:app_pass@localhost:5432/fixed_assets" -f migrations/005_create_currencies.sql
psql "postgres://app_user:app_pass@localhost:5432/fixed_assets" -f migrations/006_auth.sql
```

Before running `007_asset_audit.sql`, open it and change:

```sql
asset_id bigint null
```

To:

```sql
asset_id uuid null
```

Then run:

```bash
psql "postgres://app_user:app_pass@localhost:5432/fixed_assets" -f migrations/007_asset_audit.sql
```

## 6. Add missing `updated_at` column

The update routes use `updated_at`, so add it manually:

```bash
psql "postgres://app_user:app_pass@localhost:5432/fixed_assets" -c "alter table assets add column if not exists updated_at timestamptz default now();"
```

## 7. Create a login user

Generate a password hash:

```bash
node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('password123',10).then(console.log)"
```

Copy the hash output.

Then open PostgreSQL:

```bash
psql "postgres://app_user:app_pass@localhost:5432/fixed_assets"
```

Insert the user:

```sql
insert into users (tenant_id, email, password_hash)
values (
  '11111111-1111-1111-1111-111111111111',
  'admin@example.com',
  'PASTE_HASH_HERE'
);
\q
```

Login details:

```text
Email: admin@example.com
Password: password123
```

## 8. Fix TypeScript config

Open `tsconfig.json`.

Change:

```json
"verbatimModuleSyntax": true
```

To:

```json
"verbatimModuleSyntax": false
```

Also change:

```json
"types": []
```

To:

```json
"types": ["node"]
```

## 9. Run the app

For development:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Useful pages:

```text
http://localhost:3000/login.html
http://localhost:3000/form.html
http://localhost:3000/list.html
http://localhost:3000/edit.html
```

## 10. Build and run production version

```bash
npm run build
npm start
```

## Quick health checks

Server check:

```text
http://localhost:3000/health
```

Database check:

```text
http://localhost:3000/health/db
```
