# TrainTrack Documentation

This directory contains comprehensive documentation for the TrainTrack project.

## Test Coverage Documentation

### Quick Reference
- **[COVERAGE_SUMMARY.md](./COVERAGE_SUMMARY.md)** - Overview of coverage setup and configuration
  - Start here for a complete understanding of what's configured
  - Lists all files modified and their purposes
  - Quick start guide

### Developer Guides
- **[COVERAGE_QUICK_START.md](./COVERAGE_QUICK_START.md)** - Quick reference for daily development
  - Most common commands
  - How to read coverage reports
  - Tips for improving coverage
  - Troubleshooting guide

### Setup Guides
- **[COVERAGE_SETUP.md](./COVERAGE_SETUP.md)** - Detailed CI/CD integration guide
  - Codecov setup instructions
  - Coveralls setup instructions
  - GitHub Actions configuration
  - Advanced configuration options

### Reference Guides
- **[COVERAGE_BADGES.md](./COVERAGE_BADGES.md)** - Badge setup for README
  - Codecov badges
  - Coveralls badges
  - Custom badge options
  - Example implementations

## Workflow Documentation

### GitHub Actions
- **[TEST_WORKFLOW_README.md](./TEST_WORKFLOW_README.md)** - GitHub Actions test workflow documentation
- **[STATUS_BADGE.md](./STATUS_BADGE.md)** - Status badge documentation

## Quick Links

### For New Developers
1. Read [COVERAGE_QUICK_START.md](./COVERAGE_QUICK_START.md)
2. Run `npm run test:coverage:open` to see current coverage
3. Refer back when you need to improve coverage

### For Project Maintainers
1. Review [COVERAGE_SUMMARY.md](./COVERAGE_SUMMARY.md) for complete setup
2. Follow [COVERAGE_SETUP.md](./COVERAGE_SETUP.md) to configure Codecov
3. Add badges using [COVERAGE_BADGES.md](./COVERAGE_BADGES.md)

### For CI/CD Engineers
1. Check [COVERAGE_SETUP.md](./COVERAGE_SETUP.md) for integration details
2. Review `.github/workflows/test.yml` for workflow configuration
3. Configure `codecov.yml` for custom behavior

## Additional Resources

- Main project README: [../README.md](../README.md)
- Vitest Configuration: [../vitest.config.ts](../vitest.config.ts)
- Package.json Scripts: [../package.json](../package.json)
- Coverage Script: [../scripts/check-service-coverage.js](../scripts/check-service-coverage.js)
