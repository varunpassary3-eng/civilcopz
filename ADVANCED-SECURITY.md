# CivilCOPZ Advanced Security & Automation

## 🚨 Automated Rollback System

### Overview
CivilCOPZ now includes autonomous failure detection and recovery using Cloud Monitoring + Cloud Functions.

### Components
- **Cloud Monitoring Alert Policies**: Detect error rate > 2% and latency > 1.5s
- **Pub/Sub Topic**: `civilcopz-deploy-alerts` for alert notifications
- **Cloud Function**: `civilcopz-rollback` automatically rolls back traffic on alerts

### Setup
```bash
# Deploy rollback function
./deploy-rollback-function.sh

# Create alert policies
./create-alerts.sh
```

### Behavior
1. Canary deployment routes 10% traffic to new revision
2. Cloud Monitoring watches metrics for 5 minutes
3. If error rate > 2% or latency > 1.5s → Alert triggers
4. Cloud Function receives alert via Pub/Sub
5. Function rolls back traffic to previous stable revision
6. System self-heals without human intervention

## 🔐 Binary Authorization + Image Signing

### Overview
All container images must be cryptographically signed before deployment.

### Components
- **KMS Key Ring**: `civilcopz-keyring` for signing keys
- **Attestor**: `civilcopz-attestor` validates signatures
- **Policy**: Enforces signed images only

### Setup
```bash
# Set up Binary Authorization
./setup-binauthz.sh

# Update binauthz-policy.yaml with your PROJECT_ID
# Import policy
gcloud container binauthz policy import binauthz-policy.yaml
```

### Signing Images
```bash
# Sign an image
./sign-image.sh us-central1-docker.pkg.dev/PROJECT_ID/civilcopz/backend:SHA
```

### CI/CD Integration
GitHub Actions now automatically signs images after build.

## 🛡️ Vulnerability Scanning

### Overview
Artifact Registry automatically scans images for vulnerabilities.

### Enforcement
- Critical vulnerabilities block deployment
- Enabled on `civilcopz` repository

## 🔄 Complete Deployment Flow

```
Git Push → Build → Sign → Scan → Deploy (No Traffic) → Canary 10% → Monitor → Promote OR Auto-Rollback
```

## 📊 Monitoring & Alerts

### Metrics Monitored
- Error Rate (5xx responses)
- P95 Latency
- CPU Utilization
- Memory Usage

### Alert Thresholds
- Error Rate: > 2% for 5 minutes
- Latency: > 1.5s P95 for 5 minutes

### Response
- Automatic rollback to previous revision
- Manual intervention possible via Cloud Console

## 🧪 Testing

### Test Rollback
1. Deploy version with intentional 500 errors
2. Wait for canary + monitoring window
3. Verify automatic rollback

### Test Signing
1. Build unsigned image
2. Attempt deployment → Should fail
3. Sign image → Deployment succeeds

## ⚠️ Security Notes

- Keys stored in Cloud KMS (FIPS 140-2 Level 3)
- Attestations immutable and auditable
- All access logged in Cloud Audit Logs
- Zero-trust: Only signed, attested images deploy

This setup provides litigation-grade security and reliability for CivilCOPZ's consumer justice platform.