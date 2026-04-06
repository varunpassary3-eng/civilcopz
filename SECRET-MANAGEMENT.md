# CivilCOPZ Secret Management Guide

## 🔐 Secret Manager Integration Complete

All sensitive data has been moved to Google Cloud Secret Manager for secure, auditable access.

### 📋 Secrets Managed

| Secret Name | Purpose | Access Level |
|-------------|---------|--------------|
| `DB_PASSWORD` | PostgreSQL database password | Cloud Run services |
| `REDIS_PASSWORD` | Redis cache password | Cloud Run services |
| `JWT_SECRET` | JWT token signing secret | Backend service |
| `OPENAI_API_KEY` | OpenAI API access | AI Worker service |
| `AZURE_AI_ENDPOINT` | Azure AI endpoint URL | AI Worker service |
| `AZURE_AI_KEY` | Azure AI access key | AI Worker service |

### 🔑 Access Control

- **Service Accounts:** Only Cloud Run services can access secrets
- **IAM Role:** `roles/secretmanager.secretAccessor`
- **No Code Exposure:** Secrets never appear in source code or logs

### 🚀 Deployment Security

Cloud Build now injects secrets at runtime:

```yaml
--set-secrets=DB_PASSWORD=DB_PASSWORD:latest,\
JWT_SECRET=JWT_SECRET:latest,\
OPENAI_API_KEY=OPENAI_API_KEY:latest
```

### ✅ Verification Steps

After deployment, verify:

1. **No .env files in repo:** `git status` should show clean
2. **Services start:** `gcloud run services list` shows healthy
3. **Secrets accessible:** Check Cloud Run logs (values masked)
4. **IAM correct:** `gcloud secrets get-iam-policy DB_PASSWORD`

### 🔄 Secret Rotation

To rotate a secret:

```bash
# Add new version
echo "new-secret-value" | gcloud secrets versions add SECRET_NAME --data-file=-

# Update Cloud Run to use latest
gcloud run services update-traffic SERVICE --to-latest
```

### ⚠️ Security Notes

- Never commit secrets to Git
- Rotate keys regularly (90 days)
- Monitor access in Cloud Audit Logs
- Use separate secrets per environment (PROD/DEV)

### 🛡️ Breach Response

If a secret is compromised:

1. **Immediate:** Disable the secret version
2. **Rotate:** Create new secret version
3. **Update:** Deploy new service revision
4. **Audit:** Review Cloud Audit Logs for access

This setup provides litigation-grade security for CivilCOPZ's sensitive legal data.