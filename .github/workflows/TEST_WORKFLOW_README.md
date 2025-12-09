# Test Workflow Documentation

## Overview

The `test.yml` workflow provides comprehensive CI/CD testing for the TrainTrack application, including linting, type checking, unit tests, integration tests, and end-to-end tests.

## Workflow Features

### Triggers
- **Push**: Automatically runs on pushes to `main` and `develop` branches
- **Pull Requests**: Runs on all PRs targeting `main` or `develop` branches

### Test Sequence
1. **Linting** - ESLint checks for code quality
2. **Type Checking** - TypeScript compilation check
3. **Database Migrations** - Applies Prisma migrations to test database
4. **Unit Tests** - Fast, isolated tests (via Vitest)
5. **Integration Tests** - Tests with database interactions (via Vitest)
6. **E2E Tests** - Full application tests (via Playwright)
7. **Coverage Report** - Generates code coverage metrics

### Key Features

#### PostgreSQL Service
- Uses PostgreSQL 16 as a service container
- Includes health checks to ensure database is ready
- Automatically configured with test credentials

#### Caching Strategy
- **node_modules**: Cached based on `package-lock.json` hash
- **Playwright browsers**: Cached to speed up subsequent runs
- Reduces build time significantly after the first run

#### Artifact Uploads
- **Playwright reports**: Uploaded only on test failures (30-day retention)
- **Test results**: Uploaded on failures for debugging
- **Coverage reports**: Always uploaded for analysis

#### Timeouts
- **Job timeout**: 30 minutes for the entire test suite
- **E2E timeout**: 15 minutes specifically for E2E tests
- Prevents hanging tests from consuming runner minutes

## Status Badge

Add this badge to your README.md to show the test status:

### Markdown
\`\`\`markdown
[![Test Suite](https://github.com/USERNAME/REPOSITORY/actions/workflows/test.yml/badge.svg)](https://github.com/USERNAME/REPOSITORY/actions/workflows/test.yml)
\`\`\`

### HTML
\`\`\`html
<img src="https://github.com/USERNAME/REPOSITORY/actions/workflows/test.yml/badge.svg" alt="Test Suite">
\`\`\`

Replace `USERNAME` and `REPOSITORY` with your GitHub username and repository name.

## Environment Variables

All required environment variables are defined in the workflow file based on `.env.test`:

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Authentication secret
- `NEXTAUTH_URL`: Application URL
- `ENCRYPTION_KEY`: Encryption key for sensitive data
- `SENDGRID_API_KEY`: Mock SendGrid key
- `GOOGLE_CLIENT_ID`: Mock Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Mock Google OAuth secret
- `CRON_SECRET`: Cron job authentication
- `NODE_ENV`: Set to 'test'
- `CI`: Set to 'true'

## Optional: Multi-Version Testing

The workflow includes a commented-out matrix strategy for testing across multiple Node.js versions. To enable:

1. Uncomment the `test-matrix` job in `test.yml`
2. Adjust the node versions in the matrix as needed
3. Consider if you need this - it will increase CI time and runner usage

## Local Testing

To replicate the CI environment locally:

\`\`\`bash
# 1. Start PostgreSQL (Docker recommended)
docker run -d \\
  --name traintrack-test-db \\
  -e POSTGRES_USER=postgres \\
  -e POSTGRES_PASSWORD=password \\
  -e POSTGRES_DB=traintrack_test \\
  -p 5432:5432 \\
  postgres:16

# 2. Install dependencies
npm ci

# 3. Generate Prisma client
npm run prisma:generate

# 4. Install Playwright browsers
npx playwright install --with-deps chromium

# 5. Run migrations
npm run prisma:deploy

# 6. Run the test sequence
npm run lint
npm run type-check
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:coverage
\`\`\`

## Troubleshooting

### Playwright Installation Issues
If Playwright browser installation fails:
- Check that `npx playwright install-deps` is run for system dependencies
- Ensure sufficient disk space for browser binaries
- Review Playwright cache location: `~/.cache/ms-playwright`

### Database Connection Issues
If tests fail to connect to PostgreSQL:
- Verify the health check is passing in the workflow logs
- Ensure `DATABASE_URL` matches the service configuration
- Check that migrations complete successfully

### Timeout Issues
If tests timeout:
- Review E2E test performance (they're the slowest)
- Consider increasing timeout values in `playwright.config.ts`
- Check for hanging database connections or transactions

### Cache Issues
If caching causes problems:
- Manually clear the cache from GitHub Actions cache settings
- Update cache keys by modifying the workflow file
- Ensure `package-lock.json` is committed

## Coverage Reports

Coverage reports are generated using Vitest's coverage tool (v8 provider):

- **Thresholds**: 80% for lines, functions, branches, and statements
- **Excluded**: node_modules, tests, .next, config files, migrations, scripts
- **Formats**: Text (console), JSON, HTML, LCOV
- **Upload**: Optional Codecov integration included (commented out)

To view coverage locally:
\`\`\`bash
npm run test:coverage
# Open coverage/index.html in your browser
\`\`\`

## Integration with Codecov (Optional)

To enable Codecov integration:

1. Sign up at [codecov.io](https://codecov.io)
2. Add your repository
3. Add `CODECOV_TOKEN` to GitHub repository secrets
4. Uncomment the Codecov upload step in the workflow
5. Add Codecov badge to README

## Performance Optimization

Current optimizations:
- Node modules caching (saves ~2-3 minutes)
- Playwright browser caching (saves ~1-2 minutes)
- Single worker for E2E tests (prevents database conflicts)
- Sequential integration tests (prevents deadlocks)
- Chromium-only testing (add Firefox/WebKit if needed)

Expected run time:
- First run: ~8-12 minutes
- Subsequent runs: ~5-8 minutes (with cache hits)

## Best Practices

1. **Keep tests fast**: Unit tests should be under 30s, integration under 2min
2. **Fix flaky tests**: E2E tests can be flaky, use proper waits and retries
3. **Monitor coverage**: Aim to maintain or improve coverage with each PR
4. **Review artifacts**: Check uploaded artifacts when tests fail
5. **Update dependencies**: Keep testing tools up to date for security and features
