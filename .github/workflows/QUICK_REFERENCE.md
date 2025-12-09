# Test Workflow - Quick Reference Card

## Status Badge (Add to README.md)

```markdown
[![Test Suite](https://github.com/gavincwyant/trainer_tool/actions/workflows/test.yml/badge.svg)](https://github.com/gavincwyant/trainer_tool/actions/workflows/test.yml)
```

## Workflow Overview

| Feature | Configuration |
|---------|--------------|
| **Name** | Test Suite |
| **Triggers** | Push to main/develop, All PRs |
| **Node Version** | 20.x |
| **PostgreSQL** | Version 16 |
| **Timeout** | 30 minutes (job), 15 minutes (E2E) |
| **Runner** | ubuntu-latest |

## Test Execution Order

1. Linting → `npm run lint`
2. Type Checking → `npm run type-check`
3. Database Migrations → `npm run prisma:deploy`
4. Unit Tests → `npm run test:unit`
5. Integration Tests → `npm run test:integration`
6. E2E Tests → `npm run test:e2e`
7. Coverage Report → `npm run test:coverage`

## Environment Variables

All automatically configured from `.env.test`:

- `DATABASE_URL` - PostgreSQL connection
- `NEXTAUTH_SECRET` - Auth secret
- `NEXTAUTH_URL` - App URL
- `ENCRYPTION_KEY` - Encryption key
- `SENDGRID_API_KEY` - Email service
- `GOOGLE_CLIENT_ID` - OAuth client
- `GOOGLE_CLIENT_SECRET` - OAuth secret
- `CRON_SECRET` - Cron security
- `NODE_ENV=test`
- `CI=true`

## Caching Strategy

| Cache | Key | Path |
|-------|-----|------|
| NPM | setup-node built-in | npm cache |
| node_modules | package-lock.json hash | ./node_modules |
| Playwright | package-lock.json hash | ~/.cache/ms-playwright |

## Artifacts (Auto-uploaded)

| Artifact | When | Retention |
|----------|------|-----------|
| playwright-report | On failure | 30 days |
| playwright-test-results | On failure | 30 days |
| coverage-report | Always | 30 days |

## Quick Commands

### Deploy Workflow
```bash
git add .github/workflows/test.yml
git commit -m "Add test workflow"
git push origin main
```

### View Workflow Status
```bash
# Using GitHub CLI
gh run list --workflow=test.yml
gh run watch
```

### Download Artifacts (if failed)
```bash
gh run download <run-id>
```

### Local Test Replication
```bash
# Start PostgreSQL
docker run -d \
  --name traintrack-test \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=traintrack_test \
  -p 5432:5432 \
  postgres:16

# Run test sequence
npm ci
npm run prisma:generate
npx playwright install --with-deps chromium
npm run prisma:deploy
npm run lint
npm run type-check
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:coverage
```

## Performance Benchmarks

| Run Type | Expected Duration |
|----------|------------------|
| First run (no cache) | 8-12 minutes |
| Cached run | 5-8 minutes |
| Lint + Type Check | ~30 seconds |
| Unit Tests | ~30 seconds |
| Integration Tests | 1-2 minutes |
| E2E Tests | 3-5 minutes |

## Common Issues & Solutions

### Issue: Tests pass locally but fail in CI
**Solution**: Check environment variables and ensure `CI=true` is set locally

### Issue: Playwright browsers not installing
**Solution**: Check cache, clear if needed, ensure `--with-deps` flag is used

### Issue: Database connection timeout
**Solution**: Verify PostgreSQL health checks are passing, check DATABASE_URL

### Issue: Running out of GitHub Actions minutes
**Solution**: Optimize test speed, use caching, avoid matrix testing on private repos

## Files Reference

- **Main Workflow**: `.github/workflows/test.yml`
- **Full Documentation**: `.github/workflows/TEST_WORKFLOW_README.md`
- **Setup Guide**: `.github/workflows/SETUP_INSTRUCTIONS.md`
- **Badge Info**: `.github/workflows/STATUS_BADGE.md`
- **Checklist**: `.github/workflows/CHECKLIST.md`

## GitHub Actions Paths

- **View Runs**: `https://github.com/gavincwyant/trainer_tool/actions`
- **This Workflow**: `https://github.com/gavincwyant/trainer_tool/actions/workflows/test.yml`
- **Settings**: `https://github.com/gavincwyant/trainer_tool/settings/actions`

## Monitoring

### Check Last Run Status
```bash
gh run list --workflow=test.yml --limit 1
```

### View Logs
```bash
gh run view --log
```

### Re-run Failed Jobs
```bash
gh run rerun <run-id> --failed
```

## Optional Features (Commented Out)

### Enable Multi-Version Testing
Uncomment `test-matrix` job in `test.yml`
- Tests on Node 18.x, 20.x, 22.x
- Increases CI time ~3x

### Enable Codecov
1. Add `CODECOV_TOKEN` to repository secrets
2. Already configured in workflow (lines 123-132)

### Enable Manual Trigger
Add to `on:` section:
```yaml
workflow_dispatch:
```

## Key Actions Used

- `actions/checkout@v4` - Code checkout
- `actions/setup-node@v4` - Node.js installation
- `actions/cache@v4` - Dependency caching
- `actions/upload-artifact@v4` - Artifact uploads
- `codecov/codecov-action@v4` - Coverage upload

---

**Need Help?** Check `SETUP_INSTRUCTIONS.md` or GitHub Actions documentation
