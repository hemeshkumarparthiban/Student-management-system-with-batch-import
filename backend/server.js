const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { initializeDatabase } = require('./config/database');
const studentRoutes = require('./routes/students');
const importRoutes = require('./routes/import');
const courseRoutes = require('./routes/courses');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/students', studentRoutes);
app.use('/api/import', importRoutes);
app.use('/api/courses', courseRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    const [[{ total_students }]] = await pool.execute('SELECT COUNT(*) as total_students FROM students');
    const [[{ total_courses }]] = await pool.execute('SELECT COUNT(*) as total_courses FROM courses');
    const [[{ total_enrollments }]] = await pool.execute('SELECT COUNT(*) as total_enrollments FROM enrollments');
    const [[{ avg_grade }]] = await pool.execute('SELECT AVG(grade) as avg_grade FROM enrollments WHERE grade IS NOT NULL');
    const [[{ recent_imports }]] = await pool.execute("SELECT COUNT(*) as recent_imports FROM import_jobs WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)");
    res.json({
      success: true,
      data: { total_students, total_courses, total_enrollments, avg_grade: parseFloat(avg_grade || 0).toFixed(1), recent_imports }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File size exceeds 10MB limit' });
  }
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// Start server
async function start() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
