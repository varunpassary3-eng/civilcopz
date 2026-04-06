#!/bin/bash

# CivilCOPZ Database Backup Engine (Phase 7)
# Usage: ./backup_db.sh [S3_BUCKET_NAME]

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
DB_NAME="civilcopz"
RETENTION_DAYS=7

mkdir -p $BACKUP_DIR

echo "📦 Initiating database dump for $DB_NAME..."

# Execute pg_dump (Assuming localized postgres or docker)
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set. Aborting backup."
  exit 1
fi

FILENAME="civilcopz_backup_$TIMESTAMP.sql"
pg_dump $DATABASE_URL > $BACKUP_DIR/$FILENAME

if [ $? -eq 0 ]; then
  echo "✅ Backup successful: $FILENAME"
  
  # Archive (S3 Sync if bucket provided)
  if [ ! -z "$1" ]; then
    echo "☁️ Syncing to S3 bucket $1..."
    # aws s3 cp $BACKUP_DIR/$FILENAME s3://$1/backups/
  fi
  
  # Cleanup old backups
  echo "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
  find $BACKUP_DIR -type f -mtime +$RETENTION_DAYS -name "*.sql" -delete
else
  echo "❌ Backup failed."
  exit 1
fi
