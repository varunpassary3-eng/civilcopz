#!/bin/bash

# Set up Binary Authorization for CivilCOPZ

set -e

PROJECT_ID=${PROJECT_ID:-"your-gcp-project-id"}
REGION="us-central1"
ATTESTOR_NAME="civilcopz-attestor"
KEY_RING_NAME="civilcopz-keyring"
KEY_NAME="civilcopz-signing-key"

echo "🔐 Setting up Binary Authorization..."

# Enable Binary Authorization API
gcloud services enable binaryauthorization.googleapis.com

# Create Key Ring and Key for signing
gcloud kms keyrings create $KEY_RING_NAME \
  --location global \
  --project $PROJECT_ID

gcloud kms keys create $KEY_NAME \
  --keyring $KEY_RING_NAME \
  --location global \
  --purpose asymmetric-signing \
  --algorithm rsa-sign-pkcs1-2048-sha256 \
  --project $PROJECT_ID

# Create Attestor
gcloud container binauthz attestors create $ATTESTOR_NAME \
  --attestation-authority-note-id=$ATTESTOR_NAME \
  --attestation-authority-note-project=$PROJECT_ID \
  --project $PROJECT_ID

# Add public key to attestor
PUBLIC_KEY_ID=$(gcloud kms keys versions describe 1 \
  --key $KEY_NAME \
  --keyring $KEY_RING_NAME \
  --location global \
  --format "value(name)" \
  --project $PROJECT_ID)

gcloud container binauthz attestors public-keys add \
  --attestor=$ATTESTOR_NAME \
  --keyversion=$PUBLIC_KEY_ID \
  --project $PROJECT_ID

# Import policy (update YOUR_PROJECT_ID in binauthz-policy.yaml first)
echo "📝 Update binauthz-policy.yaml with your PROJECT_ID, then run:"
echo "gcloud container binauthz policy import binauthz-policy.yaml --project $PROJECT_ID"

# Enable vulnerability scanning in Artifact Registry
gcloud artifacts repositories update civilcopz \
  --location=$REGION \
  --enable-vulnerability-scanning \
  --project $PROJECT_ID

echo "✅ Binary Authorization setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update binauthz-policy.yaml with your PROJECT_ID"
echo "2. Import the policy: gcloud container binauthz policy import binauthz-policy.yaml"
echo "3. Sign images before deployment (see sign-image.sh)"