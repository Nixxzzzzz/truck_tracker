# Testing & Quality Verification Guide

## 1. Test Philosophy
TruckTracker enforces automated quality gates:
1. **Database Integrity & Business Invariants**: Validates schema versioning, table existence, foreign keys, transaction rollbacks, and query plans.
2. **End-to-End Operational Workflow**: Validates dispatcher creation of manifests, driver checkpoints, geofence arrivals, POD photo uploads, delay reporting, and daily reports.
3. **Static Analysis & Build Verification**: TypeScript compiler validation across `server`, `web`, and `shared`.

---

## 2. Test Execution Commands

```bash
# 1. Run database integrity and invariant test suite
npm run test

# 2. Run full workspace production build (TypeScript + Vite)
npm run build:all

# 3. Run end-to-end operational workflow test against running server
npm run test:workflow --workspace=server

# 4. Verify database migrations idempotency
npm run migrate --workspace=server
```

---

## 3. GitHub Actions Continuous Integration
The `.github/workflows/deploy.yml` pipeline executes on every push to `main`:
1. `npm ci`
2. `npm run build --workspace=web`
3. `npm run build --workspace=server`
4. `npm test` (Enforces database integrity tests before artifact upload)
