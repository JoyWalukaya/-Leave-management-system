const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid or expired token.' });
    }
};

const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.system_role === 'admin') {
            next();
        } else {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }
    });
};

const verifyStaff = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.system_role === 'staff') {
            next();
        } else {
            return res.status(403).json({ message: 'Access denied. Staff only.' });
        }
    });
};

module.exports = { verifyToken, verifyAdmin, verifyStaff };