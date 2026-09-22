# Company SQL Server Rollout Guide

This is the approved planning guide for moving TruckTracker from the current PostgreSQL/Neon staging deployment to the company Microsoft SQL Server environment.

## Important Status

The live Render service uses Neon PostgreSQL. The repository contains a dual-driver foundation, but the SQL Server migration is not approved for production until the SQL Server-specific migrations, queries, backups, and integration tests pass against the company's instance. Do not set `DB_DRIVER=sqlserver` for production before that validation.

SSMS is an administration client. It is not the database server and it does not provide a connection for Render by itself.

## Company Information Required

Company IT must provide these details through an approved secret-sharing process:

- SQL Server host name or private DNS name
- TCP port, normally `1433`
- Database name
- Dedicated application login and password
- SQL Server version and edition
- Encryption and certificate requirements
- Firewall or VPN route from the application server
- Backup, restore, retention, and disaster-recovery policy
- Approved location for the Node.js API server

Never put the password in GitHub, documentation, screenshots, chat, or `.env.example`.

## Required Network Design

The Node.js API must run where it can reach SQL Server over a secure company network path:

```text
Company users and Android clients
              |
              v
      Company Node.js API server
              |
       encrypted TCP connection
              v
       Company Microsoft SQL Server
              ^
              |
             SSMS
```

Render cannot reach a private on-premises SQL Server unless company IT provides an approved private connection, VPN, or secure public endpoint. Do not open SQL Server broadly to the internet.

## Application Migration Required

Before production cutover, the backend must be converted from PostgreSQL to SQL Server:

1. Replace the `pg` driver with `mssql`.
2. Replace `DATABASE_URL` with SQL Server settings such as `DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_ENCRYPT`, and `DB_TRUST_SERVER_CERTIFICATE`.
3. Rewrite migrations for SQL Server schema and catalog rules.
4. Replace PostgreSQL `$1` binding with named SQL Server parameters.
5. Replace `NOW()` with `SYSUTCDATETIME()`.
6. Replace `TIMESTAMPTZ`, `DOUBLE PRECISION`, and PostgreSQL-specific casts with SQL Server types.
7. Replace `LIMIT` with `TOP` or `OFFSET ... FETCH`.
8. Replace PostgreSQL date intervals with `DATEADD` expressions.
9. Replace PostgreSQL catalog queries with `sys.tables`, `sys.columns`, and `sys.indexes` queries.
10. Replace `pg_dump`/`pg_restore` with SQL Server backup tooling or provider-managed backups.

The web frontend, Android application, REST paths, uploaded photo behavior, and API response contracts should remain unchanged.

## SQL Server Environment Variables

Set these only on the company server's secret manager or deployment environment:

```env
DB_SERVER=company-sql-server.example.internal
DB_PORT=1433
DB_NAME=truck_tracker
DB_USER=truck_tracker_app
DB_PASSWORD=<secret>
DB_POOL_MAX=10
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false
NODE_ENV=production
JWT_SECRET=<secret>
UPLOADS_DIR=/var/lib/truck-tracker/uploads/photos
AUTO_SEED=false
```

Do not use `DATABASE_URL`, `DB_SSL`, `DB_SSL_REJECT_UNAUTHORIZED`, or Neon values for the SQL Server build.

## Database Provisioning

Company IT should create the database and application login. The application login should receive only the permissions required by the migration and runtime, according to company policy. Apply schema migrations from the company API server or an approved deployment job; do not manually create tables from screenshots.

The SQL Server migration runner should create `_schema_migrations`, apply every migration in order, and be idempotent. A new empty database should be initialized by the deployment process after the SQL Server implementation is validated.

## Data Migration and Cutover

1. Keep the current PostgreSQL/Neon deployment available as the rollback source.
2. Export PostgreSQL data to a protected staging location.
3. Transform timestamps, booleans, text lengths, numeric precision, and nulls explicitly.
4. Load the data into a fresh company SQL Server database.
5. Compare row counts for every table.
6. Validate foreign keys, unique constraints, ERP/SAP references, timestamps, documents, photos, maintenance, fuel, challans, exceptions, and audit logs.
7. Run integrity, workflow, API, and performance tests against SQL Server.
8. Pause writes during the final export and cutover.
9. Switch the company API environment to SQL Server.
10. Verify health, login, reads, writes, file uploads, reports, and manager workflows.
11. Keep PostgreSQL read-only until the business owner approves completion.

## Deployment and Verification

Build and test the SQL Server branch before deployment:

```powershell
npm install
npm run build
npm run migrate --workspace=server
npm run test:integrity --workspace=server
npm run test:workflow --workspace=server
```

Required production checks:

- SQL Server connection succeeds with encryption enabled.
- Migrations are idempotent.
- A failed transaction rolls back all writes.
- Manager and driver authentication work.
- Trip lifecycle actions work.
- Reports and pagination work.
- Photo files remain in the approved storage location.
- Backups and restores have been tested.
- No database password or production data is staged in Git.

## Current Safe Recommendation

Keep Render + Neon as staging until the company SQL Server migration is implemented and validated. Do not change the current production `DATABASE_URL` to a SQL Server address; the current PostgreSQL driver cannot speak SQL Server protocol.
