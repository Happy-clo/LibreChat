const { logger } = require('@librechat/data-schemas');
const { removeNullishValues } = require('librechat-data-provider');
const axios = require('axios');
const mongoose = require('mongoose');
const { connectDb } = require('../../../db/connect');

// Define Turnstile data schema
const turnstileSchema = new mongoose.Schema({
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    default: 'hapxs-api'
  }
});

const TurnstileData = mongoose.model('TurnstileData', turnstileSchema);

/**
 * Fetches turnstile configuration from hapxs API and stores it to MongoDB
 * @returns {Promise<Object>} The fetched turnstile configuration data
 */
async function fetchAndStoreTurnstileData() {
  try {
    // Connect to MongoDB
    await connectDb();
    
    // Make request to the hapxs API
    const response = await axios.get('https://api.hapxs.com/api/turnstile/public-turnstile', {
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'LibreChat-Turnstile-Service',
        'Accept': 'application/json'
      }
    });
    
    // Store the response data to MongoDB
    const turnstileRecord = new TurnstileData({
      data: response.data,
      timestamp: new Date(),
      source: 'hapxs-api'
    });
    
    await turnstileRecord.save();
    
    logger.info('Successfully fetched and stored turnstile configuration from hapxs API', {
      dataSize: JSON.stringify(response.data).length,
      recordId: turnstileRecord._id
    });
    
    // Extract turnstile configuration from API response
    const turnstileConfig = {
      siteKey: response.data?.siteKey || response.data?.site_key,
      options: {
        language: response.data?.options?.language || response.data?.language || 'auto',
        size: response.data?.options?.size || response.data?.size || 'normal',
        theme: response.data?.options?.theme || response.data?.theme || 'auto',
        ...response.data?.options
      }
    };
    
    return turnstileConfig;
  } catch (error) {
    logger.error('Failed to fetch or store turnstile configuration:', {
      error: error.message,
      stack: error.stack,
      url: 'https://api.hapxs.com/api/turnstile/public-turnstile'
    });
    throw error;
  }
}

/**
 * Verifies a Turnstile token using the hapxs API
 * @param {string} token - The Turnstile token to verify
 * @returns {Promise<Object>} The verification result
 */
async function verifyTurnstileToken(token) {
  try {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token: token must be a non-empty string');
    }

    // Make POST request to verify the token
    const response = await axios.post('https://api.hapxs.com/api/turnstile/verify-token', {
      token: token
    }, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LibreChat-Turnstile-Service',
        'Accept': 'application/json'
      }
    });

    const { success, verified } = response.data;

    logger.info('Turnstile token verification completed', {
      success: success,
      verified: verified,
      tokenLength: token.length
    });

    return {
      success: Boolean(success),
      verified: Boolean(verified),
      data: response.data
    };
  } catch (error) {
    logger.error('Failed to verify turnstile token:', {
      error: error.message,
      stack: error.stack,
      url: 'https://api.hapxs.com/api/turnstile/verify-token',
      tokenProvided: Boolean(token)
    });
    
    // Return a failed verification result instead of throwing
    return {
      success: false,
      verified: false,
      error: error.message
    };
  }
}

/**
 * Loads and maps the Cloudflare Turnstile configuration.
 * Fetches configuration from hapxs API and stores to MongoDB.
 *
 * Expected config structure:
 *
 * turnstile:
 *   siteKey: "your-site-key-here"
 *   options:
 *     language: "auto"    // "auto" or an ISO 639-1 language code (e.g. en)
 *     size: "normal"      // Options: "normal", "compact", "flexible", or "invisible"
 *
 * @param {TCustomConfig | undefined} config - The loaded custom configuration.
 * @param {TConfigDefaults} configDefaults - The custom configuration default values.
 * @returns {Promise<TCustomConfig['turnstile']>} The mapped Turnstile configuration with API data.
 */
async function loadTurnstileConfig(config, configDefaults) {
  const { turnstile: customTurnstile = {} } = config ?? {};
  const { turnstile: defaults = {} } = configDefaults;

  // First try to fetch configuration from hapxs API
  let apiTurnstileConfig = null;
  try {
    apiTurnstileConfig = await fetchAndStoreTurnstileData();
    logger.info('Successfully fetched turnstile configuration from hapxs API');
  } catch (error) {
    logger.warn('Failed to fetch turnstile configuration from hapxs API:', error.message);
  }

  // Determine the site key from API, custom config, or defaults (in that order)
  const siteKey = apiTurnstileConfig?.siteKey ?? 
                  customTurnstile.siteKey ?? 
                  defaults.siteKey;
  
  if (!siteKey || siteKey === 'default-site-key') {
    logger.warn('Turnstile is DISABLED - No valid site key provided from API or configuration.');
    return null;
  }

  /** @type {TCustomConfig['turnstile']} */
  const loadedTurnstile = removeNullishValues({
    siteKey: siteKey,
    options: {
      // API options take priority, then custom config, then defaults
      ...defaults.options,
      ...customTurnstile.options,
      ...apiTurnstileConfig?.options
    },
  });

  logger.info(
    'Turnstile is ENABLED with configuration:\n' + JSON.stringify(loadedTurnstile, null, 2),
  );

  return loadedTurnstile;
}

module.exports = {
  loadTurnstileConfig,
  fetchAndStoreTurnstileData,
  verifyTurnstileToken,
  TurnstileData,
};
