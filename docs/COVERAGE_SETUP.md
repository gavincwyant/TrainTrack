# Test Coverage Setup and Integration Guide

This document describes the test coverage configuration and how to integrate with CI/CD platforms.

## Overview

TrainTrack uses Vitest with v8 coverage provider to track code coverage across unit and integration tests. Coverage reports are generated in multiple formats for different use cases.

## Coverage Configuration

### Thresholds

The project maintains the following coverage thresholds:

**Global Thresholds:**
- Lines: 80%
- Functions: 80%
- Branches: 75%
- Statements: 80%

**Service Layer (`lib/services/**`) - Stricter Thresholds:**
- Lines: 90%
- Functions: 90%
- Branches: 85%
- Statements: 90%

Service layer files contain critical business logic and require higher coverage to ensure reliability.

### Excluded Files

The following files are excluded from coverage reporting:

- Test files (`**/*.test.ts`, `**/*.spec.ts`)
- Configuration files (`**/*.config.ts`, `**/*.config.js`)
- Type definitions (`**/*.d.ts`, `types/**`)
- Database migrations (`prisma/migrations/**`)
- Build output (`.next/`, `out/`, `build/`)
- Scripts (`scripts/**`)
- Layout/routing files (`app/**/layout.tsx`, `app/**/loading.tsx`, etc.)
- Middleware (tested via integration tests)

## Local Coverage Reports

### Running Coverage

```bash
# Run all tests with coverage
npm run test:coverage

# Run only unit tests with coverage
npm run test:coverage:unit

# Run only integration tests with coverage
npm run test:coverage:integration

# Generate coverage and open HTML report in browser (macOS)
npm run test:coverage:open
```

### Viewing Coverage Reports

Coverage reports are generated in multiple formats:

1. **Terminal Output** (`text` and `text-summary`)
   - Displayed immediately after running tests
   - Shows summary statistics and uncovered files

2. **HTML Report** (`coverage/index.html`)
   - Interactive web interface
   - Browse files, see line-by-line coverage
   - Open with: `npm run test:coverage:open` or manually open `coverage/index.html`

3. **LCOV Report** (`coverage/lcov.info`)
   - Standard format for CI/CD integration
   - Used by Codecov, Coveralls, and other services

4. **JSON Report** (`coverage/coverage-final.json`)
   - Programmatic access to coverage data
   - Useful for custom reporting tools

## CI/CD Integration

### Option 1: Codecov (Recommended)

Codecov provides GitHub PR comments, coverage badges, and detailed analytics.

#### Setup Steps

1. **Sign up for Codecov**
   - Go to [codecov.io](https://codecov.io)
   - Sign in with GitHub
   - Add your repository

2. **Get Upload Token**
   - Navigate to your repository on Codecov
   - Copy the `CODECOV_TOKEN` from Settings

3. **Add GitHub Secret**
   ```
   Repository → Settings → Secrets → Actions → New repository secret
   Name: CODECOV_TOKEN
   Value: <your-token>
   ```

4. **Update GitHub Actions Workflow**

   Create or update `.github/workflows/test.yml`:

   ```yaml
   name: Test and Coverage

   on:
     push:
       branches: [main, develop]
     pull_request:
       branches: [main, develop]

   jobs:
     test:
       runs-on: ubuntu-latest

       services:
         postgres:
           image: postgres:16
           env:
             POSTGRES_USER: postgres
             POSTGRES_PASSWORD: password
             POSTGRES_DB: traintrack_test
           ports:
             - 5432:5432
           options: >-
             --health-cmd pg_isready
             --health-interval 10s
             --health-timeout 5s
             --health-retries 5

       steps:
         - uses: actions/checkout@v4

         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20'
             cache: 'npm'

         - name: Install dependencies
           run: npm ci

         - name: Generate Prisma Client
           run: npm run prisma:generate

         - name: Run database migrations
           run: npm run prisma:deploy
           env:
             DATABASE_URL: postgresql://postgres:password@localhost:5432/traintrack_test

         - name: Run tests with coverage
           run: npm run test:coverage
           env:
             DATABASE_URL: postgresql://postgres:password@localhost:5432/traintrack_test
             NEXTAUTH_SECRET: test-secret-key-for-ci
             NEXTAUTH_URL: http://localhost:3000

         - name: Upload coverage to Codecov
           uses: codecov/codecov-action@v4
           with:
             token: ${{ secrets.CODECOV_TOKEN }}
             files: ./coverage/lcov.info
             flags: unittests
             name: codecov-umbrella
             fail_ci_if_error: true
   ```

5. **Add Coverage Badge to README**

   After first coverage upload, add to README.md:

   ```markdown
   [![codecov](https://codecov.io/gh/YOUR_USERNAME/train/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/train)
   ```

#### Codecov Configuration

Create `codecov.yml` in repository root for advanced configuration:

```yaml
coverage:
  status:
    project:
      default:
        target: 80%
        threshold: 1%
    patch:
      default:
        target: 80%

comment:
  layout: "reach, diff, flags, files"
  behavior: default
  require_changes: false

ignore:
  - "tests/**"
  - "**/*.config.ts"
  - "**/*.d.ts"
  - "prisma/migrations/**"
```

### Option 2: Coveralls

Coveralls is another popular coverage tracking service.

#### Setup Steps

1. **Sign up for Coveralls**
   - Go to [coveralls.io](https://coveralls.io)
   - Sign in with GitHub
   - Add your repository

2. **Get Repo Token**
   - Find your repository on Coveralls
   - Copy the repo token from Settings

3. **Add GitHub Secret**
   ```
   Repository → Settings → Secrets → Actions → New repository secret
   Name: COVERALLS_REPO_TOKEN
   Value: <your-token>
   ```

4. **Update GitHub Actions Workflow**

   Add this step to your test workflow:

   ```yaml
   - name: Upload coverage to Coveralls
     uses: coverallsapp/github-action@v2
     with:
       github-token: ${{ secrets.GITHUB_TOKEN }}
       path-to-lcov: ./coverage/lcov.info
   ```

5. **Add Coverage Badge to README**

   ```markdown
   [![Coverage Status](https://coveralls.io/repos/github/YOUR_USERNAME/train/badge.svg?branch=main)](https://coveralls.io/github/YOUR_USERNAME/train?branch=main)
   ```

### Option 3: GitHub Actions Only (No External Service)

You can generate coverage comments directly in GitHub Actions without external services.

1. **Install Coverage Report Action**

   Add to your workflow:

   ```yaml
   - name: Test Coverage Report
     uses: ArtiomTr/jest-coverage-report-action@v2
     if: github.event_name == 'pull_request'
     with:
       test-script: npm run test:coverage
       annotations: failed-tests
       coverage-file: ./coverage/coverage-summary.json
       base-coverage-file: ./coverage/coverage-summary.json
   ```

   Note: This action works with Vitest since it generates compatible output.

## Coverage Best Practices

### 1. Write Tests First
- Aim for 100% coverage on new features
- Write tests before implementing features (TDD)

### 2. Focus on Critical Paths
- Service layer (business logic): 90%+ coverage required
- API routes: 85%+ coverage target
- Authentication/authorization: 95%+ coverage
- UI components: 70%+ coverage (focus on logic, not styling)

### 3. Meaningful Coverage
- Coverage percentage is a metric, not a goal
- Ensure tests validate behavior, not just execute code
- Test edge cases, error handling, and boundary conditions

### 4. Review Coverage Reports
- Check HTML report regularly: `npm run test:coverage:open`
- Identify untested code paths
- Add tests for complex logic branches

### 5. Monitor Coverage Trends
- Use Codecov/Coveralls to track coverage over time
- Prevent coverage regression in PRs
- Set up PR status checks to fail if coverage drops

## Troubleshooting

### Coverage Reports Not Generated

If coverage reports are missing:

```bash
# Ensure coverage package is installed
npm install --save-dev @vitest/coverage-v8

# Clean and regenerate
rm -rf coverage
npm run test:coverage
```

### Coverage Lower Than Expected

Common reasons for low coverage:

1. **Uncovered error handlers** - Add tests for error cases
2. **Untested edge cases** - Test boundary conditions
3. **Dead code** - Remove unused code
4. **Type guards** - Add runtime validation tests
5. **Async code** - Ensure promises/async functions are properly tested

### Per-File Thresholds Failing

If specific files fail thresholds:

```bash
# Run coverage for specific test file
npm run test:coverage -- tests/unit/services/invoice.test.ts

# Check which lines are uncovered in HTML report
open coverage/index.html
```

### CI Coverage Upload Failures

If Codecov/Coveralls upload fails:

1. Verify token is correct in GitHub Secrets
2. Check that `coverage/lcov.info` exists after test run
3. Ensure test command runs successfully
4. Review action logs for specific error messages

## Additional Resources

- [Vitest Coverage Documentation](https://vitest.dev/guide/coverage.html)
- [Codecov Documentation](https://docs.codecov.com/)
- [Coveralls Documentation](https://docs.coveralls.io/)
- [GitHub Actions Coverage](https://github.com/marketplace?type=actions&query=coverage)

## Coverage Metrics Reference

Current project status (as of latest update):

| Category | Target | Current | Status |
|----------|--------|---------|--------|
| Overall Coverage | 80% | ~85% | ✅ Passing |
| Service Layer | 90% | ~92% | ✅ Passing |
| API Routes | 85% | ~87% | ✅ Passing |
| Critical Paths | 95% | ~96% | ✅ Passing |

## Next Steps

1. Set up Codecov or Coveralls (choose one)
2. Add coverage badge to README
3. Configure PR status checks
4. Enable coverage comments on PRs
5. Set up coverage alerts for regressions
