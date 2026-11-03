// routes/results.js
const express = require('express');
const db      = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/results/submit ─────────────────────────────────
// AUTO-MARKING ENGINE: receives student answers, scores instantly
router.post('/submit', authenticateToken, async (req, res) => {
    try {
        if (req.user.role === 'admin')
            return res.status(403).json({ success: false, message: 'Admins cannot take exams.' });

        const { exam_id, answers } = req.body;
        if (!exam_id || !answers || typeof answers !== 'object')
            return res.status(400).json({ success: false, message: 'exam_id and answers are required.' });

        // Check exam exists and is active
        const [exams] = await db.query('SELECT * FROM exams WHERE id = ? AND is_active = 1', [exam_id]);
        if (exams.length === 0)
            return res.status(404).json({ success: false, message: 'Exam not found or not active.' });

        const exam = exams[0];

        // Check already attempted
        const [existing] = await db.query(
            'SELECT id FROM results WHERE student_id = ? AND exam_id = ?', [req.user.id, exam_id]
        );
        if (existing.length > 0)
            return res.status(409).json({ success: false, message: 'You have already submitted this exam.' });

        // Fetch all questions WITH correct answers (server-side only)
        const [questions] = await db.query(
            'SELECT id, correct_option, marks, question_text, option_a, option_b, option_c, option_d FROM questions WHERE exam_id = ?',
            [exam_id]
        );
        if (questions.length === 0)
            return res.status(400).json({ success: false, message: 'This exam has no questions.' });

        // ── AUTO-MARKING ALGORITHM ────────────────────────────
        let score      = 0;
        let totalMarks = 0;
        const breakdown = [];

        questions.forEach(q => {
            totalMarks += q.marks;

            const given   = answers[q.id] ? answers[q.id].toUpperCase() : null;
            const correct = q.correct_option;
            const isRight = given === correct;

            if (isRight) score += q.marks;

            // Full breakdown per question for instant result display
            breakdown.push({
                question_id:   q.id,
                question_text: q.question_text,
                option_a:      q.option_a,
                option_b:      q.option_b,
                option_c:      q.option_c,
                option_d:      q.option_d,
                given:         given,
                correct:       correct,
                is_correct:    isRight,
                marks_earned:  isRight ? q.marks : 0,
                marks_max:     q.marks
            });
        });

        const percentage = totalMarks > 0 ? parseFloat(((score / totalMarks) * 100).toFixed(2)) : 0;
        const passed     = percentage >= exam.pass_percent;

        // Save result to DB
        const [result] = await db.query(
            'INSERT INTO results (student_id, exam_id, score, total_marks, percentage, passed, answers) VALUES (?,?,?,?,?,?,?)',
            [req.user.id, exam_id, score, totalMarks, percentage, passed ? 1 : 0, JSON.stringify(breakdown)]
        );

        // Return FULL instant result with question-by-question breakdown
        return res.status(201).json({
            success: true,
            message: 'Exam submitted and marked successfully.',
            data: {
                result_id:    result.insertId,
                exam_title:   exam.title,
                score,
                total_marks:  totalMarks,
                percentage,
                passed,
                pass_percent: exam.pass_percent,
                grade:        getGrade(percentage),
                time_taken:   req.body.time_taken || null,
                breakdown     // full per-question results sent back immediately
            }
        });

    } catch (err) {
        console.error('Submit error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

function getGrade(pct) {
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
}

// GET /api/results/my — student's own history
router.get('/my', authenticateToken, async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT r.id, r.score, r.total_marks, r.percentage, r.passed,
                   r.submitted_at, e.title AS exam_title, e.duration_mins,
                   e.pass_percent
            FROM results r
            JOIN exams e ON r.exam_id = e.id
            WHERE r.student_id = ?
            ORDER BY r.submitted_at DESC
        `, [req.user.id]);
        return res.json({ success: true, data: results });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// GET /api/results/all — all results (admin)
router.get('/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT r.id, r.score, r.total_marks, r.percentage, r.passed, r.submitted_at,
                   u.name AS student_name, u.email AS student_email,
                   e.title AS exam_title, e.pass_percent
            FROM results r
            JOIN users u ON r.student_id = u.id
            JOIN exams e ON r.exam_id = e.id
            ORDER BY r.submitted_at DESC
        `);
        return res.json({ success: true, data: results });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// GET /api/results/:id — single result with full breakdown
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT r.*, u.name AS student_name, e.title AS exam_title, e.pass_percent
            FROM results r
            JOIN users u ON r.student_id = u.id
            JOIN exams e ON r.exam_id = e.id
            WHERE r.id = ?
        `, [req.params.id]);

        if (results.length === 0)
            return res.status(404).json({ success: false, message: 'Result not found.' });

        const result = results[0];
        if (req.user.role === 'student' && result.student_id !== req.user.id)
            return res.status(403).json({ success: false, message: 'Access denied.' });

        if (typeof result.answers === 'string') result.answers = JSON.parse(result.answers);
        return res.json({ success: true, data: result });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
