const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

router.get('/', async (req, res) => {
  try {
    const [courses] = await pool.execute(
      `SELECT c.*, COUNT(e.id) as enrolled_count 
       FROM courses c LEFT JOIN enrollments e ON c.id = e.course_id
       GROUP BY c.id ORDER BY c.course_name`
    );
    res.json({ success: true, data: courses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', [
  body('course_code').notEmpty().trim(),
  body('course_name').notEmpty().trim(),
  body('credits').optional().isInt({ min: 1, max: 12 }),
  body('description').optional().trim(),
], handleValidation, async (req, res) => {
  try {
    const { course_code, course_name, credits, description } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO courses (course_code, course_name, credits, description) VALUES (?, ?, ?, ?)',
      [course_code, course_name, credits || 3, description || null]
    );
    res.status(201).json({ success: true, message: 'Course created', data: { id: result.insertId } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Course code already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', [
  body('course_name').optional().trim(),
  body('credits').optional().isInt({ min: 1, max: 12 }),
  body('description').optional().trim(),
], handleValidation, async (req, res) => {
  try {
    const { course_name, credits, description } = req.body;
    await pool.execute(
      'UPDATE courses SET course_name=COALESCE(?,course_name), credits=COALESCE(?,credits), description=COALESCE(?,description) WHERE id=?',
      [course_name || null, credits || null, description || null, req.params.id]
    );
    res.json({ success: true, message: 'Course updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM courses WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
