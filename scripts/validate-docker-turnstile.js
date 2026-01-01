#!/usr/bin/env node

/**
 * Docker Turnstile Environment Validation Script
 * Validates Turnstile configuration in Docker environment
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

class DockerTurnstileValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  // Validate environment variables
  validateEnvironmentVariables() {
    logSection('Docker Environment Variables Validation');

    const requiredVars = ['TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY'];
    const optionalVars = ['TURNSTILE_LANGUAGE', 'TURNSTILE_SIZE', 'TURNSTILE_THEME'];

    let allRequired = true;

    // Check required variables
    requiredVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        logSuccess(`${varName}: ${value.substring(0, 10)}...`);
        
        // Validate key format
        if (this.validateKeyFormat(varName, value)) {
          logSuccess(`${varName} format is valid`);
        } else {
          logError(`${varName} format is invalid`);
          this.errors.push(`Invalid ${varName} format`);
        }
      } else {
        logError(`${varName}: Not set`);
        this.errors.push(`Missing required environment variable: ${varName}`);
        allRequired = false;
      }
    });

    // Check optional variables
    optionalVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        logSuccess(`${varName}: ${value}`);
        
        // Validate option values
        if (this.validateOptionValue(varName, value)) {
          logSuccess(`${varName} value is valid`);
        } else {
          logWarning(`${varName} value may be invalid: ${value}`);
          this.warnings.push(`Potentially invalid ${varName} value: ${value}`);
        }
      } else {
        logInfo(`${varName}: Using default value`);
      }
    });

    return allRequired;
  }

  // Validate Turnstile key format
  validateKeyFormat(keyName, keyValue) {
    if (keyName === 'TURNSTILE_SITE_KEY') {
      // Test keys
      const testKeys = ['1x00000000000000000000AA', '2x00000000000000000000AB'];
      if (testKeys.includes(keyValue)) {
        logWarning(`Using test key for ${keyName}`);
        return true;
      }
      
      // Production site key format
      return /^0x[a-zA-Z0-9]{22,}$/.test(keyValue);
    }
    
    if (keyName === 'TURNSTILE_SECRET_KEY') {
      // Test keys
      const testKeys = ['1x0000000000000000000000000000000AA', '2x0000000000000000000000000000000AB'];
      if (testKeys.includes(keyValue)) {
        logWarning(`Using test key for ${keyName}`);
        return true;
      }
      
      // Production secret key format
      return /^0x[a-zA-Z0-9]{40,}$/.test(keyValue);
    }
    
    return false;
  }

  // Validate option values
  validateOptionValue(optionName, optionValue) {
    const validValues = {
      'TURNSTILE_LANGUAGE': ['auto', 'en', 'zh', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'pt', 'ru'],
      'TURNSTILE_SIZE': ['normal', 'compact', 'flexible', 'invisible'],
      'TURNSTILE_THEME': ['auto', 'light', 'dark']
    };

    const valid = validValues[optionName];
    return valid ? valid.includes(optionValue) : true;
  }

  // Check Docker Compose files
  validateDockerComposeFiles() {
    logSection('Docker Compose Files Validation');

    const composeFiles = [
      'docker-compose.yml',
      'docker-compose.turnstile.yml',
      'docker-compose.override.yml'
    ];

    composeFiles.forEach(filename => {
      if (fs.existsSync(filename)) {
        logSuccess(`${filename} exists`);
        
        try {
          const content = fs.readFileSync(filename, 'utf8');
          
          // Check for Turnstile environment variables in compose file
          if (content.includes('TURNSTILE_SITE_KEY') || content.includes('TURNSTILE_SECRET_KEY')) {
            logSuccess(`${filename} contains Turnstile configuration`);
          } else {
            logInfo(`${filename} does not contain Turnstile configuration`);
          }
        } catch (error) {
          logError(`Failed to read ${filename}: ${error.message}`);
        }
      } else {
        logInfo(`${filename} not found`);
      }
    });
  }

  // Check .env files
  validateEnvFiles() {
    logSection('Environment Files Validation');

    const envFiles = ['.env', '.env.local', '.env.production'];

    envFiles.forEach(filename => {
      if (fs.existsSync(filename)) {
        logSuccess(`${filename} exists`);
        
        try {
          const content = fs.readFileSync(filename, 'utf8');
          
          if (content.includes('TURNSTILE_SITE_KEY') || content.includes('TURNSTILE_SECRET_KEY')) {
            logSuccess(`${filename} contains Turnstile configuration`);
          } else {
            logInfo(`${filename} does not contain Turnstile configuration`);
          }
        } catch (error) {
          logError(`Failed to read ${filename}: ${error.message}`);
        }
      } else {
        logInfo(`${filename} not found`);
      }
    });

    // Check for example file
    if (fs.existsSync('.env.turnstile.example')) {
      logSuccess('.env.turnstile.example template found');
    } else {
      logWarning('.env.turnstile.example template not found');
    }
  }

  // Generate Docker configuration examples
  generateDockerExamples() {
    logSection('Docker Configuration Examples');

    log('\n📝 Example docker-compose.override.yml:', 'bright');
    console.log(`
version: '3.8'

services:
  api:
    environment:
      # Turnstile Configuration
      - TURNSTILE_SITE_KEY=0x4AAAAAAABkMYinukE8nzKf
      - TURNSTILE_SECRET_KEY=0x4AAAAAAABkMYinukE8nzKf_secret
      - TURNSTILE_LANGUAGE=auto
      - TURNSTILE_SIZE=normal
      - TURNSTILE_THEME=auto
`);

    log('📝 Example .env configuration:', 'bright');
    console.log(`
# Turnstile Configuration
TURNSTILE_SITE_KEY=0x4AAAAAAABkMYinukE8nzKf
TURNSTILE_SECRET_KEY=0x4AAAAAAABkMYinukE8nzKf_secret
TURNSTILE_LANGUAGE=auto
TURNSTILE_SIZE=normal
TURNSTILE_THEME=auto
`);

    log('📝 Docker run command example:', 'bright');
    console.log(`
docker run -d \\
  -e TURNSTILE_SITE_KEY=0x4AAAAAAABkMYinukE8nzKf \\
  -e TURNSTILE_SECRET_KEY=0x4AAAAAAABkMYinukE8nzKf_secret \\
  -e TURNSTILE_LANGUAGE=auto \\
  -e TURNSTILE_SIZE=normal \\
  -e TURNSTILE_THEME=auto \\
  -p 3080:3080 \\
  ghcr.io/danny-avila/librechat-dev:latest
`);
  }

  // Run all validations
  async validate() {
    log(colorize('🐳 Docker Turnstile Environment Validator', 'bright'));
    log(colorize('=' * 60, 'cyan'));

    const hasRequiredVars = this.validateEnvironmentVariables();
    this.validateDockerComposeFiles();
    this.validateEnvFiles();

    // Summary
    logSection('Validation Summary');

    if (this.errors.length === 0 && this.warnings.length === 0) {
      if (hasRequiredVars) {
        logSuccess('✨ All validations passed! Turnstile is properly configured for Docker.');
        logInfo('🚀 You can start LibreChat with: ./scripts/start-with-turnstile.sh');
      } else {
        logWarning('⚠️  Turnstile environment variables not configured - will run without protection.');
      }
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
        log('\n🔧 Please fix the errors above before starting LibreChat.', 'red');
      } else {
        log('\n✅ No critical errors found. Warnings can be ignored if everything works.', 'green');
      }
    }

    this.generateDockerExamples();

    log('\n📚 For more information:', 'blue');
    log('  • Use the startup script: ./scripts/start-with-turnstile.sh', 'blue');
    log('  • Copy example: cp .env.turnstile.example .env', 'blue');
    log('  • Cloudflare Turnstile: https://developers.cloudflare.com/turnstile/', 'blue');
  }
}

// Run the validator
async function main() {
  const validator = new DockerTurnstileValidator();
  await validator.validate();
}

// Handle command line execution
if (require.main === module) {
  main().catch(error => {
    console.error(colorize(`\n💥 Validation failed: ${error.message}`, 'red'));
    process.exit(1);
  });
}

module.exports = DockerTurnstileValidator;