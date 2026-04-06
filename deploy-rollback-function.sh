#!/bin/bash

# Deploy Automated Rollback Cloud Function

set -e

PROJECT_ID=${PROJECT_ID:-"your-gcp-project-id"}
REGION="us-central1"
FUNCTION_NAME="civilcopz-rollback"
TOPIC_NAME="civilcopz-deploy-alerts"

echo "🚀 Deploying automated rollback Cloud Function..."

# Enable required APIs
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable pubsub.googleapis.com
gcloud services enable monitoring.googleapis.com

# Create Pub/Sub topic for alerts
gcloud pubsub topics create $TOPIC_NAME || echo "Topic already exists"

# Deploy Cloud Function
gcloud functions deploy $FUNCTION_NAME \
  --runtime nodejs18 \
  --trigger-topic $TOPIC_NAME \
  --source . \
  --entry-point rollbackOnAlert \
  --region $REGION \
  --memory 256MB \
  --timeout 120s \
  --set-env-vars PROJECT_ID=$PROJECT_ID

# Grant permissions to Cloud Function service account
FUNCTION_SA="$PROJECT_ID@appspot.gserviceaccount.com"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$FUNCTION_SA" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$FUNCTION_SA" \
  --role="roles/iam.serviceAccountUser"

echo "✅ Rollback function deployed!"
echo ""
echo "📋 Next: Create Cloud Monitoring alert policy that publishes to $TOPIC_NAME"