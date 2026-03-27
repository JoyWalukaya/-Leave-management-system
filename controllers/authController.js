const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Single login for all roles
// Checks all 4 tables and returns
// the correct role in the JWT token
const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        // Check super_admins table
        const [superAdmins] = await db.query(
            'SELECT * FROM super_admins WHERE username = ? AND is_active = 1',
            [username]
        );

        if (superAdmins.length > 0) {
            const admin = superAdmins[0];
            const match = await bcrypt.compare(password, admin.password_hash);
            if (!match) return res.status(401).json({ message: 'Invalid credentials.' });

            const token = jwt.sign(
                {
                    id: admin.id,
                    username: admin.username,
                    full_name: admin.full_name,
                    system_role: 'super_admin'
                },
                process.env.JWT_SECRET,
                { expiresIn: '10m' }
            );

            return res.status(200).json({
                token,
                user: {
                    id: admin.id,
                    username: admin.username,
                    full_name: admin.full_name,
                    system_role: 'super_admin'
                }
            });
        }

        // Check org_admins table
        const [orgAdmins] = await db.query(
            'SELECT * FROM org_admins WHERE username = ? AND is_active = 1',
            [username]
        );

        if (orgAdmins.length > 0) {
            const admin = orgAdmins[0];
            const match = await bcrypt.compare(password, admin.password_hash);
            if (!match) return res.status(401).json({ message: 'Invalid credentials.' });

            const token = jwt.sign(
                {
                    id: admin.id,
                    username: admin.username,
                    full_name: admin.full_name,
                    system_role: 'org_admin',
                    org_id: admin.org_id
                },
                process.env.JWT_SECRET,
                { expiresIn: '10m' }
            );

            return res.status(200).json({
                token,
                user: {
                    id: admin.id,
                    username: admin.username,
                    full_name: admin.full_name,
                    system_role: 'org_admin',
                    org_id: admin.org_id
                }
            });
        }

        // Check dept_admins table
        const [deptAdmins] = await db.query(
            'SELECT * FROM dept_admins WHERE username = ? AND is_active = 1',
            [username]
        );

        if (deptAdmins.length > 0) {
            const admin = deptAdmins[0];
            const match = await bcrypt.compare(password, admin.password_hash);
            if (!match) return res.status(401).json({ message: 'Invalid credentials.' });

            const token = jwt.sign(
                {
                    id: admin.id,
                    username: admin.username,
                    full_name: admin.full_name,
                    system_role: 'dept_admin',
                    org_id: admin.org_id,
                    department_id: admin.department_id
                },
                process.env.JWT_SECRET,
                { expiresIn: '10m' }
            );

            return res.status(200).json({
                token,
                user: {
                    id: admin.id,
                    username: admin.username,
                    full_name: admin.full_name,
                    system_role: 'dept_admin',
                    org_id: admin.org_id,
                    department_id: admin.department_id
                }
            });
        }

        // Check staff table
        const [staffMembers] = await db.query(
            'SELECT * FROM staff WHERE username = ? AND status != ?',
            [username, 'inactive']
        );

        if (staffMembers.length > 0) {
            const staff = staffMembers[0];
            const match = await bcrypt.compare(password, staff.password_hash);
            if (!match) return res.status(401).json({ message: 'Invalid credentials.' });

            // If first login set status to active
            if (staff.status === 'pending') {
                await db.query(
                    'UPDATE staff SET status = ? WHERE id = ?',
                    ['active', staff.id]
                );
            }

            const token = jwt.sign(
                {
                    id: staff.id,
                    username: staff.username,
                    full_name: staff.full_name,
                    system_role: 'staff',
                    org_id: staff.org_id,
                    department_id: staff.department_id,
                    section_id: staff.section_id,
                    role_id: staff.role_id
                },
                process.env.JWT_SECRET,
                { expiresIn: '10m' }
            );

            return res.status(200).json({
                token,
                user: {
                    id: staff.id,
                    username: staff.username,
                    full_name: staff.full_name,
                    system_role: 'staff',
                    org_id: staff.org_id,
                    department_id: staff.department_id,
                    section_id: staff.section_id,
                    role_id: staff.role_id
                }
            });
        }

        // No user found in any table
        return res.status(401).json({ message: 'Invalid credentials.' });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

module.exports = { login };