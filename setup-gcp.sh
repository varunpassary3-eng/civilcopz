#!/bin/bash

# CivilCOPZ GCP CI/CD Setup Script
# This script sets up Cloud Build triggers and required GCP resources

set -e

PROJECT_ID=${PROJECT_ID:-"your-gcp-project-id"}
REGION="us-central1"
REPO_NAME="civilcopz"
BRANCH="main"

echo "🚀 Setting up CivilCOPZ GCP CI/CD Pipeline"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"

# Enable required APIs
echo "📦 Enabling required GCP APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable redis.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Create Artifact Registry repository
echo "🏗️ Creating Artifact Registry repository..."
gcloud artifacts repositories create civilcopz \
  --repository-format=docker \
  --location=$REGION \
  --description="CivilCOPZ container images"

# Create Cloud Build trigger
echo "🔗 Creating Cloud Build trigger..."
gcloud builds triggers create github \
  --name="civilcopz-deploy" \
  --repo-name="$REPO_NAME" \
  --repo-owner="your-github-username" \
  --branch-pattern="^$BRANCH$" \
  --build-config="cloudbuild.yaml" \
  --substitutions="_DB_HOST=10.0.0.10,_REDIS_HOST=10.0.0.20,_VPC_CONNECTOR=civilcopz-connector"

# Create Secret Manager secrets (you need to set actual values)
echo "🔐 Creating Secret Manager secrets..."
gcloud secrets create DB_PASSWORD --replication-policy="automatic"
gcloud secrets create REDIS_PASSWORD --replication-policy="automatic"
gcloud secrets create JWT_SECRET --replication-policy="automatic"
gcloud secrets create OPENAI_API_KEY --replication-policy="automatic"
gcloud secrets create AZURE_AI_ENDPOINT --replication-policy="automatic"
gcloud secrets create AZURE_AI_KEY --replication-policy="automatic"

echo "📝 Add secret values (replace with actual values):"
echo "echo 'your-actual-db-password' | gcloud secrets versions add DB_PASSWORD --data-file=-"
echo "echo 'your-actual-redis-password' | gcloud secrets versions add REDIS_PASSWORD --data-file=-"
echo "echo 'your-actual-jwt-secret' | gcloud secrets versions add JWT_SECRET --data-file=-"
echo "echo 'your-actual-openai-key' | gcloud secrets versions add OPENAI_API_KEY --data-file=-"
echo "echo 'your-actual-azure-endpoint' | gcloud secrets versions add AZURE_AI_ENDPOINT --data-file=-"
echo "echo 'your-actual-azure-key' | gcloud secrets versions add AZURE_AI_KEY --data-file=-"

# Grant permissions to Cloud Build service account
SERVICE_ACCOUNT=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")@cloudbuild.gserviceaccount.com

echo "🔑 Granting permissions to Cloud Build service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"

# Grant Secret Manager access to Cloud Run default service account
CLOUD_RUN_SA="$PROJECT_ID@appspot.gserviceaccount.com"
gcloud secrets add-iam-policy-binding DB_PASSWORD \
  --member="serviceAccount:$CLOUD_RUN_SA" \
  --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding REDIS_PASSWORD \
  --member="serviceAccount:$CLOUD_RUN_SA" \
  --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding JWT_SECRET \
  --member="serviceAccount:$CLOUD_RUN_SA" \
  --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding OPENAI_API_KEY \
  --member="serviceAccount:$CLOUD_RUN_SA" \
  --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding AZURE_AI_ENDPOINT \
  --member="serviceAccount:$CLOUD_RUN_SA" \
  --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding AZURE_AI_KEY \
  --member="serviceAccount:$CLOUD_RUN_SA" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/vpcaccess.user"

# Create VPC Connector (for Cloud SQL/Memorystore access)
echo "🌐 Creating VPC Connector..."
gcloud compute networks create civilcopz-network --subnet-mode=auto || true
gcloud compute networks subnets create civilcopz-subnet \
  --network=civilcopz-network \
  --region=$REGION \
  --range=10.0.0.0/28 || true

gcloud vpc-access connectors create civilcopz-connector \
  --region=$REGION \
  --subnet=civilcopz-subnet \
  --subnet-project=$PROJECT_ID \
  --min-instances=2 \
  --max-instances=10 \
  --machine-type=e2-micro

# Create Cloud Router and NAT for Direct VPC Egress
echo "🌐 Creating Cloud Router and NAT for external API access..."
gcloud compute routers create civilcopz-router \
  --network=civilcopz-network \
  --region=$REGION

gcloud compute routers nats create civilcopz-nat \
  --router=civilcopz-router \
  --region=$REGION \
  --nat-all-subnet-ip-ranges \
  --auto-allocate-nat-external-ips

# Grant Network User role to Cloud Run service account
echo "🔑 Granting Network User role to Cloud Run service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CLOUD_RUN_SA" \
  --role="roles/compute.networkUser"

echo "✅ GCP CI/CD setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update cloudbuild.yaml substitutions with actual Cloud SQL/Memorystore IPs"
echo "2. Set actual secret values using the commands above"
echo "3. Run verification: ./verify-secrets.sh"
echo "4. Push to main branch to trigger deployment"
echo ""
echo "🔍 Monitor builds: gcloud builds list"
echo "🔍 Monitor services: gcloud run services list"
echo "🔍 Check secrets: gcloud secrets list"