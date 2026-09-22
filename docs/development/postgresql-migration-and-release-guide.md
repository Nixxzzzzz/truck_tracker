# PostgreSQL Migration and Release Guide

This guide is the source of truth for moving TruckTracker from SQLite to PostgreSQL and releasing the change safely.

## Scope

The migration changes backend persistence only. REST routes, web behavior, Android behavior, uploaded photo paths, and PostgreSQL schema coverage must remain compatible.

Never commit:

- `DATABASE_URL`
- `JWT_SECRET`
- administrator passwords
- SAP credentials
- database dumps or exported production rows

## 1. Preflight

1. Confirm the target PostgreSQL instance exists and has enough storage and connection capacity.
2. Create a fresh database backup using the provider backup facility or `pg_dump`.
3. Record the current SQLite row counts for every table.
4. Confirm the application is in a maintenance window or writes are paused during the final export.
5. Verify the working tree and remote before editing:

```powershell
git status --short
git remote -v
```

6. Confirm `.env`, database files, dumps, uploads, and local runtime output are ignored by Git.

## 2. Local Configuration

Copy `.env.example` to `.env` and set values locally. Use a local PostgreSQL database for development.

```env
DATABASE_URL=postgresql://user:password@localhost:5432/truck_tracker
DB_POOL_MAX=10
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true
JWT_SECRET=<random-local-secret>
UPLOADS_DIR=./uploads/photos
```

Do not place real credentials in `.env.example`, Compose files, Render YAML, documentation, or shell history.

## 3. Apply the Schema

Run migrations from the repository root:

```powershell
npm install
npm run migrate --workspace=server
```

The runner creates `_schema_migrations` and applies versions `001` through `007` in order. Each pending migration runs inside one checked-out PostgreSQL client and is committed atomically.

The migration command is idempotent. Re-running it must report zero newly applied migrations and must not remove data.

## 4. Data Transfer

The repository migration creates the schema. It does not automatically import the old SQLite production database because production data must not be overwritten or guessed.

Use a reviewed export/import process:

1. Export SQLite data to a staging format.
2. Transform SQLite-specific values explicitly:
   - `?` parameters are application SQL concerns, not data values.
   - integer flags such as `is_active` and `is_acknowledged` remain compatible with the current API.
   - timestamps and null values must be checked per table.
   - preserve UUIDs and foreign-key order.
3. Load into a staging PostgreSQL database.
4. Compare row counts for every table.
5. Compare representative records, foreign-key relationships, unique keys, timestamps, and ERP/SAP reference fields.
6. Run the integrity and workflow checks against staging.
7. Repeat the export during the final write pause and load production only after the comparison is approved.

Never delete the SQLite source until the PostgreSQL row-count and application verification reports are archived outside the repository.

## 5. Verification

Build the backend:

```powershell
npm.cmd run build --workspace server
```

Run database integrity tests with a configured PostgreSQL database:

```powershell
npm run test:integrity --workspace=server
```

Start the API and verify:

```powershell
npm run dev --workspace=server
```

Required smoke checks:

- `GET /api/health` returns HTTP 200.
- Manager login succeeds with a provisioned account.
- Vehicle, driver, destination, trip, document, challan, fuel, maintenance, and exception reads work.
- A multi-step trip transaction either commits all writes or rolls back all writes.
- Photo uploads still use `UPLOADS_DIR` and are not stored in PostgreSQL.
- `POST /api/backup/create` creates a PostgreSQL dump when `pg_dump` is installed.

## 6. Render and Docker

Set these values in the Render dashboard or secret manager:

- `DATABASE_URL` as a secret.
- `JWT_SECRET` as a generated secret.
- `INITIAL_ADMIN_EMAIL` as a secret environment value for first-boot manager provisioning.
- `INITIAL_ADMIN_PASSWORD` as a secret environment value; use a unique password of at least 32 characters.
- `DB_POOL_MAX`, normally `10`.
- `DB_SSL=true`.
- `DB_SSL_REJECT_UNAUTHORIZED=true` unless the provider explicitly documents another requirement.
- `AUTO_SEED=false` in production.
- `ALLOWED_ORIGINS` set to the exact web application origin, with no wildcard.
- `UPLOADS_DIR` to the persistent upload mount when one is available.

The server requires the initial administrator values only when the database has no users. After first boot, rotate or remove the initial administrator secret according to the account rotation policy; do not put it in the repository.

Do not put `DATABASE_URL` or passwords in `render.yaml` or `docker-compose.yml`. Compose reads them from the shell or a local ignored `.env` file.

After deployment:

1. Check Render logs for successful migration completion.
2. Check `/api/health`.
3. Check PostgreSQL connection count and error rate.
4. Exercise read and write smoke checks.
5. Confirm uploaded photo access.
6. Keep the previous deployment available until verification is complete.

## 7. Backup and Rollback

Create a PostgreSQL backup before every production schema change. The API backup endpoint uses `pg_dump` and stores a custom-format dump under `BACKUP_DIR`.

A rollback is an application deployment rollback plus a database plan. Do not blindly restore an old database over newer production writes. For a data rollback, stop writes, confirm the restore point, restore with `pg_restore`, rerun migrations if required, and repeat the verification checklist.

## 8. GitHub Synchronization

Review before committing:

```powershell
git status --short
git diff --check
git diff -- .
```

Search for accidental secrets before staging:

```powershell
rg -n --hidden --glob '!node_modules/**' --glob '!.git/**' "postgres(ql)?://[^ ]+|JWT_SECRET=.{8,}|PASSWORD=.{8,}|API_KEY=.{8,}|BEGIN (RSA|OPENSSH|PRIVATE) KEY" .
```

Stage only intended source, configuration, and documentation files. Inspect the staged diff:

```powershell
git add README.md .env.example Dockerfile docker-compose.yml render.yaml docs documentation server shared

git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
```

Commit with a focused message, then push only after the staged review and build pass:

```powershell
git commit -m "migrate backend persistence to PostgreSQL"
git push origin main
```

Never use `git add -A` for this migration unless the complete working tree has been reviewed. Never force-push shared history. If GitHub secret scanning reports a credential, stop, revoke the credential, remove it from history using the repository's approved process, and rotate it before continuing.

## Completion Criteria

The migration is complete only when:

- Backend build passes.
- PostgreSQL migrations apply and are idempotent.
- Staging row counts match the approved source export.
- API and workflow smoke checks pass.
- No SQLite runtime dependency remains in `server/src`.
- No secrets, dumps, database files, or production uploads are staged.
- Render and Docker use environment-provided PostgreSQL credentials.
- The staged diff has been reviewed before the GitHub push.
