# GitHub Actions Test Workflow - Setup Instructions

## Quick Start

The test workflow is ready to use! No additional secrets or configuration are required for basic functionality.

## Automatic Behavior

Once you push this workflow to your repository:

1. ✅ Tests will run automatically on every push to `main` or `develop`
2. ✅ Tests will run on every pull request to `main` or `develop`
3. ✅ PostgreSQL database will be automatically provisioned
4. ✅ All environment variables are pre-configured for testing

## Optional: Enable Codecov Integration

If you want code coverage reporting via Codecov:

### 1. Sign up for Codecov
- Go to [codecov.io](https://codecov.io)
- Sign in with GitHub
- Add your repository

### 2. Get Codecov Token
- Navigate to your repository settings in Codecov
- Copy the upload token

### 3. Add GitHub Secret
- Go to your GitHub repository
- Navigate to: `Settings` → `Secrets and variables` → `Actions`
- Click `New repository secret`
- Name: `CODECOV_TOKEN`
- Value: Paste your Codecov token
- Click `Add secret`

### 4. Update Workflow
Edit `.github/workflows/test.yml` and modify the Codecov step:

\`\`\`yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  if: always()
  with:
    token: ${{ secrets.CODECOV_TOKEN }}  # Add this line
    files: ./coverage/lcov.info
    fail_ci_if_error: false
\`\`\`

## Optional: Enable Multi-Version Testing

To test across multiple Node.js versions:

1. Open `.github/workflows/test.yml`
2. Uncomment the `test-matrix` job (lines starting with #)
3. Adjust the Node versions in the matrix as needed
4. Commit and push

**Note**: This will increase CI runtime and GitHub Actions minutes usage.

## Repository Settings Recommendations

### Branch Protection Rules

Consider adding these protection rules for your `main` branch:

1. Go to: `Settings` → `Branches` → `Add rule`
2. Branch name pattern: `main`
3. Enable these options:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
     - Search and add: `Run Tests`
     - Search and add: `Lint Code` (from existing CI workflow)
     - Search and add: `Build Application` (from existing CI workflow)
   - ✅ Require conversation resolution before merging
   - ✅ Do not allow bypassing the above settings

### Actions Settings

Check your Actions settings at: `Settings` → `Actions` → `General`

Recommended settings:
- ✅ Allow all actions and reusable workflows
- ✅ Read and write permissions (for uploading artifacts)
- ✅ Allow GitHub Actions to create and approve pull requests (if using Dependabot)

## Monitoring Your Tests

### View Test Results

1. Go to the `Actions` tab in your repository
2. Click on the latest workflow run
3. Click on the `Run Tests` job to see detailed logs

### Download Test Artifacts

If tests fail:
1. Go to the failed workflow run
2. Scroll down to the `Artifacts` section
3. Download:
   - `playwright-report` - HTML report with screenshots and videos
   - `playwright-test-results` - Raw test result data
   - `coverage-report` - Code coverage HTML report

### View Coverage

Coverage reports are uploaded on every run:
1. Download the `coverage-report` artifact
2. Extract the ZIP file
3. Open `index.html` in your browser

## Troubleshooting

### Workflow Not Running

If the workflow doesn't run after pushing:
1. Check that the file is at `.github/workflows/test.yml`
2. Verify YAML syntax (use a YAML validator)
3. Check Actions tab for any errors
4. Ensure GitHub Actions is enabled: `Settings` → `Actions` → `General`

### Tests Failing in CI but Passing Locally

Common causes:
1. **Environment differences**: Check environment variables
2. **Database state**: CI uses fresh database each time
3. **Timing issues**: E2E tests may need longer timeouts in CI
4. **File paths**: Use absolute or properly resolved paths
5. **Parallelization**: CI runs with `CI=true` env var

### Running Out of GitHub Actions Minutes

Free tier limits:
- Public repos: Unlimited minutes
- Private repos: 2,000 minutes/month

To reduce usage:
1. Don't enable matrix testing unless needed
2. Use caching effectively (already configured)
3. Optimize test speed (faster tests = fewer minutes)
4. Consider self-hosted runners for private repos

### Artifact Storage Limits

- Free tier: 500 MB storage
- Artifacts auto-delete after 30 days (configurable in workflow)

If reaching limits:
- Reduce retention days in the workflow
- Clean up old artifacts manually
- Optimize artifact sizes (compress if possible)

## Testing the Workflow

### Test the workflow without pushing to main:

\`\`\`bash
# Create a test branch
git checkout -b test-ci-workflow

# Add and commit the workflow files
git add .github/workflows/test.yml
git commit -m "Add comprehensive test workflow"

# Push to test branch
git push -u origin test-ci-workflow

# Create a pull request to main
# The tests will run automatically
\`\`\`

### Manual Trigger (Optional)

To allow manual workflow runs, add this to the workflow `on:` section:

\`\`\`yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:  # Add this line
\`\`\`

Then you can manually trigger from: `Actions` → `Test Suite` → `Run workflow`

## Performance Expectations

### First Run
- Duration: ~8-12 minutes
- Downloads and installs everything from scratch
- Builds cache for future runs

### Subsequent Runs (with cache hits)
- Duration: ~5-8 minutes
- Reuses cached node_modules and Playwright browsers
- Only downloads changed dependencies

### Breakdown
- Setup & Dependencies: ~2-3 min (first run) / ~30s (cached)
- Linting & Type Check: ~30s
- Database Migrations: ~10s
- Unit Tests: ~30s
- Integration Tests: ~1-2 min
- E2E Tests: ~3-5 min
- Coverage Report: ~30s

## Support & Resources

### Documentation
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Playwright CI Docs](https://playwright.dev/docs/ci)
- [Vitest CI Docs](https://vitest.dev/guide/ci.html)

### Getting Help
- Check workflow logs for detailed error messages
- Review test artifacts for screenshots and videos
- Compare CI environment with local setup

## Next Steps

1. ✅ Push the workflow to your repository
2. ✅ Add status badge to README.md
3. ✅ Set up branch protection rules
4. ✅ Monitor first test run
5. ⚪ (Optional) Enable Codecov
6. ⚪ (Optional) Configure multi-version testing
7. ⚪ (Optional) Add Slack/Discord notifications for failures

## Updates & Maintenance

Keep these dependencies up to date:
- `actions/checkout` - Currently using v4
- `actions/setup-node` - Currently using v4
- `actions/cache` - Currently using v4
- `actions/upload-artifact` - Currently using v4
- `codecov/codecov-action` - Currently using v4

Check for updates quarterly or when GitHub announces new versions.
