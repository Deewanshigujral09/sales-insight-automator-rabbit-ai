require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const analyzeRouter = require('./routes/analyze');
const {
  apiLimiter,
  securityHeaders,
  requestLogger,
  errorHandler,
} = require('./middleware/security');
const logger = require('./config/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Headers ────────────────────────────────────────────
app.use(securityHeaders);

// ─── CORS ────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000' || 'http://localhost:5000' )
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Swagger UI, Postman, mobile apps)
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    logger.warn('CORS blocked', { origin });
    callback(new Error(`Origin ${origin} not allowed by CORS policy.`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: false,
}));

// ─── Body Parsers ────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ─── Request Logging ─────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}
app.use(requestLogger);

// ─── Global Rate Limiter ──────────────────────────────────────────
app.use(apiLimiter);

// ─── Swagger Documentation ────────────────────────────────────────
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Rabbitt AI — Sales Insight API',
    customCss: `
      .swagger-ui .topbar { background: #1a1a2e; }
      .swagger-ui .topbar-wrapper img { content: none; }
      .swagger-ui .topbar-wrapper::before {
        content: '🐇 Rabbitt AI — Sales Insight Automator';
        color: white;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.3px;
      }
      .swagger-ui .info .title { color: #1a1a2e; }
      .swagger-ui .btn.execute { background: #e63946; border-color: #e63946; }
    `,
  })
);

// Expose raw swagger JSON for external consumers
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ─── Application Routes ───────────────────────────────────────────
app.use('/api', analyzeRouter);

// ─── 404 Handler ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found.`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`, {
      env: process.env.NODE_ENV || 'development',
      swagger: `http://localhost:${PORT}/api/docs`,
    });
  });
}

module.exports = app;
