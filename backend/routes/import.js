const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parse } = require('csv-parse');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');

// In-memory store for job status (use Redis in production)
const jobStore = {};

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

const REQUIRED_COLUMNS = ['student_id', 'first_name', 'last_name', 'email'];

function validateRow(row, rowNum) {
  const errors = [];
  REQUIRED_COLUMNS.forEach(col => {
    if (!row[col] || String(row[col]).trim() === '') {
      errors.push(`Row ${rowNum}: Missing required field '${col}'`);
    }
  });
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push(`Row ${rowNum}: Invalid email format '${row.email}'`);
  }
  if (row.gender && !['Male','Female','Other'].includes(row.gender)) {
    errors.push(`Row ${rowNum}: Invalid gender '${row.gender}'. Must be Male, Female, or Other`);
  }
  if (row.date_of_birth && isNaN(Date.parse(row.date_of_birth))) {
    errors.push(`Row ${rowNum}: Invalid date_of_birth '${row.date_of_birth}'`);
  }
  return errors;
}

async function processCSV(jobId, buffer, filename) {
  const job = jobStore[jobId];
  job.status = 'processing';

  try {
    const rows = await new Promise((resolve, reject) => {
      parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }, (err, records) => {
        if (err) reject(err);
        else resolve(records);
      });
    });

    job.total_rows = rows.length;
    await pool.execute(
      'UPDATE import_jobs SET status=?, total_rows=? WHERE id=?',
      ['processing', rows.length, jobId]
    );

    const errors = [];
    let success = 0;

    // Validate columns
    if (rows.length > 0) {
      const missingCols = REQUIRED_COLUMNS.filter(c => !Object.keys(rows[0]).includes(c));
      if (missingCols.length > 0) {
        job.status = 'failed';
        job.errors = [`Missing required columns: ${missingCols.join(', ')}`];
        await pool.execute(
          'UPDATE import_jobs SET status=?, errors=?, completed_at=NOW() WHERE id=?',
          ['failed', JSON.stringify(job.errors), jobId]
        );
        return;
      }
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed + header
      const rowErrors = validateRow(row, rowNum);

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        job.error_rows++;
      } else {
        try {
          await pool.execute(
            `INSERT INTO students (student_id, first_name, last_name, email, phone, date_of_birth, gender, address)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
               first_name=VALUES(first_name), last_name=VALUES(last_name),
               phone=VALUES(phone), date_of_birth=VALUES(date_of_birth),
               gender=VALUES(gender), address=VALUES(address)`,
            [
              row.student_id.trim(),
              row.first_name.trim(),
              row.last_name.trim(),
              row.email.trim().toLowerCase(),
              row.phone ? row.phone.trim() : null,
              row.date_of_birth ? row.date_of_birth.trim() : null,
              row.gender ? row.gender.trim() : null,
              row.address ? row.address.trim() : null
            ]
          );
          success++;
          job.success_rows++;
        } catch (dbErr) {
          const msg = dbErr.code === 'ER_DUP_ENTRY'
            ? `Row ${rowNum}: Duplicate student_id or email '${row.student_id}' / '${row.email}'`
            : `Row ${rowNum}: Database error - ${dbErr.message}`;
          errors.push(msg);
          job.error_rows++;
        }
      }

      job.processed_rows = i + 1;

      // Update DB every 50 rows
      if ((i + 1) % 50 === 0) {
        await pool.execute(
          'UPDATE import_jobs SET processed_rows=?, success_rows=?, error_rows=? WHERE id=?',
          [job.processed_rows, job.success_rows, job.error_rows, jobId]
        );
      }
    }

    job.status = 'completed';
    job.errors = errors;

    await pool.execute(
      'UPDATE import_jobs SET status=?, processed_rows=?, success_rows=?, error_rows=?, errors=?, completed_at=NOW() WHERE id=?',
      ['completed', job.processed_rows, job.success_rows, job.error_rows, JSON.stringify(errors), jobId]
    );

  } catch (err) {
    job.status = 'failed';
    job.errors = [err.message];
    await pool.execute(
      'UPDATE import_jobs SET status=?, errors=?, completed_at=NOW() WHERE id=?',
      ['failed', JSON.stringify([err.message]), jobId]
    );
  }
}

// POST upload multiple CSV files (parallel processing)
router.post('/upload', upload.array('files', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'No CSV files uploaded' });
  }

  const jobs = [];

  for (const file of req.files) {
    const jobId = uuidv4();
    const job = {
      id: jobId,
      filename: file.originalname,
      status: 'pending',
      total_rows: 0,
      processed_rows: 0,
      success_rows: 0,
      error_rows: 0,
      errors: [],
      created_at: new Date().toISOString()
    };

    jobStore[jobId] = job;

    await pool.execute(
      'INSERT INTO import_jobs (id, filename, status) VALUES (?, ?, ?)',
      [jobId, file.originalname, 'pending']
    );

    jobs.push({ jobId, filename: file.originalname });

    // Process in parallel (fire and forget)
    processCSV(jobId, file.buffer, file.originalname).catch(console.error);
  }

  res.json({
    success: true,
    message: `${req.files.length} file(s) queued for processing`,
    jobs
  });
});

// GET job status
router.get('/status/:jobId', async (req, res) => {
  const { jobId } = req.params;

  // Check in-memory first for real-time data
  if (jobStore[jobId]) {
    return res.json({ success: true, data: jobStore[jobId] });
  }

  // Fall back to DB
  const [rows] = await pool.execute('SELECT * FROM import_jobs WHERE id = ?', [jobId]);
  if (!rows.length) return res.status(404).json({ success: false, message: 'Job not found' });

  const job = rows[0];
  job.errors = JSON.parse(job.errors || '[]');
  res.json({ success: true, data: job });
});

// GET all import jobs
router.get('/jobs', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM import_jobs ORDER BY created_at DESC LIMIT 50'
    );
    const jobs = rows.map(j => ({ ...j, errors: JSON.parse(j.errors || '[]') }));
    res.json({ success: true, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET sample CSV template
router.get('/template', (req, res) => {
  const csv = `student_id,first_name,last_name,email,phone,date_of_birth,gender,address
STU001,John,Doe,john.doe@example.com,+1234567890,2000-01-15,Male,"123 Main St, City"
STU002,Jane,Smith,jane.smith@example.com,+0987654321,2001-03-22,Female,"456 Oak Ave, Town"
STU003,Alex,Johnson,alex.j@example.com,,1999-07-10,Other,`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="student_import_template.csv"');
  res.send(csv);
});

module.exports = router;
