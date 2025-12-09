# Database Safety Guidelines

## Critical Protection Mechanisms

This project has **three layers of protection** to prevent accidental production database cleanup:

### Layer 1: Environment Variable Validation
- `.env.test` **MUST** contain `traintrack_test` in the DATABASE_URL
- Any attempt to use a different database name will be rejected
- The test environment is clearly marked with warnings

### Layer 2: NODE_ENV Check
- `cleanDatabase()` **ONLY** runs when `NODE_ENV=test`
- Production and development environments are protected
- Runtime validation ensures correct environment

### Layer 3: Actual Database Name Verification
- Before cleanup, the code queries PostgreSQL for the actual connected database name
- Compares actual database name against expected `traintrack_test`
- **REFUSES** to proceed if there's any mismatch
- This catches configuration errors and misrouted connections

## Safety Checks in Action

When `cleanDatabase()` is called, it performs these checks **in order**:

```typescript
// Check 1: DATABASE_URL validation
if (!databaseUrl.includes('traintrack_test')) {
  throw Error('🚨 SAFETY VIOLATION')
}

// Check 2: NODE_ENV validation
if (process.env.NODE_ENV !== 'test') {
  throw Error('🚨 SAFETY VIOLATION')
}

// Check 3: Actual database name query
const actualDbName = await queryDatabaseName()
if (actualDbName !== 'traintrack_test') {
  throw Error('🚨 SAFETY VIOLATION')
}
```

**All three checks must pass** before any cleanup occurs.

## Database Separation

### Production Database
- Name: `train`
- Used by: Development server (`npm run dev`)
- Environment: `.env` file
- **NEVER** cleaned automatically

### Test Database
- Name: `traintrack_test`
- Used by: Test suite (`npm run test:*`)
- Environment: `.env.test` and `.env.test.local`
- Cleaned between test runs

## Best Practices

### ✅ DO:
- Always check which database you're connected to before running scripts
- Use `NODE_ENV=test` when running tests
- Keep `.env` and `.env.test` separate and clearly labeled
- Review environment variables before running database operations
- Create regular backups of production data

### ❌ DON'T:
- Never manually edit DATABASE_URL in `.env.test` to point to production
- Never set `NODE_ENV=test` in production or development
- Never run `cleanDatabase()` outside of the test suite
- Never bypass the safety checks

## Database Backup Recommendations

To protect against data loss, implement regular backups:

```bash
# Create a backup of production database
docker exec $(docker ps -q -f name=postgres) \
  pg_dump -U postgres train > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker exec -i $(docker ps -q -f name=postgres) \
  psql -U postgres train < backup_YYYYMMDD_HHMMSS.sql
```

### Automated Backup Script

Consider adding a cron job or npm script:

```json
{
  "scripts": {
    "db:backup": "docker exec $(docker ps -q -f name=postgres) pg_dump -U postgres train > backups/train_$(date +%Y%m%d_%H%M%S).sql",
    "db:restore": "echo 'Specify backup file to restore'"
  }
}
```

## Emergency Recovery

If production data is accidentally deleted:

1. **Stop all database operations immediately**
2. Check for PostgreSQL automatic backups (if configured)
3. Check Docker volume snapshots (if using Docker Desktop with backups enabled)
4. Check system Time Machine backups (macOS)
5. Restore from most recent manual backup
6. As a last resort, recreate accounts manually

## Testing the Safety Mechanisms

You can verify the safety checks work by attempting to run cleanup against production:

```typescript
// This should FAIL with safety violation error
DATABASE_URL="postgresql://postgres:password@localhost:5432/train" \
NODE_ENV=test \
npm run test:unit
```

The test will refuse to run and show:
```
🚨 SAFETY VIOLATION: Connected to wrong database!
Expected: traintrack_test
Actual: train
REFUSING to clean production database.
```

## Summary

- **3 layers** of protection prevent accidental cleanup
- **Separate databases** for production and testing
- **Clear warnings** in configuration files
- **Runtime validation** of database connections
- **Explicit checks** before destructive operations

These safeguards make it extremely difficult to accidentally harm production data while still allowing efficient test database cleanup.
