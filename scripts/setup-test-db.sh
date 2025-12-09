#!/bin/bash
# Setup test database
# Run this script once to initialize the test database

set -e

echo "Setting up test database..."

# Set the test database URL
export DATABASE_URL="postgresql://postgres:password@localhost:5432/traintrack_test"

# Run Prisma migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Test database setup complete!"
