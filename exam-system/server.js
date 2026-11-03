// server.js — Entry point
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRoutes     = require('./routes/auth');
const examRoutes     = require('./routes/exams');
const questionRoutes = require('./routes/questions');
const resultRoutes   = require('./routes/results');

const app  = express();
const PORT = process.env.PORT || 5000;
const db = require('./config/db');

db.query('SELECT 1')
  .then(() => console.log('✅ DB CONNECTED'))
  .catch(err => console.error('❌ DB ERROR:', err));

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','PATCH'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/exams',     examRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/results',   resultRoutes);

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Online Exam System is running!', timestamp: new Date() });
});

// ── Catch-all → serve frontend ────────────────────────────────
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    } else {
        res.status(404).json({ success: false, message: 'Endpoint not found.' });
    }
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.stack);
    res.status(500).json({ success: false, message: 'Server error.' });
});

app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║    Online Exam System — Server Running    ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  URL  →  http://localhost:${PORT}            ║`);
    console.log(`║  Mode →  ${process.env.NODE_ENV || 'development'}                      ║`);
    console.log('╚══════════════════════════════════════════╝');
});

module.exports = app;
