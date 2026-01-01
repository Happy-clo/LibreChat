/**
 * Turnstile Configuration Utility
 * Handles environment variable detection and configuration for Turnstile
 */

/**
 * Get Turnstile configuration from startup config
 * This ensures the frontend can properly read the site key from backend configuration
 * @param {Object} startupConfig - The startup configuration from the backend
 * @returns {Object|null} Turnstile configuration or null if disabled
 */
export function getTurnstileConfig(startupConfig) {
  // Check if Turnstile is configured in startup config
  if (!startupConfig?.turnstile?.siteKey) {
    console.debug('[Turnstile] No site key found in startup config - Turnstile disabled');
    return null;
  }

  const config = {
    siteKey: startupConfig.turnstile.siteKey,
    options: {
      language: startupConfig.turnstile.options?.language || 'auto',
      size: startupConfig.turnstile.options?.size || 'normal',
      theme: startupConfig.turnstile.options?.theme || 'auto',
      ...startupConfig.turnstile.options
    }
  };

  console.info('[Turnstile] Configuration loaded:', {
    siteKey: config.siteKey.substring(0, 10) + '...',
    options: config.options
  });

  return config;
}

/**
 * Check if Turnstile is enabled based on startup configuration
 * @param {Object} startupConfig - The startup configuration from the backend
 * @returns {boolean} True if Turnstile is enabled
 */
export function isTurnstileEnabled(startupConfig) {
  const config = getTurnstileConfig(startupConfig);
  return config !== null;
}

/**
 * Get the appropriate theme for Turnstile based on current app theme
 * @param {string} appTheme - Current app theme ('light', 'dark', 'system')
 * @param {string} configTheme - Theme from Turnstile config ('auto', 'light', 'dark')
 * @returns {string} Resolved theme for Turnstile widget
 */
export function resolveTurnstileTheme(appTheme, configTheme = 'auto') {
  // If config specifies a specific theme, use it
  if (configTheme === 'light' || configTheme === 'dark') {
    return configTheme;
  }

  // If config is 'auto', follow the app theme
  if (appTheme === 'dark') {
    return 'dark';
  } else if (appTheme === 'light') {
    return 'light';
  } else if (appTheme === 'system') {
    // Check system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  }

  // Default to light theme
  return 'light';
}

/**
 * Validate Turnstile site key format
 * @param {string} siteKey - The site key to validate
 * @returns {boolean} True if the site key format is valid
 */
export function validateSiteKey(siteKey) {
  if (!siteKey || typeof siteKey !== 'string') {
    return false;
  }

  // Check for test keys
  const testKeys = [
    '1x00000000000000000000AA', // Always passes
    '2x00000000000000000000AB', // Always fails
  ];

  if (testKeys.includes(siteKey)) {
    console.warn('[Turnstile] Using test site key:', siteKey);
    return true;
  }

  // Validate production key format (starts with 0x followed by alphanumeric)
  const productionKeyPattern = /^0x[a-zA-Z0-9]{22,}$/;
  return productionKeyPattern.test(siteKey);
}

/**
 * Log Turnstile configuration status for debugging
 * @param {Object} startupConfig - The startup configuration from the backend
 */
export function logTurnstileStatus(startupConfig) {
  const isEnabled = isTurnstileEnabled(startupConfig);
  
  if (isEnabled) {
    const config = getTurnstileConfig(startupConfig);
    console.group('🛡️ Turnstile Status: ENABLED');
    console.log('Site Key:', config.siteKey.substring(0, 10) + '...');
    console.log('Options:', config.options);
    console.log('Valid Key:', validateSiteKey(config.siteKey));
    console.groupEnd();
  } else {
    console.log('🛡️ Turnstile Status: DISABLED');
  }
}

/**
 * Create Turnstile widget options with proper theme resolution
 * @param {Object} startupConfig - The startup configuration from the backend
 * @param {string} currentTheme - Current app theme
 * @returns {Object|null} Widget options or null if disabled
 */
export function createTurnstileOptions(startupConfig, currentTheme) {
  const config = getTurnstileConfig(startupConfig);
  
  if (!config) {
    return null;
  }

  return {
    ...config.options,
    theme: resolveTurnstileTheme(currentTheme, config.options.theme)
  };
}