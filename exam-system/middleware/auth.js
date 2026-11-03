// middleware/auth.js
// JWT verification and role-based access control

const jwt = require('jsonwebtoken');
require('dotenv').config();

// Verify any logged-in user
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token      = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token. Please log in again.' });
    }
};

// Admin-only guard — use after authenticateToken
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    next();
};

module.exports = { authenticateToken, requireAdmin };
