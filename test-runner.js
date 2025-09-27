#!/usr/bin/env node

/**
 * Minimal test runner - no dependencies, pure JavaScript
 */

const fs = require('fs')
const path = require('path')

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
}

// Test context
let currentTestSuite = null
let currentTest = null
let testResults = {
  passed: 0,
  failed: 0,
  suites: [],
}

// Assert functions
global.assert = function (condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}

global.assertEqual = function (actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`,
    )
  }
}

global.assertDeepEqual = function (actual, expected, message) {
  const actualStr = JSON.stringify(actual)
  const expectedStr = JSON.stringify(expected)
  if (actualStr !== expectedStr) {
    throw new Error(message || `Expected ${expectedStr} but got ${actualStr}`)
  }
}

global.assertCloseTo = function (actual, expected, precision = 0.001, message) {
  const diff = Math.abs(actual - expected)
  if (diff > precision) {
    throw new Error(
      message || `Expected ${expected} ± ${precision} but got ${actual} (diff: ${diff})`,
    )
  }
}

global.assertThrows = function (fn, expectedError, message) {
  let thrown = false
  let error = null

  try {
    fn()
  } catch (e) {
    thrown = true
    error = e
  }

  if (!thrown) {
    throw new Error(message || 'Expected function to throw but it did not')
  }

  if (expectedError && !error.message.includes(expectedError)) {
    throw new Error(
      message || `Expected error containing "${expectedError}" but got "${error.message}"`,
    )
  }
}

global.assertTrue = function (condition, message) {
  assert(condition === true, message || `Expected true but got ${condition}`)
}

global.assertFalse = function (condition, message) {
  assert(condition === false, message || `Expected false but got ${condition}`)
}

global.assertGreaterThan = function (actual, expected, message) {
  if (actual <= expected) {
    throw new Error(message || `Expected ${actual} to be greater than ${expected}`)
  }
}

global.assertLessThan = function (actual, expected, message) {
  if (actual >= expected) {
    throw new Error(message || `Expected ${actual} to be less than ${expected}`)
  }
}

// Test runner functions
global.describe = function (suiteName, suiteFunction) {
  const suite = {
    name: suiteName,
    tests: [],
    passed: 0,
    failed: 0,
  }

  currentTestSuite = suite
  testResults.suites.push(suite)

  console.log(`\n${colors.bold}${suiteName}${colors.reset}`)

  try {
    suiteFunction()
  } catch (e) {
    console.error(`${colors.red}✗ Suite setup failed: ${e.message}${colors.reset}`)
    suite.failed++
  }

  currentTestSuite = null
}

global.test = function (testName, testFunction) {
  if (!currentTestSuite) {
    throw new Error('test() must be called inside describe()')
  }

  const testCase = {
    name: testName,
    passed: false,
    error: null,
  }

  currentTest = testCase
  currentTestSuite.tests.push(testCase)

  try {
    testFunction()
    testCase.passed = true
    currentTestSuite.passed++
    testResults.passed++
    console.log(`  ${colors.green}✓${colors.reset} ${colors.gray}${testName}${colors.reset}`)
  } catch (error) {
    testCase.error = error
    currentTestSuite.failed++
    testResults.failed++
    console.log(`  ${colors.red}✗ ${testName}${colors.reset}`)
    console.log(`    ${colors.red}${error.message}${colors.reset}`)
    if (process.env.VERBOSE) {
      console.log(`    ${colors.gray}${error.stack}${colors.reset}`)
    }
  }

  currentTest = null
}

// Alias for compatibility
global.it = global.test

// Mock creation helper
global.createMock = function (name, implementation = {}) {
  const mock = {
    name: name,
    calls: [],
    ...implementation,
  }

  // Wrap functions to track calls
  Object.keys(implementation).forEach((key) => {
    if (typeof implementation[key] === 'function') {
      const originalFn = implementation[key]
      mock[key] = function (...args) {
        mock.calls.push({ method: key, args })
        return originalFn.apply(this, args)
      }
    }
  })

  mock.reset = function () {
    mock.calls = []
  }

  mock.wasCalled = function (methodName) {
    return mock.calls.some((call) => call.method === methodName)
  }

  mock.callCount = function (methodName) {
    return mock.calls.filter((call) => call.method === methodName).length
  }

  return mock
}

// Run tests from files
async function runTestFiles(testFiles) {
  console.log(`${colors.bold}${colors.blue}Running tests...${colors.reset}`)
  console.log(`${colors.gray}Found ${testFiles.length} test file(s)${colors.reset}`)

  for (const file of testFiles) {
    try {
      // Clear module cache for fresh test runs
      delete require.cache[path.resolve(file)]
      require(path.resolve(file))
    } catch (error) {
      console.error(`${colors.red}Failed to load ${file}: ${error.message}${colors.reset}`)
      testResults.failed++
    }
  }

  // Print summary
  console.log(`\n${colors.bold}Test Summary${colors.reset}`)
  console.log('─'.repeat(40))

  const totalTests = testResults.passed + testResults.failed
  const passRate = totalTests > 0 ? ((testResults.passed / totalTests) * 100).toFixed(1) : 0

  if (testResults.failed === 0) {
    console.log(`${colors.green}${colors.bold}✓ All tests passed!${colors.reset}`)
    console.log(`${colors.green}${testResults.passed} passed${colors.reset}, 0 failed`)
  } else {
    console.log(`${colors.red}${colors.bold}✗ Some tests failed${colors.reset}`)
    console.log(
      `${colors.green}${testResults.passed} passed${colors.reset}, ${colors.red}${testResults.failed} failed${colors.reset}`,
    )
  }

  console.log(`${colors.gray}Pass rate: ${passRate}%${colors.reset}`)

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0)
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2)

  let testFiles = []

  if (args.length === 0) {
    // Find all .test.js files
    function findTestFiles(dir) {
      const files = fs.readdirSync(dir)

      files.forEach((file) => {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          findTestFiles(fullPath)
        } else if (file.endsWith('.test.js')) {
          testFiles.push(fullPath)
        }
      })
    }

    findTestFiles('.')
  } else {
    // Run specific test files
    testFiles = args.filter((file) => fs.existsSync(file))
  }

  if (testFiles.length === 0) {
    console.log(`${colors.yellow}No test files found${colors.reset}`)
    process.exit(0)
  }

  runTestFiles(testFiles)
}

module.exports = {
  assert,
  assertEqual,
  assertDeepEqual,
  assertCloseTo,
  assertThrows,
  assertTrue,
  assertFalse,
  assertGreaterThan,
  assertLessThan,
  describe,
  test,
  it,
  createMock,
}
