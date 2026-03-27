const jwt = require('jsonwebtoken');

// ============================
// VERIFY TOKEN
// This runs on every protected route
// It checks the JWT token in the
// request header and decodes it
// to get the user's details
// ============================
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
        req.user = decoded;
        next();
    });
};

// ============================
// VERIFY SUPER ADMIN
// Only allows super admins
// to access the route
// ============================
const verifySuperAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.system_role !== 'super_admin') {
            return res.status(403).json({ message: 'Access denied. Super admin only.' });
        }
        next();
    });
};

// ============================
// VERIFY ORG ADMIN
// Only allows org admins
// to access the route
// ============================
const verifyOrgAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.system_role !== 'org_admin') {
            return res.status(403).json({ message: 'Access denied. Org admin only.' });
        }
        next();
    });
};

// ============================
// VERIFY DEPT ADMIN
// Only allows department admins
// to access the route
// ============================
const verifyDeptAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.system_role !== 'dept_admin') {
            return res.status(403).json({ message: 'Access denied. Department admin only.' });
        }
        next();
    });
};

// ============================
// VERIFY STAFF
// Only allows staff members
// to access the route
// ============================
const verifyStaff = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.system_role !== 'staff') {
            return res.status(403).json({ message: 'Access denied. Staff only.' });
        }
        next();
    });
};

module.exports = {
    verifyToken,
    verifySuperAdmin,
    verifyOrgAdmin,
    verifyDeptAdmin,
    verifyStaff
};