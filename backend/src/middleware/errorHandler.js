const logger = require('../config/logger');

/**
 * Global error handler middleware.
 * Must be the LAST middleware registered in Express.
 */
function errorHandler(err, req, res, next) {
  // Multer file-size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File too large' });
  }

  // Prisma known errors
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'Resource already exists' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Resource not found' });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (status >= 500) {
    logger.error('Unhandled error', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * 404 catch-all – register BEFORE errorHandler but AFTER all routes.
 */
function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
}

module.exports = { errorHandler, notFound };
