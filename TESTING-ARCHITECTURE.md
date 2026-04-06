# CivilCOPZ Testing Architecture

## Current Position

CivilCOPZ now has strong engineering-grade testing coverage:

- Unit and integration tests with PostgreSQL and Redis
- CI test gate before deployment
- Health checks and readiness checks
- Load-test assets
- Baseline authentication and authorization tests

That means the system is production-capable from a software engineering perspective.

It does **not** yet mean the platform is production-proven under real cloud failure conditions.

## Completed Phases

### Phase 1: Integration Test Environment

- Dockerized PostgreSQL and Redis test stack
- Dedicated backend test environment configuration
- Jest runner wired to real services

### Phase 2: CI Test Gate

- GitHub Actions test job with PostgreSQL and Redis
- Deployment gated on tests
- Security scan step in CI

### Phase 3: Health and System Validation

- `/health` endpoint
- `/api/ready` endpoint
- Test coverage for health checks

### Phase 4: Load Testing Assets

- `load-test.js`
- `load-test-node.js`

### Phase 5: Baseline Security Tests

- Unauthorized request rejection
- Invalid and expired JWT rejection
- Role-based access control coverage

## What Is Still Missing Before "Production-Proven"

### Phase 6: Staging Environment Validation

- Cloud Run behavior in a staging project
- Cloud SQL connectivity over private networking
- Redis latency and failure behavior through Memorystore
- Secret injection and IAM behavior in staging

### Phase 7: Chaos Testing

- Database outage behavior
- Redis outage behavior
- AI timeout behavior
- High-latency network behavior

### Phase 8: Data Consistency Validation

- Case creation to evidence upload
- Stored evidence hash validation
- Manifest generation and cross-checking
- Validation under retry and dependency failure

### Phase 9: Observability Validation

- Alert firing validation
- Metrics exposure validation
- Rollback signal validation
- Log completeness validation

### Phase 10: Security Hardening Validation

- Secret Manager access validation
- IAM misconfiguration checks
- Staging unauthorized access checks

## New Validation Assets

- `scripts/staging-readiness.js`
- `scripts/gcp/deploy-staging.js`
- `scripts/gcp/validate-gcp-mirror.js`
- `scripts/gcp/validate-observability.js`
- `scripts/gcp/validate-secrets.js`
- `scripts/gcp/run-chaos.js`
- `scripts/validate-security.js`
- `backend/scripts/evidence-consistency-check.js`
- `backend/tests/integration.test.js` evidence-integrity path coverage
- `PRODUCTION-PROVING-PLAN.md`
- `STAGING-GCP-MIRROR.md`

## Honest Readiness Statement

CivilCOPZ is currently:

- Engineering ready: yes
- Operationally proven in cloud runtime: not yet
- Legally proven under failure conditions: not yet

Use `PRODUCTION-PROVING-PLAN.md` as the source of truth for the remaining work.
