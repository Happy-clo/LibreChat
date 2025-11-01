const { logger } = require('@librechat/data-schemas');
const { verifyTurnstileToken } = require('~/server/services/start/turnstile');
const { getAppConfig } = require('~/server/services/Config');

/**
 * Middleware to validate Turnstile token for login and registration
 * Skips validation if Turnstile is not enabled in the configuration.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
const validateTurnstile = async (req, res, next) => {
  try {
    // Get app config to check if Turnstile is enabled
    const appConfig = getAppConfig();
    const turnstileEnabled = !!appConfig?.turnstile?.siteKey;

    const { turnstileToken } = req.body || {};

    // If Turnstile is not enabled, skip validation
    if (!turnstileEnabled) {
      logger.debug('[validateTurnstile] Turnstile is disabled, skipping validation');
      return next();
    }

    // Validate token exists and is a non-empty string
    if (!turnstileToken || typeof turnstileToken !== 'string' || turnstileToken.trim() === '') {
      logger.warn('[validateTurnstile] Invalid or missing Turnstile token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        tokenProvided: !!turnstileToken,
        tokenType: typeof turnstileToken,
      });
      return res.status(400).json({
        message: 'Captcha verification is required.',
      });
    }

    // Verify the Turnstile token
    const turnstileResult = await verifyTurnstileToken(turnstileToken);

    // Check if verification was successful
    if (!turnstileResult || !turnstileResult.success || !turnstileResult.verified) {
      const errorDetails = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        success: turnstileResult?.success,
        verified: turnstileResult?.verified,
        error: turnstileResult?.error,
      };

      logger.warn('[validateTurnstile] Turnstile verification failed', errorDetails);

      return res.status(400).json({
        message: 'Captcha verification failed. Please try again.',
      });
    }

    logger.info('[validateTurnstile] Turnstile verification successful', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      tokenLength: turnstileToken.length,
    });

    // Add verification result to request for downstream use
    req.turnstileVerified = true;
    next();
  } catch (error) {
    logger.error('[validateTurnstile] Error during Turnstile validation:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      errorName: error.name,
    });

    return res.status(500).json({
      message: 'Internal server error during captcha verification.',
    });
  }
};

module.exports = {
  validateTurnstile,
};
