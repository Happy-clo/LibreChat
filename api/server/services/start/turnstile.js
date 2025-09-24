const { logger } = require('@librechat/data-schemas');
const { removeNullishValues } = require('librechat-data-provider');
const axios = require('axios');
const mongoose = require('mongoose');
const { connectDb } = require('../../db/connect');

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
 * Fetches turnstile data from hapxs API and stores it to MongoDB
 * @returns {Promise<Object>} The fetched turnstile data
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
    
    logger.info('Successfully fetched and stored turnstile data from hapxs API', {
      dataSize: JSON.stringify(response.data).length,
      recordId: turnstileRecord._id
    });
    
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch or store turnstile data:', {
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
 * Now also fetches data from hapxs API and stores to MongoDB.
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

  /** @type {TCustomConfig['turnstile']} */
  const loadedTurnstile = removeNullishValues({
    siteKey: customTurnstile.siteKey ?? defaults.siteKey ?? 'default-site-key',
    options: customTurnstile.options ?? defaults.options ?? {},
  });

  // Always enable Turnstile
  logger.info(
    'Turnstile is ALWAYS ENABLED with configuration:\n' + JSON.stringify(loadedTurnstile, null, 2),
  );
  
  // Fetch and store data from hapxs API
  try {
    const apiData = await fetchAndStoreTurnstileData();
    loadedTurnstile.apiData = apiData;
    logger.info('Successfully integrated hapxs API data into turnstile configuration');
  } catch (error) {
    logger.warn('Failed to fetch hapxs API data, continuing with basic configuration:', error.message);
  }

  return loadedTurnstile;
}

module.exports = {
  loadTurnstileConfig,
  fetchAndStoreTurnstileData,
  verifyTurnstileToken,
  TurnstileData,
};
