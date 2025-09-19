#!/usr/bin/env node

/**
 * Comprehensive Test Runner for M1 Villa Management System
 * Runs all tests across frontend and backend with detailed reporting
 */

const { spawn, exec } = require('child_process')
const path = require('path')
const fs = require('fs')

class TestRunner {
  constructor() {
    this.results = {
      backend: { passed: 0, failed: 0, total: 0, coverage: 0 },
      frontend: { passed: 0, failed: 0, total: 0, coverage: 0 },
      startTime: Date.now(),
      endTime: null
    }
    this.verbose = process.argv.includes('--verbose')
    this.coverageOnly = process.argv.includes('--coverage')
    this.watchMode = process.argv.includes('--watch')
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString()
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m',   // Red
      warning: '\x1b[33m', // Yellow
      reset: '\x1b[0m'     // Reset
    }

    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`)
  }

  async runCommand(command, cwd, label) {
    return new Promise((resolve, reject) => {
      this.log(`🚀 Starting ${label}...`, 'info')

      const child = spawn('npm', ['run', command], {
        cwd,
        stdio: this.verbose ? 'inherit' : 'pipe',
        shell: true
      })

      let output = ''
      let errorOutput = ''

      if (!this.verbose) {
        child.stdout?.on('data', (data) => {
          output += data.toString()
        })

        child.stderr?.on('data', (data) => {
          errorOutput += data.toString()
        })
      }

      child.on('close', (code) => {
        if (code === 0) {
          this.log(`✅ ${label} completed successfully`, 'success')
          resolve({ success: true, output, error: errorOutput })
        } else {
          this.log(`❌ ${label} failed with exit code ${code}`, 'error')
          if (!this.verbose && errorOutput) {
            console.log(errorOutput)
          }
          resolve({ success: false, output, error: errorOutput, code })
        }
      })

      child.on('error', (err) => {
        this.log(`💥 ${label} crashed: ${err.message}`, 'error')
        reject(err)
      })
    })
  }

  parseTestResults(output) {
    const results = { passed: 0, failed: 0, total: 0, coverage: 0 }

    // Parse Vitest output
    const testMatch = output.match(/Tests?\s+(\d+)\s+passed.*?(\d+)\s+failed/)
    if (testMatch) {
      results.passed = parseInt(testMatch[1])
      results.failed = parseInt(testMatch[2])
      results.total = results.passed + results.failed
    }

    // Parse coverage
    const coverageMatch = output.match(/All files.*?(\d+\.?\d*)%/)
    if (coverageMatch) {
      results.coverage = parseFloat(coverageMatch[1])
    }

    return results
  }

  async checkDependencies() {
    this.log('🔍 Checking dependencies...', 'info')

    const frontendPackage = path.join(__dirname, 'frontend', 'package.json')
    const backendPackage = path.join(__dirname, 'backend', 'package.json')

    if (!fs.existsSync(frontendPackage)) {
      this.log('❌ Frontend package.json not found', 'error')
      return false
    }

    if (!fs.existsSync(backendPackage)) {
      this.log('❌ Backend package.json not found', 'error')
      return false
    }

    // Check if Vitest is installed
    try {
      const frontendPkg = JSON.parse(fs.readFileSync(frontendPackage, 'utf8'))
      const backendPkg = JSON.parse(fs.readFileSync(backendPackage, 'utf8'))

      if (!frontendPkg.devDependencies?.vitest) {
        this.log('⚠️  Vitest not found in frontend dependencies', 'warning')
      }

      if (!backendPkg.devDependencies?.vitest) {
        this.log('⚠️  Vitest not found in backend dependencies', 'warning')
      }

      this.log('✅ Dependencies check completed', 'success')
      return true
    } catch (error) {
      this.log(`❌ Error checking dependencies: ${error.message}`, 'error')
      return false
    }
  }

  async runBackendTests() {
    const backendPath = path.join(__dirname, 'backend')
    const command = this.coverageOnly ? 'test:coverage' : 'test'

    try {
      const result = await this.runCommand(command, backendPath, 'Backend Tests')
      this.results.backend = this.parseTestResults(result.output)
      return result.success
    } catch (error) {
      this.log(`💥 Backend tests crashed: ${error.message}`, 'error')
      return false
    }
  }

  async runFrontendTests() {
    const frontendPath = path.join(__dirname, 'frontend')
    const command = this.coverageOnly ? 'test:coverage' : 'test'

    try {
      const result = await this.runCommand(command, frontendPath, 'Frontend Tests')
      this.results.frontend = this.parseTestResults(result.output)
      return result.success
    } catch (error) {
      this.log(`💥 Frontend tests crashed: ${error.message}`, 'error')
      return false
    }
  }

  async runLinting() {
    this.log('🔍 Running linting checks...', 'info')

    const frontendPath = path.join(__dirname, 'frontend')

    try {
      const result = await this.runCommand('lint', frontendPath, 'ESLint')
      return result.success
    } catch (error) {
      this.log(`💥 Linting crashed: ${error.message}`, 'error')
      return false
    }
  }

  async runTypeChecking() {
    this.log('🔍 Running TypeScript type checking...', 'info')

    const frontendPath = path.join(__dirname, 'frontend')

    try {
      const result = await this.runCommand('typecheck', frontendPath, 'TypeScript Check')
      return result.success
    } catch (error) {
      this.log(`💥 Type checking crashed: ${error.message}`, 'error')
      return false
    }
  }

  printSummary() {
    this.results.endTime = Date.now()
    const duration = ((this.results.endTime - this.results.startTime) / 1000).toFixed(2)

    console.log('\n' + '='.repeat(60))
    this.log('📊 TEST SUMMARY REPORT', 'info')
    console.log('='.repeat(60))

    // Backend Results
    console.log('\n🔧 Backend Results:')
    console.log(`   ✅ Passed: ${this.results.backend.passed}`)
    console.log(`   ❌ Failed: ${this.results.backend.failed}`)
    console.log(`   📈 Coverage: ${this.results.backend.coverage}%`)

    // Frontend Results
    console.log('\n🎨 Frontend Results:')
    console.log(`   ✅ Passed: ${this.results.frontend.passed}`)
    console.log(`   ❌ Failed: ${this.results.frontend.failed}`)
    console.log(`   📈 Coverage: ${this.results.frontend.coverage}%`)

    // Overall Stats
    const totalPassed = this.results.backend.passed + this.results.frontend.passed
    const totalFailed = this.results.backend.failed + this.results.frontend.failed
    const totalTests = totalPassed + totalFailed
    const avgCoverage = ((this.results.backend.coverage + this.results.frontend.coverage) / 2).toFixed(1)

    console.log('\n🎯 Overall Results:')
    console.log(`   📊 Total Tests: ${totalTests}`)
    console.log(`   ✅ Total Passed: ${totalPassed}`)
    console.log(`   ❌ Total Failed: ${totalFailed}`)
    console.log(`   📈 Average Coverage: ${avgCoverage}%`)
    console.log(`   ⏱️  Duration: ${duration}s`)

    if (totalFailed === 0) {
      this.log('\n🎉 ALL TESTS PASSED! Your app is production ready! 🚀', 'success')
    } else {
      this.log(`\n⚠️  ${totalFailed} tests failed. Please review and fix before production.`, 'warning')
    }

    console.log('\n' + '='.repeat(60))
  }

  async generateCoverageReport() {
    this.log('📊 Generating comprehensive coverage report...', 'info')

    const frontendCoverage = path.join(__dirname, 'frontend', 'coverage')
    const backendCoverage = path.join(__dirname, 'backend', 'coverage')

    if (fs.existsSync(frontendCoverage)) {
      this.log(`📁 Frontend coverage: file://${frontendCoverage}/index.html`, 'info')
    }

    if (fs.existsSync(backendCoverage)) {
      this.log(`📁 Backend coverage: file://${backendCoverage}/index.html`, 'info')
    }
  }

  async run() {
    this.log('🏁 Starting comprehensive test suite for M1 Villa Management System', 'info')

    // Check dependencies first
    const depsOk = await this.checkDependencies()
    if (!depsOk) {
      process.exit(1)
    }

    let allPassed = true

    // Run linting and type checking first
    if (!this.coverageOnly) {
      const lintPassed = await this.runLinting()
      const typePassed = await this.runTypeChecking()

      if (!lintPassed || !typePassed) {
        this.log('⚠️  Code quality checks failed. Continuing with tests...', 'warning')
      }
    }

    // Run tests in parallel for speed
    this.log('🔄 Running tests in parallel...', 'info')

    const [backendPassed, frontendPassed] = await Promise.all([
      this.runBackendTests(),
      this.runFrontendTests()
    ])

    allPassed = backendPassed && frontendPassed

    // Generate coverage reports
    if (this.coverageOnly) {
      await this.generateCoverageReport()
    }

    // Print summary
    this.printSummary()

    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1)
  }
}

// Handle watch mode
if (process.argv.includes('--watch')) {
  console.log('👀 Watch mode not implemented in master runner. Use individual npm run test:watch commands.')
  process.exit(0)
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
M1 Villa Management Test Runner

Usage: node run-all-tests.js [options]

Options:
  --verbose     Show detailed output from all tests
  --coverage    Run tests with coverage reports only
  --watch       Watch mode (use individual test:watch commands)
  --help, -h    Show this help message

Examples:
  node run-all-tests.js                  # Run all tests
  node run-all-tests.js --verbose        # Run with detailed output
  node run-all-tests.js --coverage       # Run with coverage reports
`)
  process.exit(0)
}

// Run the test suite
const runner = new TestRunner()
runner.run().catch(error => {
  console.error('💥 Test runner crashed:', error)
  process.exit(1)
})