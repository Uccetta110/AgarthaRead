Run the SQL migration and seed script

1) Apply SQL migration to your MySQL database (replace credentials as needed):

mysql -u <user> -p <database> < migrations/20260522_add_roles_permissions.sql

2) (Optional) Run the seed script to assign roles/permissions. Set environment variables in `.env.local` before running:

- `SEED_ADMIN_EMAIL` (optional) — email of existing user to set as `admin`
- `SEED_MANAGER_EMAIL` (optional) — email of existing user to set as `manager` and grant manager permissions

Run:

# from apps/web
node -r ts-node/register server/db/seed/seed_permissions.ts

If you don't have `ts-node`, install it globally or run the compiled JS equivalent.
