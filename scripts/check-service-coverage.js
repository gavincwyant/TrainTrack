#!/usr/bin/env node

/**
 * Check Service Layer Coverage
 *
 * This script verifies that service layer files (lib/services/**)
 * meet the stricter 90% coverage threshold required for critical business logic.
 *
 * Usage: node scripts/check-service-coverage.js
 *
 * Run after: npm run test:coverage
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

// Configuration
const COVERAGE_FILE = path.join(__dirname, '../coverage/coverage-final.json');
const SERVICE_PATH = 'lib/services/';
const REQUIRED_COVERAGE = {
  lines: 90,
  functions: 90,
  branches: 85,
  statements: 90,
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function calculateCoverage(summary) {
  return {
    lines: (summary.lines.covered / summary.lines.total) * 100,
    functions: (summary.functions.covered / summary.functions.total) * 100,
    branches: (summary.branches.covered / summary.branches.total) * 100,
    statements: (summary.statements.covered / summary.statements.total) * 100,
  };
}

function formatPercentage(value) {
  return value.toFixed(2) + '%';
}

function checkServiceCoverage() {
  console.log(colorize('\n🔍 Checking Service Layer Coverage\n', 'bold'));

  // Check if coverage file exists
  if (!fs.existsSync(COVERAGE_FILE)) {
    console.error(colorize('❌ Coverage file not found!', 'red'));
    console.log(colorize('   Run: npm run test:coverage', 'yellow'));
    process.exit(1);
  }

  // Read coverage data
  let coverageData;
  try {
    const fileContent = fs.readFileSync(COVERAGE_FILE, 'utf8');
    coverageData = JSON.parse(fileContent);
  } catch (error) {
    console.error(colorize('❌ Failed to read coverage data:', 'red'), error.message);
    process.exit(1);
  }

  // Filter service files
  const serviceFiles = Object.entries(coverageData).filter(([filePath]) =>
    filePath.includes(SERVICE_PATH)
  );

  if (serviceFiles.length === 0) {
    console.log(colorize('⚠️  No service files found in coverage report', 'yellow'));
    console.log(colorize(`   Looking for files in: ${SERVICE_PATH}`, 'yellow'));
    process.exit(0);
  }

  console.log(colorize(`Found ${serviceFiles.length} service files\n`, 'blue'));

  // Aggregate coverage for all service files
  const totalCoverage = {
    lines: { covered: 0, total: 0 },
    functions: { covered: 0, total: 0 },
    branches: { covered: 0, total: 0 },
    statements: { covered: 0, total: 0 },
  };

  let hasFailures = false;
  const fileResults = [];

  // Check each service file
  serviceFiles.forEach(([filePath, fileData]) => {
    const fileName = path.basename(filePath);
    const coverage = calculateCoverage(fileData);

    // Aggregate totals
    Object.keys(totalCoverage).forEach((metric) => {
      totalCoverage[metric].covered += fileData[metric].covered;
      totalCoverage[metric].total += fileData[metric].total;
    });

    // Check if file meets thresholds
    const failures = [];
    Object.entries(REQUIRED_COVERAGE).forEach(([metric, threshold]) => {
      if (coverage[metric] < threshold) {
        failures.push({ metric, actual: coverage[metric], required: threshold });
        hasFailures = true;
      }
    });

    fileResults.push({
      fileName,
      coverage,
      failures,
      passed: failures.length === 0,
    });
  });

  // Calculate overall service layer coverage
  const overallCoverage = calculateCoverage(totalCoverage);

  // Display results
  console.log(colorize('File-by-File Results:', 'bold'));
  console.log('─'.repeat(80));

  fileResults.forEach(({ fileName, coverage, failures, passed }) => {
    const status = passed ? colorize('✅', 'green') : colorize('❌', 'red');
    console.log(`${status} ${fileName}`);

    if (!passed) {
      failures.forEach(({ metric, actual, required }) => {
        console.log(
          colorize(
            `   ${metric}: ${formatPercentage(actual)} (required: ${formatPercentage(required)})`,
            'red'
          )
        );
      });
    }
  });

  console.log('─'.repeat(80));
  console.log(colorize('\nOverall Service Layer Coverage:', 'bold'));
  console.log('─'.repeat(80));

  const overallFailures = [];
  Object.entries(REQUIRED_COVERAGE).forEach(([metric, threshold]) => {
    const actual = overallCoverage[metric];
    const passed = actual >= threshold;
    const status = passed ? colorize('✅', 'green') : colorize('❌', 'red');
    const color = passed ? 'green' : 'red';

    console.log(
      `${status} ${metric.padEnd(12)}: ${colorize(formatPercentage(actual), color)} ` +
        `(required: ${formatPercentage(threshold)})`
    );

    if (!passed) {
      overallFailures.push({ metric, actual, required: threshold });
      hasFailures = true;
    }
  });

  console.log('─'.repeat(80));

  // Summary
  if (hasFailures) {
    console.log(colorize('\n❌ Service layer coverage check FAILED\n', 'red'));
    console.log(colorize('The service layer contains critical business logic and requires', 'yellow'));
    console.log(colorize('90%+ coverage for lines, functions, and statements.', 'yellow'));
    console.log(colorize('\nPlease add tests to cover the missing code paths.\n', 'yellow'));
    process.exit(1);
  } else {
    console.log(colorize('\n✅ Service layer coverage check PASSED\n', 'green'));
    console.log(colorize('All service files meet the required 90% coverage threshold.\n', 'green'));
    process.exit(0);
  }
}

// Run the check
checkServiceCoverage();
