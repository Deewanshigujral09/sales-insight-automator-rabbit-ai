const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sales Insight Automator API',
      version: '1.0.0',
      description: `
## Rabbitt AI — Sales Insight Automator

This API accepts uploaded CSV/XLSX sales data, generates an AI-powered executive summary using OpenAI GPT, and delivers the report to the specified email address.

### Authentication
All endpoints are rate-limited. No API key is required for the public endpoints in this prototype.

### File Support
- \`.csv\` — Comma-separated values
- \`.xlsx / .xls\` — Excel spreadsheets

### AI Engine
Uses **OpenAI GPT-4o-mini** to generate professional narrative summaries from raw sales data.
      `,
      contact: {
        name: 'Rabbitt AI Engineering',
        email: 'engineering@rabbitt.ai',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? 'https://your-backend.onrender.com'
          : 'http://localhost:5000',
        description: process.env.NODE_ENV === 'production' ? 'Production' : 'Local Development',
      },
    ],
    components: {
      schemas: {
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number', example: 12.34 },
            environment: { type: 'string', example: 'development' },
          },
        },
        AnalyzeSuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Summary generated and sent successfully.' },
            requestId: { type: 'string', example: 'a1b2c3d4-...' },
            preview: {
              type: 'string',
              example: 'Q1 2026 showed strong performance led by Electronics in the North region...',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Validation failed' },
            details: {
              type: 'array',
              items: { type: 'string' },
              example: ['email must be a valid email address'],
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
