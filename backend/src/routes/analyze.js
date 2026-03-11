const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { parseFile, rowsToText, computeStats } = require('../services/fileParser');
const { generateSalesSummary } = require('../services/aiService');
const { sendSummaryEmail } = require('../services/emailService');
const { analyzeLimiter, validateFileType } = require('../middleware/security');
const logger = require('../config/logger');

const router = express.Router();

const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '10');

// Multer — memory storage for secure in-memory processing (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['text/csv', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream'];
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (['csv', 'xlsx', 'xls'].includes(ext)) return cb(null, true);
    cb(new Error('Invalid file type'), false);
  },
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     description: Returns the current health status of the API server.
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * @swagger
 * /api/analyze:
 *   post:
 *     summary: Analyze sales data and send email summary
 *     description: |
 *       Accepts a CSV or XLSX file containing sales data.
 *       The API will:
 *       1. Parse and validate the file
 *       2. Compute basic statistics
 *       3. Generate an AI-powered executive summary using OpenAI GPT
 *       4. Send the formatted summary to the specified email address
 *       
 *       **Rate Limit:** 5 requests per minute per IP.
 *       
 *       **File Limits:** Maximum 10MB. Supported formats: `.csv`, `.xlsx`, `.xls`
 *     tags: [Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - email
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The sales data file (.csv or .xlsx)
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Recipient email address for the summary
 *                 example: executive@company.com
 *     responses:
 *       200:
 *         description: Summary generated and email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyzeSuccessResponse'
 *       400:
 *         description: Bad request (invalid file, missing fields, validation error)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       413:
 *         description: File too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error (AI or email failure)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/analyze',
  analyzeLimiter,
  upload.single('file'),
  validateFileType,
  [
    body('email')
      .isEmail().withMessage('A valid recipient email address is required.')
      .normalizeEmail()
      .isLength({ max: 254 }).withMessage('Email address is too long.'),
  ],
  async (req, res) => {
    const requestId = uuidv4();
    logger.info('Analyze request received', { requestId, ip: req.ip });

    // Validate input fields
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array().map((e) => e.msg),
      });
    }

    const { email } = req.body;
    const file = req.file;

    try {
      // Step 1: Parse the file
      const rows = await parseFile(file);

      if (rows.length > 10000) {
        return res.status(400).json({
          success: false,
          error: 'File too large to process. Maximum 10,000 rows supported.',
        });
      }

      // Step 2: Compute stats & prepare text
      const stats = computeStats(rows);
      // Limit to first 200 rows for LLM context window
      const previewRows = rows.slice(0, 200);
      const dataText = rowsToText(previewRows);

      // Step 3: Generate AI summary
      const summary = await generateSalesSummary(dataText, stats, file.originalname);

      // Step 4: Send email
      const messageId = await sendSummaryEmail(email, summary, file.originalname, requestId);

      logger.info('Analyze request completed successfully', { requestId, email, messageId });

      res.json({
        success: true,
        message: `Sales summary generated and sent to ${email} successfully.`,
        requestId,
        preview: summary.slice(0, 300) + (summary.length > 300 ? '...' : ''),
      });

    } catch (err) {
      logger.error('Analyze request failed', { requestId, error: err.message });

      const statusCode = err.message.includes('API') ? 502
        : err.message.includes('email') ? 502
          : err.message.includes('parse') ? 422
            : 500;

      res.status(statusCode).json({
        success: false,
        error: err.message,
        requestId,
      });
    }
  }
);

module.exports = router;
