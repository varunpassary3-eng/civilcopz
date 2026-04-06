# CivilCOPZ Staging GCP Mirror

## Objective

Run a staging environment that mirrors production architecture closely enough to prove behavior before production rollout.

## Target Topology

Use a separate GCP project, for example `civilcopz-staging`, with:

- Cloud Run: `backend-staging`
- Cloud Run: `ai-worker-staging`
- Cloud Run: `frontend-staging`
- Cloud SQL for PostgreSQL: staging-only instance
- Memorystore for Redis: staging-only instance
- Cloud Storage bucket: staging-only bucket
- Secret Manager: staging-only secrets
- Cloud Monitoring: staging alert policies and dashboards
- Pub/Sub + Cloud Function: rollback path

## New Repo Tooling

### Deployment

```bash
npm run deploy:staging
```

Backed by:

- `scripts/gcp/deploy-staging.js`
- `frontend/Dockerfile` now supports `VITE_API_URL` as a build argument
- `backend/Dockerfile.worker` now exists for the AI worker image

### Mirror Validation

```bash
npm run validate:gcp-mirror
```

Checks:

- staging Cloud Run services exist
- Cloud SQL instance exists
- Memorystore instance exists
- staging bucket exists
- monitoring dashboards exist
- staging secrets exist

### Runtime Validation

```bash
npm run validate:staging -- https://BACKEND-STAGING-URL
npm run validate:security -- https://BACKEND-STAGING-URL
npm run validate:evidence -- https://BACKEND-STAGING-URL
npm run validate:observability -- --project civilcopz-staging --region us-central1 --base-url https://BACKEND-STAGING-URL
npm run validate:secrets -- --project civilcopz-staging --region us-central1
```

### Chaos Validation

Database failure:

```bash
npm run chaos -- --scenario db
```

Redis failure:

```bash
npm run chaos -- --scenario redis
```

AI timeout:

```bash
npm run chaos -- --scenario ai
```

Latency test:

```bash
npm run chaos -- --scenario latency --base-url https://BACKEND-STAGING-URL --vus 200 --duration 2m
```

## Required Environment Variables

The GCP automation reads these variables or `--flag` equivalents:

- `STAGING_PROJECT_ID`
- `STAGING_REGION`
- `STAGING_CLOUD_SQL_PRIVATE_IP`
- `STAGING_CLOUD_SQL_INSTANCE`
- `STAGING_REDIS_PRIVATE_IP`
- `STAGING_REDIS_INSTANCE`
- `STAGING_VPC_CONNECTOR`
- `STAGING_BUCKET_NAME`
- `STAGING_RUNTIME_SERVICE_ACCOUNT`
- `BACKEND_IMAGE`
- `AI_WORKER_IMAGE`
- `FRONTEND_IMAGE`

Optional but recommended:

- `DB_PASSWORD_SECRET_VERSION`
- `REDIS_PASSWORD_SECRET_VERSION`
- `JWT_SECRET_SECRET_VERSION`
- `OPENAI_API_KEY_SECRET_VERSION`
- `AZURE_AI_ENDPOINT_SECRET_VERSION`
- `AZURE_AI_KEY_SECRET_VERSION`

## GitHub Workflow

The new staging pipeline lives at:

- `.github/workflows/staging-validation.yml`

Behavior:

1. Runs tests on `develop`
2. Builds backend and worker images
3. Deploys backend and worker to staging
4. Discovers backend staging URL
5. Builds the frontend with the discovered `VITE_API_URL`
6. Deploys frontend to staging
7. Runs mirror, readiness, security, evidence, and observability validations

## Important Runtime Safety Rules

- `ALLOW_MOCK_DB_FALLBACK=false` in staging
- `ALLOW_AI_MOCK_FALLBACK=false` in staging
- AI chaos can be injected with `CHAOS_AI_FAILURE_MODE=timeout|error`
- Evidence validation uses a real PDF fixture at `backend/tests/fixtures/evidence-sample.pdf`

## What This Still Does Not Replace

This tooling makes staging and failure validation executable, but it does not replace:

- rollback drills with human observation
- alert threshold tuning
- multi-region failover design
- disaster recovery planning
- legal/government certification work
