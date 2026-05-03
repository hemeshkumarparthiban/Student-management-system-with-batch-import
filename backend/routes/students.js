const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const { pool } = require('../config/database');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// GET all students with search, filter, pagination
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString().trim(),
  query('sortBy').optional().isIn(['first_name','last_name','email','student_id','created_at']),
  query('sortOrder').optional().isIn(['ASC','DESC']),
], handleValidation, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder || 'DESC';

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause = `WHERE s.first_name LIKE ? OR s.last_name LIKE ? OR s.email LIKE ? OR s.student_id LIKE ? OR s.phone LIKE ?`;
      const searchParam = `%${search}%`;
      params = [searchParam, searchParam, searchParam, searchParam, searchParam];
    }

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM students s ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [students] = await pool.execute(
      `SELECT s.*, 
        COUNT(DISTINCT e.id) as enrolled_courses,
        AVG(e.grade) as avg_grade
       FROM students s
       LEFT JOIN enrollments e ON s.id = e.student_id
       ${whereClause}
       GROUP BY s.id
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: students,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET single student with enrollments
router.get('/:id', async (req, res) => {
  try {
    const [students] = await pool.execute(
      `SELECT * FROM students WHERE id = ?`, [req.params.id]
    );
    if (!students.length) return res.status(404).json({ success: false, message: 'Student not found' });

    const [enrollments] = await pool.execute(
      `SELECT e.*, c.course_name, c.course_code, c.credits
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.student_id = ?
       ORDER BY e.year DESC, e.semester DESC`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...students[0], enrollments } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// POST create student
router.post('/', [
  body('student_id').notEmpty().trim(),
  body('first_name').notEmpty().trim().isLength({ max: 100 }),
  body('last_name').notEmpty().trim().isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('date_of_birth').optional().isDate(),
  body('gender').optional().isIn(['Male','Female','Other']),
  body('address').optional().trim(),
], handleValidation, async (req, res) => {
  try {
    const { student_id, first_name, last_name, email, phone, date_of_birth, gender, address } = req.body;

    const [existing] = await pool.execute(
      'SELECT id FROM students WHERE student_id = ? OR email = ?', [student_id, email]
    );
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Student ID or email already exists' });
    }

    const [result] = await pool.execute(
      `INSERT INTO students (student_id, first_name, last_name, email, phone, date_of_birth, gender, address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [student_id, first_name, last_name, email, phone || null, date_of_birth || null, gender || null, address || null]
    );

    const [newStudent] = await pool.execute('SELECT * FROM students WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Student created successfully', data: newStudent[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// PUT update student
router.put('/:id', [
  body('first_name').optional().trim().isLength({ max: 100 }),
  body('last_name').optional().trim().isLength({ max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('date_of_birth').optional().isDate(),
  body('gender').optional().isIn(['Male','Female','Other']),
  body('address').optional().trim(),
], handleValidation, async (req, res) => {
  try {
    const [existing] = await pool.execute('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Student not found' });

    const fields = ['first_name','last_name','email','phone','date_of_birth','gender','address'];
    const updates = [];
    const values = [];

    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(req.body[f]);
      }
    });

    if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update' });

    values.push(req.params.id);
    await pool.execute(`UPDATE students SET ${updates.join(', ')} WHERE id = ?`, values);

    const [updated] = await pool.execute('SELECT * FROM students WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Student updated successfully', data: updated[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// DELETE student
router.delete('/:id', async (req, res) => {
  try {
    const [existing] = await pool.execute('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Student not found' });

    await pool.execute('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET student grades/enrollments
router.post('/:id/enrollments', [
  body('course_id').isInt(),
  body('grade').optional().isFloat({ min: 0, max: 100 }),
  body('semester').notEmpty(),
  body('year').isInt({ min: 2000, max: 2100 }),
], handleValidation, async (req, res) => {
  try {
    const { course_id, grade, semester, year, status } = req.body;
    const gradeLetterMap = g => {
      if (g >= 97) return 'A+'; if (g >= 93) return 'A'; if (g >= 90) return 'A-';
      if (g >= 87) return 'B+'; if (g >= 83) return 'B'; if (g >= 80) return 'B-';
      if (g >= 77) return 'C+'; if (g >= 73) return 'C'; if (g >= 70) return 'C-';
      if (g >= 60) return 'D'; return 'F';
    };
    const grade_letter = grade !== undefined ? gradeLetterMap(grade) : null;

    const [result] = await pool.execute(
      `INSERT INTO enrollments (student_id, course_id, grade, grade_letter, semester, year, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE grade=VALUES(grade), grade_letter=VALUES(grade_letter), status=VALUES(status)`,
      [req.params.id, course_id, grade || null, grade_letter, semester, year, status || 'enrolled']
    );

    res.status(201).json({ success: true, message: 'Enrollment added', data: { id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
