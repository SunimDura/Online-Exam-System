// routes/exams.js
const express = require('express');
const db      = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/exams  — active exams (students)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [exams] = await db.query(`
            SELECT e.id, e.title, e.description, e.duration_mins,
                   e.total_marks, e.pass_percent, e.is_active, e.created_at,
                   u.name AS created_by,
                   COUNT(q.id) AS question_count
            FROM exams e
            LEFT JOIN users u ON e.created_by = u.id
            LEFT JOIN questions q ON q.exam_id = e.id
            WHERE e.is_active = 1
            GROUP BY e.id
            ORDER BY e.created_at DESC
        `);
        return res.json({ success: true, data: exams });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// GET /api/exams/all — all exams (admin)
router.get('/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [exams] = await db.query(`
            SELECT e.id, e.title, e.description, e.duration_mins,
                   e.total_marks, e.pass_percent, e.is_active, e.created_at,
                   u.name AS created_by,
                   COUNT(q.id) AS question_count
            FROM exams e
            LEFT JOIN users u ON e.created_by = u.id
            LEFT JOIN questions q ON q.exam_id = e.id
            GROUP BY e.id
            ORDER BY e.created_at DESC
        `);
        return res.json({ success: true, data: exams });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// GET /api/exams/:id — single exam with questions
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [exams] = await db.query('SELECT * FROM exams WHERE id = ?', [req.params.id]);
        if (exams.length === 0)
            return res.status(404).json({ success: false, message: 'Exam not found.' });

        const exam = exams[0];
        if (req.user.role === 'student' && !exam.is_active)
            return res.status(403).json({ success: false, message: 'Exam not available.' });

        // Admin sees correct answers; students do NOT
        let q;
        if (req.user.role === 'admin') {
            [q] = await db.query('SELECT * FROM questions WHERE exam_id = ? ORDER BY id', [req.params.id]);
        } else {
            [q] = await db.query(
                'SELECT id, exam_id, question_text, option_a, option_b, option_c, option_d, marks FROM questions WHERE exam_id = ? ORDER BY id',
                [req.params.id]
            );
        }
        return res.json({ success: true, data: { ...exam, questions: q } });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// POST /api/exams — create exam (admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { title, description, duration_mins, pass_percent } = req.body;
        if (!title)
            return res.status(400).json({ success: false, message: 'Title is required.' });

        const [result] = await db.query(
            'INSERT INTO exams (title, description, duration_mins, pass_percent, created_by) VALUES (?,?,?,?,?)',
            [title, description || '', duration_mins || 30, pass_percent || 50, req.user.id]
        );
        return res.status(201).json({ success: true, message: 'Exam created.', data: { id: result.insertId } });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// PUT /api/exams/:id — update exam (admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { title, description, duration_mins, pass_percent } = req.body;
        const [result] = await db.query(
            'UPDATE exams SET title=?, description=?, duration_mins=?, pass_percent=? WHERE id=?',
            [title, description, duration_mins, pass_percent || 50, req.params.id]
        );
        if (result.affectedRows === 0)
            return res.status(404).json({ success: false, message: 'Exam not found.' });
        return res.json({ success: true, message: 'Exam updated.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// DELETE /api/exams/:id (admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM exams WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0)
            return res.status(404).json({ success: false, message: 'Exam not found.' });
        return res.json({ success: true, message: 'Exam deleted.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// PATCH /api/exams/:id/toggle — toggle active (admin)
router.patch('/:id/toggle', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.query('UPDATE exams SET is_active = NOT is_active WHERE id = ?', [req.params.id]);
        return res.json({ success: true, message: 'Status toggled.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
