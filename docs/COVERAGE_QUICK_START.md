# Test Coverage Quick Start

A quick reference guide for working with test coverage in TrainTrack.

## TL;DR - Most Common Commands

```bash
# Run tests with coverage
npm run test:coverage

# Run coverage and open report in browser
npm run test:coverage:open

# Run coverage for specific test types
npm run test:coverage:unit          # Unit tests only
npm run test:coverage:integration   # Integration tests only
```

## Understanding Coverage Reports

### Terminal Output

After running coverage, you'll see a summary like this:

```
File                    | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
------------------------|---------|----------|---------|---------|-------------------
All files              |   85.23 |    78.45 |   89.12 |   85.23 |
 lib/services/         |   92.15 |    86.34 |   95.67 |   92.15 |
  invoice.ts           |   94.23 |    88.89 |   100   |   94.23 | 45-47,89
  calendar-sync.ts     |   90.12 |    84.21 |   91.67 |   90.12 | 123-125,234-240
```

**What the columns mean:**
- **% Stmts**: Percentage of statements executed
- **% Branch**: Percentage of conditional branches tested (if/else, switch cases)
- **% Funcs**: Percentage of functions called
- **% Lines**: Percentage of code lines executed
- **Uncovered Line #s**: Line numbers that weren't tested

### HTML Report

The HTML report provides an interactive view:

1. **Open the report:**
   ```bash
   npm run test:coverage:open
   ```

2. **Navigate the report:**
   - Click on directories to drill down
   - Click on files to see line-by-line coverage
   - Red highlights = uncovered code
   - Green highlights = covered code
   - Yellow highlights = partially covered branches

## Coverage Thresholds

### What Happens When Tests Run

Coverage thresholds are enforced automatically:

- **Pass**: All thresholds met, tests succeed
- **Fail**: Any threshold not met, tests fail with error message

### Current Thresholds

**Global (applies to all code):**
- Lines: 80%
- Functions: 80%
- Branches: 75%
- Statements: 80%

**Service Layer (`lib/services/**`) - STRICTER:**
- Lines: 90%
- Functions: 90%
- Branches: 85%
- Statements: 90%

### Why Service Layer is Stricter

The service layer contains critical business logic:
- Invoice generation
- Calendar synchronization
- Email delivery
- Client management

Higher coverage ensures reliability in production.

## Common Scenarios

### 1. Adding a New Feature

```bash
# 1. Write your tests first (TDD)
touch tests/unit/services/my-feature.test.ts

# 2. Implement the feature
touch lib/services/my-feature.ts

# 3. Run tests with coverage
npm run test:coverage:unit

# 4. Check coverage report
npm run test:coverage:open

# 5. Add tests for uncovered lines until threshold is met
```

### 2. Fixing Coverage for Existing Code

```bash
# 1. Run coverage
npm run test:coverage:open

# 2. Navigate to file with low coverage in HTML report

# 3. Look for red (uncovered) lines

# 4. Add tests for those scenarios

# 5. Re-run coverage to verify
npm run test:coverage
```

### 3. Investigating Coverage Failures

If tests fail due to coverage:

```bash
# Error will show which threshold failed, e.g.:
# ERROR: Coverage for lines (78.5%) does not meet threshold (80%)

# 1. Generate HTML report
npm run test:coverage:open

# 2. Find files below threshold (they'll be highlighted in red)

# 3. Click on the file to see uncovered lines

# 4. Add tests for uncovered code

# 5. Run again
npm run test:coverage
```

## Tips for Better Coverage

### 1. Test Error Cases

```typescript
// Good - tests both success and error paths
it('should handle API errors', async () => {
  mockFetch.mockRejectedValueOnce(new Error('Network error'))
  await expect(sendEmail(...)).rejects.toThrow('Network error')
})
```

### 2. Test All Branches

```typescript
// If your code has:
if (user.role === 'TRAINER') {
  // trainer logic
} else {
  // client logic
}

// You need tests for both branches:
it('should handle trainer users', ...)
it('should handle client users', ...)
```

### 3. Test Edge Cases

```typescript
it('should handle empty arrays', ...)
it('should handle null values', ...)
it('should handle invalid input', ...)
it('should handle boundary conditions', ...)
```

### 4. Don't Test Just for Coverage

Bad approach:
```typescript
// Just calling the function to increase coverage
it('should call doSomething', () => {
  doSomething() // No assertions!
})
```

Good approach:
```typescript
// Testing actual behavior
it('should return correct result', () => {
  const result = doSomething()
  expect(result).toEqual(expectedValue)
})
```

## CI/CD Integration

### GitHub Actions

Coverage runs automatically on every push and PR:
- Coverage report uploaded to Codecov (if configured)
- Coverage artifacts stored for 30 days
- PR comments show coverage changes

### Setting Up Codecov

1. Sign up at [codecov.io](https://codecov.io)
2. Add repository
3. Copy token to GitHub Secrets as `CODECOV_TOKEN`
4. Coverage will upload automatically on next push

See [COVERAGE_SETUP.md](./COVERAGE_SETUP.md) for detailed instructions.

## Troubleshooting

### "Coverage package not found"

```bash
npm install --save-dev @vitest/coverage-v8
```

### "Coverage directory is empty"

```bash
# Clean and regenerate
rm -rf coverage
npm run test:coverage
```

### "Some files have 0% coverage"

This usually means:
1. File is not imported by any test
2. File has no executable code (types only)
3. File is in excluded paths

Check `vitest.config.ts` coverage configuration.

### "Tests pass but coverage fails"

Coverage thresholds are separate from test results:
- Tests can pass (all assertions correct)
- Coverage can fail (not enough code tested)

You need to add more tests to cover untested code paths.

## Files Excluded from Coverage

These files don't count toward coverage (configured in `vitest.config.ts`):

- Test files (`**/*.test.ts`, `**/*.spec.ts`)
- Config files (`**/*.config.ts`, `next.config.ts`)
- Type definitions (`**/*.d.ts`, `types/**`)
- Database migrations (`prisma/migrations/**`)
- Build output (`.next/`, `out/`, `build/`)
- Layout/routing files (`app/**/layout.tsx`, etc.)

## Further Reading

- [COVERAGE_SETUP.md](./COVERAGE_SETUP.md) - Detailed CI/CD integration guide
- [Vitest Coverage Docs](https://vitest.dev/guide/coverage.html)
- [README.md](../README.md) - Project testing overview
