const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const logger = require('../config/logger');

/**
 * General API rate limiter
 * Prevents abuse and DoS on all routes
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '900000'), // 15 min
  max: parseInt(process.env.API_RATE_LIMIT_MAX || '100'),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please wait before trying again.',
  },
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
    res.status(429).json(options.message);
  },
});

/**
 * Strict rate limiter for the analyze endpoint
 * More restrictive to control AI API costs
 */
const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // max 5 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Analysis rate limit reached. Maximum 5 requests per minute.',
  },
  handler: (req, res, next, options) => {
    logger.warn('Analyze rate limit exceeded', { ip: req.ip });
    res.status(429).json(options.message);
  },
});

/**
 * Security headers middleware (Helmet)
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'cdn.jsdelivr.net'],
      fontSrc: ["'self'", 'fonts.gstatic.com', 'cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:'],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow Swagger UI to work
});

/**
 * Request logger middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });
  next();
};

/**
 * File type validation middleware — blocks non-CSV/XLSX uploads
 */
const validateFileType = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded.' });
  }

  const allowedMimeTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream',
  ];
  const allowedExtensions = ['csv', 'xlsx', 'xls'];
  const ext = req.file.originalname.split('.').pop().toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    logger.warn('Rejected file upload - invalid extension', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
    });
    return res.status(400).json({
      success: false,
      error: 'Invalid file type. Only .csv and .xlsx files are accepted.',
    });
  }

  // Basic magic-byte check for XLSX (PK zip header) and CSV
  if (ext === 'xlsx' || ext === 'xls') {
    const magic = req.file.buffer.slice(0, 4).toString('hex');
    if (magic !== '504b0304') {
      return res.status(400).json({
        success: false,
        error: 'File content does not match Excel format.',
      });
    }
  }

  next();
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path });

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 10}MB.`,
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'Request payload too large.' });
  }

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message,
  });
};

module.exports = {
  apiLimiter,
  analyzeLimiter,
  securityHeaders,
  requestLogger,
  validateFileType,
  errorHandler,
};
