Run the SQL migration and seed script

1) Apply the SQL migration to your MySQL database (replace credentials as needed):

mysql -u <user> -p <database> < migrations/20260523_align_schema.sql

2) (Optional) Run the seed script to assign roles/permissions. Set environment variables in `.env.local` before running:

- `SEED_ADMIN_EMAIL` (optional) — email of existing user to set as `admin`
- `SEED_MANAGER_EMAIL` (optional) — email of existing user to set as `manager` and grant manager permissions
- `SEED_MANAGER_PERMISSION_CODES` (optional) — comma-separated permission codes, defaults to `VU,MU,EU,AA,MI,EI,EC`

Run:

# from apps/web
node server/db/seed/seed_permissions.mjs

You can also use the package script:

`npm run db:seed:permissions`
