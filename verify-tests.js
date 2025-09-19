#!/usr/bin/env node

/**
 * Test Verification Script - Quick setup verification
 */

const fs = require('fs')
const path = require('path')

class TestVerifier {
  constructor() {
    this.results = {
      frontend: { config: false, tests: 0, scripts: false },
      backend: { config: false, tests: 0, scripts: false },
      master: { runner: false, docs: false }
    }
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    }
    console.log(`${colors[type]}${message}${colors.reset}`)
  }

  checkFileExists(filePath, description) {
    const exists = fs.existsSync(filePath)
    if (exists) {
      this.log(`✅ ${description}`, 'success')
    } else {
      this.log(`❌ ${description} - Missing: ${filePath}`, 'error')
    }
    return exists
  }

  countTestFiles(directory, pattern = '**/*.test.*') {
    if (!fs.existsSync(directory)) return 0

    let count = 0
    const scanDir = (dir) => {
      const items = fs.readdirSync(dir, { withFileTypes: true })
      for (const item of items) {
        if (item.isDirectory() && !item.name.includes('node_modules')) {
          scanDir(path.join(dir, item.name))
        } else if (item.name.includes('.test.') || item.name.includes('.spec.')) {
          count++
        }
      }
    }

    scanDir(directory)
    return count
  }

  verifyFrontend() {
    this.log('\n🎨 Verifying Frontend Test Setup...', 'info')

    // Check configuration files
    this.results.frontend.config = this.checkFileExists(
      path.join(__dirname, 'frontend', 'vitest.config.ts'),
      'Frontend Vitest Config'
    )

    this.checkFileExists(
      path.join(__dirname, 'frontend', 'src', 'test', 'setup.ts'),
      'Frontend Test Setup'
    )

    // Count test files
    const frontendTestCount = this.countTestFiles(path.join(__dirname, 'frontend'))
    this.results.frontend.tests = frontendTestCount
    this.log(`📊 Frontend Test Files: ${frontendTestCount}`, frontendTestCount > 0 ? 'success' : 'warning')

    // Check package.json scripts
    const frontendPkg = path.join(__dirname, 'frontend', 'package.json')
    if (fs.existsSync(frontendPkg)) {
      const pkg = JSON.parse(fs.readFileSync(frontendPkg, 'utf8'))
      const hasTestScripts = pkg.scripts?.test && pkg.scripts?.['test:coverage']
      this.results.frontend.scripts = hasTestScripts
      this.log(`📜 Frontend Test Scripts: ${hasTestScripts ? 'Configured' : 'Missing'}`, hasTestScripts ? 'success' : 'warning')
    }

    // Check dependencies
    const frontendPkg2 = path.join(__dirname, 'frontend', 'package.json')
    if (fs.existsSync(frontendPkg2)) {
      const pkg = JSON.parse(fs.readFileSync(frontendPkg2, 'utf8'))
      const hasVitest = pkg.devDependencies?.vitest
      const hasTestingLibrary = pkg.devDependencies?.['@testing-library/react']

      this.log(`📦 Vitest: ${hasVitest ? '✅' : '❌'}`, hasVitest ? 'success' : 'error')
      this.log(`📦 Testing Library: ${hasTestingLibrary ? '✅' : '❌'}`, hasTestingLibrary ? 'success' : 'error')
    }
  }

  verifyBackend() {
    this.log('\n🔧 Verifying Backend Test Setup...', 'info')

    // Check configuration files
    this.results.backend.config = this.checkFileExists(
      path.join(__dirname, 'backend', 'vitest.config.ts'),
      'Backend Vitest Config'
    )

    this.checkFileExists(
      path.join(__dirname, 'backend', 'src', 'test', 'setup.ts'),
      'Backend Test Setup'
    )

    this.checkFileExists(
      path.join(__dirname, 'backend', 'src', 'test', 'test-utils.ts'),
      'Backend Test Utils'
    )

    // Count test files
    const backendTestCount = this.countTestFiles(path.join(__dirname, 'backend', 'src'))
    this.results.backend.tests = backendTestCount
    this.log(`📊 Backend Test Files: ${backendTestCount}`, backendTestCount > 0 ? 'success' : 'warning')

    // Check package.json scripts
    const backendPkg = path.join(__dirname, 'backend', 'package.json')
    if (fs.existsSync(backendPkg)) {
      const pkg = JSON.parse(fs.readFileSync(backendPkg, 'utf8'))
      const hasTestScripts = pkg.scripts?.test && pkg.scripts?.['test:coverage']
      this.results.backend.scripts = hasTestScripts
      this.log(`📜 Backend Test Scripts: ${hasTestScripts ? 'Configured' : 'Missing'}`, hasTestScripts ? 'success' : 'warning')
    }

    // Check dependencies
    if (fs.existsSync(backendPkg)) {
      const pkg = JSON.parse(fs.readFileSync(backendPkg, 'utf8'))
      const hasVitest = pkg.devDependencies?.vitest
      const hasSupertest = pkg.devDependencies?.supertest

      this.log(`📦 Vitest: ${hasVitest ? '✅' : '❌'}`, hasVitest ? 'success' : 'error')
      this.log(`📦 Supertest: ${hasSupertest ? '✅' : '❌'}`, hasSupertest ? 'success' : 'error')
    }
  }

  verifyMaster() {
    this.log('\n🎯 Verifying Master Test Setup...', 'info')

    // Check master test runner
    this.results.master.runner = this.checkFileExists(
      path.join(__dirname, 'run-all-tests.js'),
      'Master Test Runner'
    )

    // Check documentation
    this.results.master.docs = this.checkFileExists(
      path.join(__dirname, 'TESTING.md'),
      'Testing Documentation'
    )

    // Check root package.json scripts
    const rootPkg = path.join(__dirname, 'package.json')
    if (fs.existsSync(rootPkg)) {
      const pkg = JSON.parse(fs.readFileSync(rootPkg, 'utf8'))
      const hasTestScripts = pkg.scripts?.test && pkg.scripts?.['production:ready']
      this.log(`📜 Master Test Scripts: ${hasTestScripts ? 'Configured' : 'Missing'}`, hasTestScripts ? 'success' : 'warning')
    }
  }

  generateSummary() {
    console.log('\n' + '='.repeat(60))
    this.log('📋 VERIFICATION SUMMARY', 'info')
    console.log('='.repeat(60))

    const totalTests = this.results.frontend.tests + this.results.backend.tests
    const configsReady = this.results.frontend.config && this.results.backend.config
    const scriptsReady = this.results.frontend.scripts && this.results.backend.scripts
    const masterReady = this.results.master.runner && this.results.master.docs

    console.log(`📊 Total Test Files: ${totalTests}`)
    console.log(`🎨 Frontend Tests: ${this.results.frontend.tests}`)
    console.log(`🔧 Backend Tests: ${this.results.backend.tests}`)
    console.log(`⚙️  Configurations: ${configsReady ? '✅' : '❌'}`)
    console.log(`📜 Scripts: ${scriptsReady ? '✅' : '❌'}`)
    console.log(`🎯 Master Setup: ${masterReady ? '✅' : '❌'}`)

    if (totalTests > 0 && configsReady && scriptsReady && masterReady) {
      this.log('\n🎉 VERIFICATION PASSED! Test setup is complete and ready to use!', 'success')
      this.log('\nNext steps:', 'info')
      this.log('  npm test              # Run all tests', 'info')
      this.log('  npm run test:coverage # Run with coverage', 'info')
      this.log('  npm run production:ready # Full quality check', 'info')
    } else {
      this.log('\n⚠️  VERIFICATION INCOMPLETE - Some setup steps are missing', 'warning')

      if (totalTests === 0) {
        this.log('  • No test files found - tests may not have been created', 'warning')
      }
      if (!configsReady) {
        this.log('  • Configuration files missing - run setup again', 'warning')
      }
      if (!scriptsReady) {
        this.log('  • Package.json scripts missing - update scripts', 'warning')
      }
      if (!masterReady) {
        this.log('  • Master setup incomplete - missing runner or docs', 'warning')
      }
    }

    console.log('\n' + '='.repeat(60))
  }

  run() {
    this.log('🔍 Verifying Comprehensive Test Setup for M1 Villa Management System', 'info')

    this.verifyFrontend()
    this.verifyBackend()
    this.verifyMaster()
    this.generateSummary()
  }
}

const verifier = new TestVerifier()
verifier.run()