const { logger } = require('@librechat/data-schemas');
const { verifyTurnstileToken } = require('~/server/services/start/turnstile');
const { getAppConfig } = require('~/server/services/Config');

/**
 * Middleware to validate Turnstile token for login and registration
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
const validateTurnstile = async (req, res, next) => {
  try {
    const { turnstileToken } = req.body;
    
    // Always require Turnstile token
    if (!turnstileToken) {
      logger.warn('[validateTurnstile] Missing Turnstile token', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(400).json({ 
        message: 'Captcha verification is required.' 
      });
    }
    
    // Verify the Turnstile token
    const turnstileResult = await verifyTurnstileToken(turnstileToken);
    
    if (!turnstileResult.success || !turnstileResult.verified) {
      logger.warn('[validateTurnstile] Turnstile verification failed', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        turnstileError: turnstileResult.error
      });
      return res.status(400).json({ 
        message: 'Captcha verification failed. Please try again.' 
      });
    }
    
    logger.info('[validateTurnstile] Turnstile verification successful', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Add verification result to request for downstream use
    req.turnstileVerified = true;
    next();
    
  } catch (error) {
    logger.error('[validateTurnstile] Error during Turnstile validation:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(500).json({ 
      message: 'Internal server error during captcha verification.' 
    });
  }
};

module.exports = {
  validateTurnstile,
};
