#!/bin/bash

# Create Cloud Monitoring alert policy for automated rollback

set -e

PROJECT_ID=${PROJECT_ID:-"your-gcp-project-id"}
TOPIC_NAME="civilcopz-deploy-alerts"

echo "📊 Creating Cloud Monitoring alert policy..."

# Create alert policy for error rate
gcloud monitoring channels create pubsub \
  --display-name="CivilCOPZ Deploy Alerts" \
  --topic="$TOPIC_NAME" \
  --project="$PROJECT_ID"

CHANNEL_ID=$(gcloud monitoring channels list --filter="displayName:CivilCOPZ Deploy Alerts" --format="value(name)" --project="$PROJECT_ID")

# Create alert policy
gcloud monitoring policies create \
  --display-name="CivilCOPZ Backend Error Rate Alert" \
  --condition-display-name="Error Rate > 2%" \
  --condition-filter='metric.type="run.googleapis.com/request_count" AND resource.type="cloud_run_revision" AND metric.label.response_code_class="5xx"' \
  --condition-threshold-value=0.02 \
  --condition-threshold-duration=300s \
  --condition-aggregation-aligner=ALIGN_RATE \
  --condition-aggregation-reducer=REDUCE_SUM \
  --condition-aggregation-window=300s \
  --notification-channels="$CHANNEL_ID" \
  --project="$PROJECT_ID"

# Create alert for latency
gcloud monitoring policies create \
  --display-name="CivilCOPZ Backend Latency Alert" \
  --condition-display-name="P95 Latency > 1.5s" \
  --condition-filter='metric.type="run.googleapis.com/request_latencies" AND resource.type="cloud_run_revision"' \
  --condition-threshold-value=1.5 \
  --condition-threshold-duration=300s \
  --condition-aggregation-aligner=ALIGN_PERCENTILE_95 \
  --condition-aggregation-reducer=REDUCE_NONE \
  --condition-aggregation-window=300s \
  --notification-channels="$CHANNEL_ID" \
  --project="$PROJECT_ID"

echo "✅ Alert policies created!"
echo ""
echo "📋 Alerts will trigger Cloud Function for automated rollback on:"
echo "- Error rate > 2% for 5 minutes"
echo "- P95 latency > 1.5s for 5 minutes"