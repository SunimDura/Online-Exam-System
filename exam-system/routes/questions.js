// routes/questions.js
const express = require('express');
const db      = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/questions — add question (admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks } = req.body;

        if (!exam_id || !question_text || !option_a || !option_b || !option_c || !option_d || !correct_option)
            return res.status(400).json({ success: false, message: 'All fields are required.' });

        if (!['A','B','C','D'].includes(correct_option.toUpperCase()))
            return res.status(400).json({ success: false, message: 'correct_option must be A, B, C, or D.' });

        const [exams] = await db.query('SELECT id FROM exams WHERE id = ?', [exam_id]);
        if (exams.length === 0)
            return res.status(404).json({ success: false, message: 'Exam not found.' });

        const [result] = await db.query(
            'INSERT INTO questions (exam_id,question_text,option_a,option_b,option_c,option_d,correct_option,marks) VALUES (?,?,?,?,?,?,?,?)',
            [exam_id, question_text, option_a, option_b, option_c, option_d, correct_option.toUpperCase(), marks || 1]
        );
        return res.status(201).json({ success: true, message: 'Question added.', data: { id: result.insertId } });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// PUT /api/questions/:id (admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { question_text, option_a, option_b, option_c, option_d, correct_option, marks } = req.body;
        const [result] = await db.query(
            'UPDATE questions SET question_text=?,option_a=?,option_b=?,option_c=?,option_d=?,correct_option=?,marks=? WHERE id=?',
            [question_text, option_a, option_b, option_c, option_d, correct_option.toUpperCase(), marks || 1, req.params.id]
        );
        if (result.affectedRows === 0)
            return res.status(404).json({ success: false, message: 'Question not found.' });
        return res.json({ success: true, message: 'Question updated.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// DELETE /api/questions/:id (admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM questions WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0)
            return res.status(404).json({ success: false, message: 'Question not found.' });
        return res.json({ success: true, message: 'Question deleted.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// GET /api/questions/exam/:examId (admin — includes correct answers)
router.get('/exam/:examId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [questions] = await db.query(
            'SELECT * FROM questions WHERE exam_id = ? ORDER BY id', [req.params.examId]
        );
        return res.json({ success: true, data: questions });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
