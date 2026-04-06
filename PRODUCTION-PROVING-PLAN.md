# CivilCOPZ Production-Proving Plan

## Status

CivilCOPZ is currently:

- Engineering ready: yes
- Production-capable: yes
- Production-proven: not yet

What is still missing is proof in a production-like runtime and proof under failure.

## Phase 6: Staging Environment

Goal: create a GCP environment that mirrors production closely enough to expose cloud-only failures before launch.

### Required topology

- Project: `civilcopz-staging`
- Backend API: Cloud Run service
- Worker runtime: separate Cloud Run service
- Frontend: Cloud Run service or static edge hosting, but it must point to the staging API
- Database: Cloud SQL for PostgreSQL on private networking
- Cache and queues: Memorystore for Redis on private networking
- Secrets: Secret Manager, separated from production secrets
- Monitoring: Cloud Monitoring alert policies plus log-based alerting
- Rollback path: revision-based Cloud Run rollback tested in staging

### Required service boundaries

- Separate staging service accounts from production
- Separate staging secrets from production
- Separate staging database and Redis instances from production
- Separate alert channels so staging tests do not page production responders

### Runtime checks to execute in staging

Run these after each staging deploy:

```bash
npm run validate:staging -- https://YOUR-STAGING-URL
```

This validates:

- `/startup`
- `/health`
- `/api/ready`
- `/metrics`

## Phase 7: Chaos Testing

Goal: prove the system fails safely, not just that it works when dependencies are healthy.

### Experiment matrix

1. Database outage
   Expected result: requests fail explicitly, no silent mock data, no partial writes.
2. Redis outage
   Expected result: API stays up for uncached flows, cache-dependent features degrade gracefully, process does not crash.
3. AI timeout
   Expected result: request path or queue path returns controlled fallback behavior, retries remain bounded, queue depth stays stable.
4. Network latency spike
   Expected result: alerts trigger before user-facing timeout rates become unacceptable, canary is halted or rolled back.

### Minimum pass criteria

- No data corruption
- No silent fallback to fabricated records
- Alerts fire within the target window
- Rollback runbook works on the current revision layout

## Phase 8: Data Consistency Validation

Goal: prove the legal evidence chain remains consistent from upload through verification.

### Validation flow

1. Create a case with a real PDF evidence file.
2. Confirm stored `fileHash` matches the local SHA-256 of the uploaded file.
3. Record chain-of-custody upload for the document id returned by the API.
4. Generate a verification manifest.
5. Confirm the manifest references the same document id and same hash.

Run:

```bash
npm run validate:evidence
```

Required environment variables:

- `BASE_URL`
- `AUTH_TOKEN`
- `EVIDENCE_PDF_PATH`

The validation script performs the create, custody, and manifest checks end to end.

## Phase 9: Observability Validation

Goal: prove monitoring is actionable, not merely configured.

### What must be proven

- `/metrics` exposes the expected Prometheus metrics
- Cloud Monitoring alerts actually open incidents
- Logs are queryable for the tested failure cases
- Error-rate and latency thresholds are tuned to canary rollout windows
- Rollback commands are current for the deployed revision model

### Evidence to collect

- Alert screenshots or incident ids
- Revision ids before and after rollback
- Log queries that show the failure window and recovery window

## Phase 10: Security Hardening Validation

Goal: prove that the cloud security model behaves correctly in staging.

### Required checks

- Secret Manager access works with staging identities only
- Removing a required secret or IAM binding causes an explicit startup failure
- Unauthorized API requests are rejected in staging exactly as in CI
- Service accounts do not have production-level access unnecessarily

## Repo Changes Supporting This Plan

This repo now includes:

- `scripts/staging-readiness.js` for staging probe and metrics validation
- `scripts/gcp/deploy-staging.js` for staging deployment
- `scripts/gcp/validate-gcp-mirror.js` for staging resource verification
- `scripts/gcp/run-chaos.js` for controlled failure scenarios
- `scripts/gcp/validate-observability.js` for alert/log wiring checks
- `scripts/gcp/validate-secrets.js` for Secret Manager and Cloud Run secret reference checks
- `scripts/validate-security.js` for 401/403 validation against staging
- `backend/scripts/evidence-consistency-check.js` for end-to-end evidence integrity checks
- `.github/workflows/staging-validation.yml` for develop-branch staging deployment and validation
- Content-based evidence hashing instead of filename-based hashing
- Consistent document ids across evidence storage, custody, and manifest generation
- `/startup` and `/metrics` endpoints for cloud probe and observability validation
- Production-like database behavior that no longer silently falls back to mock data unless explicitly enabled

## Honest Readiness Statement

Use this wording until the remaining phases are executed:

> CivilCOPZ is production-capable and engineering-complete, but it is not yet production-proven until staging, chaos, observability, rollback, and evidence-consistency validation are completed against cloud infrastructure.
