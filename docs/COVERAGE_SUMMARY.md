# Test Coverage Configuration Summary

This document summarizes the test coverage setup for TrainTrack.

## What Was Configured

### 1. Vitest Configuration (`vitest.config.ts`)

Enhanced coverage configuration with:

- **Multiple Report Formats:**
  - `text` - Terminal output for immediate feedback
  - `text-summary` - Condensed terminal summary
  - `html` - Interactive browser-based report
  - `lcov` - Standard format for CI/CD integration
  - `json` - Programmatic access to coverage data

- **Coverage Thresholds:**
  - **Global:** 80% lines, 80% functions, 75% branches, 80% statements
  - **Per-file enforcement:** Each file must meet global thresholds
  - **Service Layer Target:** 90%+ coverage (monitored via scripts and HTML reports)

- **Comprehensive Exclusions:**
  - Test files
  - Configuration files
  - Type definitions
  - Database migrations
  - Build output
  - Layout/routing files

### 2. Package.json Scripts

Added new test coverage commands:

```json
{
  "test:coverage": "Run all tests with coverage",
  "test:coverage:open": "Generate coverage and open HTML report in browser",
  "test:coverage:unit": "Run unit tests with coverage",
  "test:coverage:integration": "Run integration tests with coverage",
  "test:coverage:check": "Run coverage + verify service layer meets 90% threshold"
}
```

### 3. .gitignore Updates

Added coverage artifacts to gitignore:
- `/coverage` - Coverage report directory
- `coverage/` - Alternative coverage directory
- `*.lcov` - LCOV files
- `.nyc_output` - NYC coverage output

### 4. GitHub Actions Integration

Updated `.github/workflows/test.yml` with:
- Codecov upload with proper token configuration
- Coverage flags for unit and integration tests
- Coverage artifacts uploaded for 30 days
- Non-blocking failures (continues on error)

### 5. Codecov Configuration (`codecov.yml`)

Created comprehensive Codecov configuration:
- Project coverage target: 80%
- Patch coverage target: 80%
- 1% threshold for changes
- PR comments with coverage diff
- Flags for unit vs integration test coverage
- Proper path ignores

### 6. Service Layer Coverage Checker

Created `scripts/check-service-coverage.js`:
- Validates service layer files meet 90% coverage
- Detailed file-by-file reporting
- Color-coded terminal output
- Exit codes for CI integration

### 7. Documentation

Created comprehensive documentation:
- **COVERAGE_SETUP.md** - Detailed CI/CD integration guide
- **COVERAGE_QUICK_START.md** - Quick reference for developers
- **COVERAGE_BADGES.md** - Badge setup instructions
- **COVERAGE_SUMMARY.md** - This file

## Quick Start

### Local Development

```bash
# Run tests with coverage
npm run test:coverage

# View coverage report in browser
npm run test:coverage:open

# Check service layer coverage
npm run test:coverage:check
```

### CI/CD Setup

1. **Sign up for Codecov:**
   - Visit [codecov.io](https://codecov.io)
   - Sign in with GitHub
   - Add your repository

2. **Add GitHub Secret:**
   ```
   Name: CODECOV_TOKEN
   Value: <token-from-codecov>
   ```

3. **Coverage uploads automatically** on every push/PR

### Adding Coverage Badge

After Codecov is set up, add to README.md:

```markdown
[![codecov](https://codecov.io/gh/YOUR_USERNAME/train/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/train)
```

## Coverage Goals

| Category | Target | Why |
|----------|--------|-----|
| Overall | 80% | Ensures code quality across the project |
| Service Layer | 90% | Critical business logic requires higher confidence |
| API Routes | 85% | Important endpoints need thorough testing |
| Critical Paths | 95% | Auth, billing, multi-tenancy must be rock-solid |

## File Structure

```
train/
├── vitest.config.ts              # Coverage configuration
├── codecov.yml                   # Codecov settings
├── package.json                  # Coverage scripts
├── .gitignore                    # Ignore coverage files
├── coverage/                     # Generated reports (gitignored)
│   ├── index.html               # HTML report
│   ├── lcov.info                # LCOV format
│   └── coverage-final.json      # JSON data
├── scripts/
│   └── check-service-coverage.js # Service layer checker
├── docs/
│   ├── COVERAGE_SUMMARY.md      # This file
│   ├── COVERAGE_SETUP.md        # Detailed setup guide
│   ├── COVERAGE_QUICK_START.md  # Quick reference
│   └── COVERAGE_BADGES.md       # Badge instructions
└── .github/
    └── workflows/
        └── test.yml              # CI with coverage upload
```

## How Coverage Works

### 1. Running Tests

When you run `npm run test:coverage`:

1. Vitest executes all tests
2. V8 coverage provider instruments code
3. Coverage data is collected during test execution
4. Reports are generated in multiple formats
5. Thresholds are checked
6. Process exits with success/failure code

### 2. Coverage Reports

**Terminal Output:**
- Immediate feedback
- Summary table of coverage percentages
- Lists uncovered files

**HTML Report:**
- Interactive browsing
- Drill down into files
- Line-by-line coverage visualization
- Color-coded (red = uncovered, green = covered)

**LCOV Report:**
- Standard industry format
- Used by CI/CD tools
- Codecov/Coveralls compatible

### 3. Threshold Enforcement

Coverage thresholds are enforced at two levels:

**Global (80%):**
- Applied to entire codebase
- Per-file enforcement enabled
- Tests fail if any file is below threshold

**Service Layer (90%):**
- Monitored via custom script
- Run with `npm run test:coverage:check`
- Critical business logic requires higher confidence

### 4. CI/CD Integration

On every push/PR:
1. GitHub Actions runs tests with coverage
2. Coverage report generated
3. Uploaded to Codecov (if configured)
4. PR comment shows coverage diff
5. Status check passes/fails based on thresholds

## Best Practices

### DO:
- Run coverage regularly during development
- Review HTML report to find untested code
- Test error cases and edge conditions
- Aim for 100% coverage on new features
- Use coverage as a guide, not a goal

### DON'T:
- Write tests just to increase coverage percentage
- Ignore low coverage warnings
- Skip testing error paths
- Focus only on happy paths
- Commit without checking coverage

## Troubleshooting

### Coverage Lower Than Expected?

1. Open HTML report: `npm run test:coverage:open`
2. Navigate to low-coverage files
3. Look for red (uncovered) lines
4. Add tests for those code paths

### Service Layer Coverage Below 90%?

```bash
# Run the checker
npm run test:coverage:check

# It will show which files are below threshold
# Add tests for those specific files
```

### Coverage Upload Failing in CI?

1. Verify `CODECOV_TOKEN` is set in GitHub Secrets
2. Check workflow logs for specific errors
3. Ensure `coverage/lcov.info` exists after test run
4. Verify Codecov token hasn't expired

## Next Steps

1. **Set up Codecov** (recommended)
   - See [COVERAGE_SETUP.md](./COVERAGE_SETUP.md)
   - Adds PR comments with coverage changes
   - Tracks coverage trends over time

2. **Add Coverage Badge** to README
   - See [COVERAGE_BADGES.md](./COVERAGE_BADGES.md)
   - Shows coverage status at a glance
   - Builds confidence in code quality

3. **Integrate with Pre-commit Hooks** (optional)
   - Run coverage check before commits
   - Prevent low-coverage code from being committed
   - Can be configured with husky

4. **Set up Coverage Alerts** (optional)
   - Get notified when coverage drops
   - Configure in Codecov settings
   - Slack/email integration available

## Resources

- [Vitest Coverage Documentation](https://vitest.dev/guide/coverage.html)
- [Codecov Documentation](https://docs.codecov.com/)
- [LCOV Format Specification](https://github.com/linux-test-project/lcov)
- [Testing Best Practices](https://kentcdodds.com/blog/common-testing-mistakes)

## Summary

Test coverage is now fully configured with:
- ✅ Comprehensive Vitest configuration
- ✅ Multiple report formats (text, HTML, LCOV, JSON)
- ✅ Strict thresholds (80% global, 90% service layer)
- ✅ CI/CD integration ready
- ✅ Developer-friendly scripts
- ✅ Detailed documentation

Coverage reports provide visibility into code quality and help maintain high standards across the codebase. Use them as a tool for improving test quality, not just a metric to chase.
