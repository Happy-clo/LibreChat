#!/usr/bin/env node

/**
 * Turnstile Configuration Validation Script
 * 
 * This script validates the Turnstile configuration for LibreChat
 * and provides helpful feedback for troubleshooting.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const axios = require('axios');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(message, color = 'reset') {
  console.log(colorize(message, color));
}

function logSection(title) {
  console.log('\n' + colorize('='.repeat(60), 'cyan'));
  console.log(colorize(`  ${title}`, 'cyan'));
  console.log(colorize('='.repeat(60), 'cyan'));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

class TurnstileValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.config = null;
    this.envVars = {};
  }

  // Load environment variables
  loadEnvironmentVariables() {
    logSection('Environment Variables Check');
    
    // Try to load .env file
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      
      envLines.forEach(line => {
        const match = line.match(/^([^#][^=]*?)=(.*)$/);
        if (match) {
          const [, key, value] = match;
          this.envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
        }
      });
      
      logSuccess('.env file found and loaded');
    } else {
      logWarning('.env file not found');
    }

    // Check for Turnstile environment variables
    const turnstileEnvVars = [
      'TURNSTILE_SITE_KEY',
      'TURNSTILE_SECRET_KEY'
    ];

    turnstileEnvVars.forEach(varName => {
      const value = process.env[varName] || this.envVars[varName];
      if (value) {
        logSuccess(`${varName}: ${value.substring(0, 10)}...`);
        this.envVars[varName] = value;
      } else {
        logWarning(`${varName}: Not set`);
      }
    });
  }

  // Load and validate librechat.yaml configuration
  loadConfiguration() {
    logSection('Configuration File Check');
    
    const configPaths = [
      'librechat.yaml',
      'librechat.yml',
      'config/librechat.yaml',
      'config/librechat.yml'
    ];

    let configPath = null;
    for (const path of configPaths) {
      if (fs.existsSync(path)) {
        configPath = path;
        break;
      }
    }

    if (!configPath) {
      logError('No librechat.yaml configuration file found');
      logInfo('Searched in: ' + configPaths.join(', '));
      this.errors.push('Configuration file not found');
      return;
    }

    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      this.config = yaml.load(configContent);
      logSuccess(`Configuration loaded from: ${configPath}`);
    } catch (error) {
      logError(`Failed to parse configuration file: ${error.message}`);
      this.errors.push('Configuration parsing failed');
      return;
    }

    // Validate Turnstile configuration
    this.validateTurnstileConfig();
  }

  validateTurnstileConfig() {
    logSection('Turnstile Configuration Validation');

    if (!this.config.turnstile) {
      logWarning('No turnstile configuration found in librechat.yaml');
      logInfo('Turnstile will be disabled');
      return;
    }

    const { turnstile } = this.config;

    // Check site key
    if (!turnstile.siteKey) {
      logError('turnstile.siteKey is missing');
      this.errors.push('Site key not configured');
    } else {
      // Check if it's using environment variable
      if (turnstile.siteKey.startsWith('${') && turnstile.siteKey.endsWith('}')) {
        const envVarName = turnstile.siteKey.slice(2, -1);
        const envValue = process.env[envVarName] || this.envVars[envVarName];
        
        if (envValue) {
          logSuccess(`Site key loaded from environment variable: ${envVarName}`);
          logInfo(`Site key: ${envValue.substring(0, 10)}...`);
        } else {
          logError(`Environment variable ${envVarName} not found`);
          this.errors.push(`Environment variable ${envVarName} not set`);
        }
      } else {
        logSuccess(`Site key configured: ${turnstile.siteKey.substring(0, 10)}...`);
      }
    }

    // Validate options
    if (turnstile.options) {
      this.validateTurnstileOptions(turnstile.options);
    } else {
      logInfo('Using default Turnstile options');
    }
  }

  validateTurnstileOptions(options) {
    logSection('Turnstile Options Validation');

    // Validate language
    if (options.language) {
      const validLanguages = ['auto', 'en', 'zh', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'pt', 'ru'];
      if (validLanguages.includes(options.language)) {
        logSuccess(`Language: ${options.language}`);
      } else {
        logWarning(`Language "${options.language}" may not be supported`);
        logInfo(`Valid languages: ${validLanguages.join(', ')}`);
      }
    }

    // Validate size
    if (options.size) {
      const validSizes = ['normal', 'compact', 'flexible', 'invisible'];
      if (validSizes.includes(options.size)) {
        logSuccess(`Size: ${options.size}`);
      } else {
        logError(`Invalid size: ${options.size}`);
        logInfo(`Valid sizes: ${validSizes.join(', ')}`);
        this.errors.push('Invalid size option');
      }
    }

    // Validate theme
    if (options.theme) {
      const validThemes = ['auto', 'light', 'dark'];
      if (validThemes.includes(options.theme)) {
        logSuccess(`Theme: ${options.theme}`);
      } else {
        logError(`Invalid theme: ${options.theme}`);
        logInfo(`Valid themes: ${validThemes.join(', ')}`);
        this.errors.push('Invalid theme option');
      }
    }
  }

  // Test Turnstile API connectivity
  async testTurnstileAPI() {
    logSection('Turnstile API Connectivity Test');

    const siteKey = this.getSiteKey();
    if (!siteKey) {
      logError('Cannot test API - site key not available');
      return;
    }

    try {
      // Test the Turnstile script loading
      const scriptUrl = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      const response = await axios.get(scriptUrl, { timeout: 10000 });
      
      if (response.status === 200) {
        logSuccess('Turnstile script is accessible');
      } else {
        logWarning(`Turnstile script returned status: ${response.status}`);
      }
    } catch (error) {
      logError(`Failed to access Turnstile script: ${error.message}`);
      this.warnings.push('Turnstile script not accessible');
    }

    // Note: We can't test token verification without a valid token
    logInfo('Token verification can only be tested with actual user interaction');
  }

  getSiteKey() {
    if (!this.config?.turnstile?.siteKey) {
      return null;
    }

    const siteKey = this.config.turnstile.siteKey;
    
    // Handle environment variable
    if (siteKey.startsWith('${') && siteKey.endsWith('}')) {
      const envVarName = siteKey.slice(2, -1);
      return process.env[envVarName] || this.envVars[envVarName];
    }
    
    return siteKey;
  }

  // Check package dependencies
  checkDependencies() {
    logSection('Dependencies Check');

    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      logError('package.json not found');
      return;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const clientPackageJsonPath = path.join(process.cwd(), 'client', 'package.json');
      
      let clientPackageJson = null;
      if (fs.existsSync(clientPackageJsonPath)) {
        clientPackageJson = JSON.parse(fs.readFileSync(clientPackageJsonPath, 'utf8'));
      }

      // Check for required dependencies
      const requiredDeps = {
        '@marsidev/react-turnstile': 'client',
        'axios': 'api',
        'js-yaml': 'api'
      };

      Object.entries(requiredDeps).forEach(([dep, location]) => {
        let found = false;
        
        if (location === 'client' && clientPackageJson) {
          found = clientPackageJson.dependencies?.[dep] || clientPackageJson.devDependencies?.[dep];
        } else {
          found = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
        }

        if (found) {
          logSuccess(`${dep}: ${found}`);
        } else {
          logError(`${dep}: Not found (required for ${location})`);
          this.errors.push(`Missing dependency: ${dep}`);
        }
      });

    } catch (error) {
      logError(`Failed to read package.json: ${error.message}`);
    }
  }

  // Generate configuration examples
  generateExamples() {
    logSection('Configuration Examples');

    log('\n📝 Example .env configuration:', 'bright');
    console.log(`
TURNSTILE_SITE_KEY=0x4AAAAAAABkMYinukE8nzKf
TURNSTILE_SECRET_KEY=0x4AAAAAAABkMYinukE8nzKf_secret
`);

    log('📝 Example librechat.yaml configuration:', 'bright');
    console.log(`
turnstile:
  siteKey: "\${TURNSTILE_SITE_KEY}"
  options:
    language: "auto"    # "auto" or ISO 639-1 language code
    size: "normal"      # "normal", "compact", "flexible", "invisible"
    theme: "auto"       # "auto", "light", "dark"
`);

    log('📝 Example Docker Compose environment:', 'bright');
    console.log(`
services:
  api:
    environment:
      - TURNSTILE_SITE_KEY=0x4AAAAAAABkMYinukE8nzKf
      - TURNSTILE_SECRET_KEY=0x4AAAAAAABkMYinukE8nzKf_secret
`);
  }

  // Run all validations
  async validate() {
    log(colorize('🔍 LibreChat Turnstile Configuration Validator', 'bright'));
    log(colorize('=' * 60, 'cyan'));

    this.loadEnvironmentVariables();
    this.loadConfiguration();
    this.checkDependencies();
    await this.testTurnstileAPI();

    // Summary
    logSection('Validation Summary');

    if (this.errors.length === 0 && this.warnings.length === 0) {
      logSuccess('✨ All checks passed! Turnstile should work correctly.');
    } else {
      if (this.errors.length > 0) {
        log('\n❌ Errors found:', 'red');
        this.errors.forEach(error => log(`  • ${error}`, 'red'));
      }

      if (this.warnings.length > 0) {
        log('\n⚠️  Warnings:', 'yellow');
        this.warnings.forEach(warning => log(`  • ${warning}`, 'yellow'));
      }

      if (this.errors.length > 0) {
        log('\n🔧 Please fix the errors above before using Turnstile.', 'red');
      } else {
        log('\n✅ No critical errors found. Warnings can be ignored if everything works.', 'green');
      }
    }

    this.generateExamples();

    log('\n📚 For more information, see:', 'blue');
    log('  • TURNSTILE_INTEGRATION_GUIDE.md', 'blue');
    log('  • https://developers.cloudflare.com/turnstile/', 'blue');
    log('  • https://docs.librechat.ai/', 'blue');
  }
}

// Run the validator
async function main() {
  const validator = new TurnstileValidator();
  await validator.validate();
}

// Handle command line execution
if (require.main === module) {
  main().catch(error => {
    console.error(colorize(`\n💥 Validation failed: ${error.message}`, 'red'));
    process.exit(1);
  });
}

module.exports = TurnstileValidator;