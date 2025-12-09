#!/bin/bash

# Database Backup Script
# Creates timestamped backups of the production database

set -e  # Exit on error

# Configuration
BACKUP_DIR="backups"
DB_NAME="train"
POSTGRES_USER="postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🗄️  TrainTrack Database Backup${NC}"
echo "================================"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if Docker container is running
if ! docker ps -q -f name=postgres > /dev/null 2>&1; then
  echo -e "${RED}❌ Error: PostgreSQL Docker container is not running${NC}"
  exit 1
fi

echo "📦 Creating backup of database: $DB_NAME"
echo "📁 Backup location: $BACKUP_FILE"

# Create the backup
if docker exec $(docker ps -q -f name=postgres) \
  pg_dump -U "$POSTGRES_USER" "$DB_NAME" > "$BACKUP_FILE"; then

  # Get file size
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

  echo -e "${GREEN}✅ Backup completed successfully!${NC}"
  echo "📊 Backup size: $SIZE"
  echo "🕐 Timestamp: $TIMESTAMP"

  # Keep only last 10 backups
  echo ""
  echo "🧹 Cleaning up old backups (keeping last 10)..."
  ls -t "$BACKUP_DIR"/*.sql 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

  BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.sql 2>/dev/null | wc -l | tr -d ' ')
  echo "📚 Total backups: $BACKUP_COUNT"

else
  echo -e "${RED}❌ Backup failed!${NC}"
  exit 1
fi
