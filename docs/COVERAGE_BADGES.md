# Coverage Badges for README

After setting up coverage tracking with Codecov or Coveralls, you can add badges to your README.md to display coverage status.

## Codecov Badge

### Standard Badge

```markdown
[![codecov](https://codecov.io/gh/YOUR_USERNAME/train/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/train)
```

### Badge with Token (Private Repos)

```markdown
[![codecov](https://codecov.io/gh/YOUR_USERNAME/train/branch/main/graph/badge.svg?token=YOUR_TOKEN)](https://codecov.io/gh/YOUR_USERNAME/train)
```

### Customized Badge

```markdown
[![codecov](https://codecov.io/gh/YOUR_USERNAME/train/branch/main/graph/badge.svg?token=YOUR_TOKEN&flag=unittests)](https://codecov.io/gh/YOUR_USERNAME/train)
```

## Coveralls Badge

### Standard Badge

```markdown
[![Coverage Status](https://coveralls.io/repos/github/YOUR_USERNAME/train/badge.svg?branch=main)](https://coveralls.io/github/YOUR_USERNAME/train?branch=main)
```

## GitHub Actions Badge

Shows test status (including coverage):

```markdown
[![Test Suite](https://github.com/YOUR_USERNAME/train/workflows/Test%20Suite/badge.svg)](https://github.com/YOUR_USERNAME/train/actions)
```

## Combined Badges Section

Here's a suggested badges section for your README.md:

```markdown
# TrainTrack - Personal Training SaaS Platform

[![Test Suite](https://github.com/YOUR_USERNAME/train/workflows/Test%20Suite/badge.svg)](https://github.com/YOUR_USERNAME/train/actions)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/train/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/train)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A multi-tenant SaaS platform for personal trainers to manage clients, scheduling, and billing.
```

## Badge Customization

### Codecov Advanced Options

You can customize Codecov badges with URL parameters:

```markdown
<!-- Show coverage for specific flag -->
[![codecov](https://codecov.io/gh/USER/train/branch/main/graph/badge.svg?flag=unittests)](https://codecov.io/gh/USER/train)

<!-- Custom style -->
[![codecov](https://codecov.io/gh/USER/train/branch/main/graph/badge.svg?style=flat-square)](https://codecov.io/gh/USER/train)

<!-- Show precision -->
[![codecov](https://codecov.io/gh/USER/train/branch/main/graph/badge.svg?precision=2)](https://codecov.io/gh/USER/train)
```

### Shields.io Badges

You can also use shields.io for more customization:

```markdown
<!-- Codecov via shields.io -->
![Coverage](https://img.shields.io/codecov/c/github/YOUR_USERNAME/train?logo=codecov)

<!-- Custom colors -->
![Coverage](https://img.shields.io/codecov/c/github/YOUR_USERNAME/train?logo=codecov&color=brightgreen)
```

## Coverage Sunburst Graph

Codecov provides interactive coverage visualizations:

```markdown
[![Coverage Graph](https://codecov.io/gh/YOUR_USERNAME/train/branch/main/graphs/sunburst.svg)](https://codecov.io/gh/YOUR_USERNAME/train)
```

## Coverage Table (Manual)

If you prefer manual tracking, you can add a coverage table:

```markdown
## Test Coverage

| Category | Lines | Functions | Branches | Statements |
|----------|-------|-----------|----------|------------|
| Overall | 85% | 89% | 78% | 85% |
| Service Layer | 92% | 95% | 86% | 92% |
| API Routes | 87% | 91% | 82% | 87% |
| Critical Paths | 96% | 98% | 92% | 96% |
```

## Dynamic Coverage Badge (Self-Hosted)

You can also generate coverage badges from your CI artifacts:

```markdown
[![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/YOUR_USERNAME/GIST_ID/raw/coverage.json)](https://github.com/YOUR_USERNAME/train/actions)
```

This requires setting up a GitHub Action to push coverage data to a gist. See [coverage-badge-action](https://github.com/marketplace/actions/dynamic-badges) for implementation.

## Instructions for Adding to README

1. **Get your repository details:**
   - GitHub username/organization
   - Repository name (usually "train" based on your setup)
   - Codecov/Coveralls token (for private repos)

2. **Choose your badge:**
   - Copy the markdown from above
   - Replace `YOUR_USERNAME` with your GitHub username
   - Replace `YOUR_TOKEN` if needed (private repos only)

3. **Add to README.md:**
   - Place badges at the top, right after the title
   - Add them in a single line for clean appearance
   - Ensure badges link to the correct service

4. **Verify badges work:**
   - Push changes to GitHub
   - Wait for CI to run
   - Check that badges display correctly
   - Click badges to verify links work

## Example README Header

Here's a complete example of how your README header might look:

```markdown
# TrainTrack - Personal Training SaaS Platform

[![Test Suite](https://github.com/gavinwyant/train/workflows/Test%20Suite/badge.svg)](https://github.com/gavinwyant/train/actions)
[![codecov](https://codecov.io/gh/gavinwyant/train/branch/main/graph/badge.svg)](https://codecov.io/gh/gavinwyant/train)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A multi-tenant SaaS platform for personal trainers to manage clients, scheduling, and billing.

## Features

- **Multi-Tenant Architecture**: Secure workspace isolation for each trainer
...
```

## Notes

- Badges update automatically as coverage changes
- Coverage badges typically update within minutes of CI completion
- You can have multiple badges (tests, coverage, build, etc.)
- Keep badges at the top of README for visibility
- Ensure all badge links work before committing
