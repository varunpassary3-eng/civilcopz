#!/bin/bash

# CivilCOPZ Secret Manager Verification Script

set -e

PROJECT_ID=${PROJECT_ID:-"your-gcp-project-id"}
REGION="us-central1"

echo "🔍 Verifying Secret Manager Integration..."

# Check if secrets exist
echo "📋 Checking secrets exist..."
secrets=("DB_PASSWORD" "REDIS_PASSWORD" "JWT_SECRET" "OPENAI_API_KEY" "AZURE_AI_ENDPOINT" "AZURE_AI_KEY")

for secret in "${secrets[@]}"; do
  if gcloud secrets describe "$secret" --project="$PROJECT_ID" &>/dev/null; then
    echo "✅ $secret exists"
  else
    echo "❌ $secret missing"
    exit 1
  fi
done

# Check Cloud Run services
echo "🚀 Checking Cloud Run services..."
services=("civilcopz-backend" "civilcopz-ai-worker" "civilcopz-frontend")

for service in "${services[@]}"; do
  if gcloud run services describe "$service" --region="$REGION" --project="$PROJECT_ID" &>/dev/null; then
    echo "✅ $service deployed"
  else
    echo "❌ $service not deployed"
    exit 1
  fi
done

# Check IAM permissions
echo "🔑 Checking IAM permissions..."
CLOUD_RUN_SA="$PROJECT_ID@appspot.gserviceaccount.com"

for secret in "${secrets[@]}"; do
  if gcloud secrets get-iam-policy "$secret" --project="$PROJECT_ID" --format="value(bindings.members)" | grep -q "$CLOUD_RUN_SA"; then
    echo "✅ $secret accessible by Cloud Run"
  else
    echo "❌ $secret not accessible by Cloud Run"
    exit 1
  fi
done

# Check for .env files
echo "🗂️ Checking for exposed secrets..."
if [ -f ".env" ] || [ -f ".env.prod" ] || [ -f ".env.local" ]; then
  echo "❌ .env files found - remove immediately!"
  exit 1
else
  echo "✅ No .env files in repository"
fi

echo ""
echo "🎉 Secret Manager integration verified!"
echo ""
echo "📊 Next steps:"
echo "1. Monitor Cloud Audit Logs for secret access"
echo "2. Set up secret rotation alerts"
echo "3. Implement separate secrets for DEV/STAGING environments"