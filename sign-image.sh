#!/bin/bash

# Sign container image for Binary Authorization

set -e

PROJECT_ID=${PROJECT_ID:-${GCP_PROJECT_ID:-""}}
REGION="us-central1"
ATTESTOR_NAME="civilcopz-attestor"
IMAGE_URI=$1

if [ -z "$IMAGE_URI" ]; then
  echo "Usage: $0 <image-uri>"
  echo "Example: $0 us-central1-docker.pkg.dev/my-project/civilcopz/backend:abc123"
  exit 1
fi

if [ -z "$PROJECT_ID" ]; then
  echo "PROJECT_ID or GCP_PROJECT_ID must be set before signing images."
  exit 1
fi

echo "🔏 Signing image: $IMAGE_URI"

# Create attestation
gcloud beta container binauthz attestations sign-and-create \
  --artifact-url="$IMAGE_URI" \
  --attestor="projects/$PROJECT_ID/attestors/$ATTESTOR_NAME" \
  --keyversion="projects/$PROJECT_ID/locations/global/keyRings/civilcopz-keyring/cryptoKeys/civilcopz-signing-key/cryptoKeyVersions/1" \
  --project $PROJECT_ID

echo "✅ Image signed successfully!"
echo "Image can now be deployed with Binary Authorization enforcement."
