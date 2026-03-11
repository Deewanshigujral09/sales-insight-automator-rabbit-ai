const csv = require('csv-parser');
const XLSX = require('xlsx');
const { Readable } = require('stream');
const logger = require('../config/logger');

/**
 * Parse a CSV buffer into an array of row objects
 */
const parseCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    const rows = [];
    const stream = Readable.from(buffer.toString('utf-8'));
    stream
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', (err) => reject(err));
  });
};

/**
 * Parse an XLSX/XLS buffer into an array of row objects
 */
const parseXLSX = (buffer) => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
    return rows;
  } catch (err) {
    throw new Error(`Failed to parse Excel file: ${err.message}`);
  }
};

/**
 * Master parser — auto-detects file type by mimetype/extension
 */
const parseFile = async (file) => {
  const { originalname, mimetype, buffer } = file;
  const ext = originalname.split('.').pop().toLowerCase();

  logger.info('Parsing uploaded file', { filename: originalname, mimetype, ext });

  let rows;
  if (ext === 'csv' || mimetype === 'text/csv') {
    rows = await parseCSV(buffer);
  } else if (['xlsx', 'xls'].includes(ext) || mimetype.includes('spreadsheet') || mimetype.includes('excel')) {
    rows = parseXLSX(buffer);
  } else {
    throw new Error('Unsupported file type. Please upload a .csv or .xlsx file.');
  }

  if (!rows || rows.length === 0) {
    throw new Error('The uploaded file appears to be empty or has no readable data.');
  }

  logger.info('File parsed successfully', { rowCount: rows.length });
  return rows;
};

/**
 * Convert rows array to a readable text table for the LLM
 */
const rowsToText = (rows) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const headerLine = headers.join(' | ');
  const divider = headers.map(() => '---').join(' | ');
  const dataLines = rows.map((row) =>
    headers.map((h) => String(row[h] ?? '')).join(' | ')
  );
  return [headerLine, divider, ...dataLines].join('\n');
};

/**
 * Compute basic statistics from rows for prompt enrichment
 */
const computeStats = (rows) => {
  const stats = {};
  const numericFields = {};

  rows.forEach((row) => {
    Object.entries(row).forEach(([key, val]) => {
      const num = parseFloat(String(val).replace(/,/g, ''));
      if (!isNaN(num)) {
        if (!numericFields[key]) numericFields[key] = [];
        numericFields[key].push(num);
      }
    });
  });

  Object.entries(numericFields).forEach(([key, values]) => {
    stats[key] = {
      total: values.reduce((a, b) => a + b, 0).toFixed(2),
      average: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  });

  return stats;
};

module.exports = { parseFile, rowsToText, computeStats };
