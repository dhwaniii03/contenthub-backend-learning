/**
 * Language Middleware
 * Extracts language code from headers ('x-lang' or 'Accept-Language')
 */
export const langMiddleware = (req, res, next) => {
  // 1. Check custom header (common in mobile/admin apps)
  let lang = req.headers['x-lang'];

  // 2. Fallback to standard Accept-Language header
  if (!lang && req.headers['accept-language']) {
    lang = req.headers['accept-language'].split(',')[0].split('-')[0];
  }

  // Default to 'en'
  req.lang = (lang || 'en').toLowerCase();
  next();
};
