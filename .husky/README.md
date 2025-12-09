# Git Hooks Documentation

This directory contains Git hooks managed by [Husky](https://typicode.github.io/husky/) to maintain code quality and prevent broken code from being committed or pushed.

## Available Hooks

### Pre-Commit Hook

**Location:** `.husky/pre-commit`

**What it does:**
1. Runs TypeScript type checking (`npm run type-check`) on the entire project
2. Runs ESLint with auto-fix on staged files only (via `lint-staged`)

**Performance:**
- Typically completes in < 30 seconds
- Only lints files you're actually committing (not the entire codebase)
- Type-checking runs on the full project to catch cross-file type errors

**Bypass (not recommended):**
```bash
git commit --no-verify
# or shorthand:
git commit -n
```

### Pre-Push Hook

**Location:** `.husky/pre-push`

**What it does:**
1. Runs unit tests only (`npm run test:unit`)
2. Does NOT run integration or E2E tests (those are slower and run in CI)

**Performance:**
- Typically completes in < 60 seconds
- Only runs fast unit tests to keep pushes quick
- Integration and E2E tests run in your CI pipeline

**Bypass (not recommended):**
```bash
git push --no-verify
# or shorthand:
git push -n
```

## Lint-Staged Configuration

Located in `package.json` under the `lint-staged` key:

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix"
    ]
  }
}
```

This configuration:
- Only runs on files that are staged for commit
- Automatically fixes ESLint errors where possible
- Adds fixed files back to the staging area

## Setup for New Developers

When you first clone this repository and run `npm install`, Husky will automatically:
1. Install the Git hooks (via the `prepare` script in package.json)
2. Make the hook files executable
3. Configure your local Git repository to use these hooks

No manual setup is required!

## Troubleshooting

### Hooks not running

1. Make sure you've run `npm install` after cloning
2. Check that hook files are executable:
   ```bash
   ls -la .husky/
   ```
3. Verify Husky is installed:
   ```bash
   npm list husky
   ```

### Type-check failures

If type-checking fails during pre-commit:
1. Run `npm run type-check` to see the full error output
2. Fix the TypeScript errors in your code
3. Stage the fixes and commit again

### Lint failures

If linting fails during pre-commit:
1. Run `npm run lint` to see all linting errors
2. Many errors can be auto-fixed by running `eslint --fix` on your files
3. Fix remaining errors manually
4. Stage the fixes and commit again

### Test failures

If unit tests fail during pre-push:
1. Run `npm run test:unit` locally to see which tests are failing
2. Fix the failing tests
3. Verify tests pass: `npm run test:unit`
4. Commit and push again

### Emergency bypass

If you absolutely must bypass the hooks (e.g., emergency hotfix):
```bash
# Bypass pre-commit:
git commit --no-verify -m "Emergency fix"

# Bypass pre-push:
git push --no-verify
```

**Warning:** Bypassing hooks may result in broken code being pushed. Only use in genuine emergencies.

## CI/CD Integration

These Git hooks are a first line of defense, but they don't replace CI/CD:

- **Pre-commit hooks:** Catch obvious issues before they're committed
- **Pre-push hooks:** Prevent broken tests from being pushed
- **CI/CD pipeline:** Runs full test suite (unit + integration + E2E), builds, and other checks

The hooks are designed to be fast and give immediate feedback, while CI/CD provides comprehensive validation.

## Modifying Hooks

To modify the hooks:

1. Edit the files in `.husky/` directory
2. Test your changes locally
3. Commit the updated hook files
4. All team members will get the updated hooks on their next `git pull` + `npm install`

## Performance Tips

If the hooks become too slow:

1. **Pre-commit:**
   - Type-checking is project-wide by design (catches cross-file errors)
   - Linting is already optimized (staged files only)
   - Consider breaking up large files if type-checking is slow

2. **Pre-push:**
   - Already optimized (unit tests only)
   - If still slow, consider running a subset of critical tests
   - Keep integration/E2E tests in CI only

## Files Overview

```
.husky/
├── _/              # Husky internal files (don't modify)
├── pre-commit      # Runs type-check + lint on commit
├── pre-push        # Runs unit tests on push
└── README.md       # This file
```

## Additional Resources

- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)
- [Git Hooks Documentation](https://git-scm.com/docs/githooks)
