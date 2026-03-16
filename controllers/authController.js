const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// STAFF LOGIN
const staffLogin = async (req, res) => {
    const { staff_number, password } = req.body;

    try {
        // Checking if staff number exists
        const [staff] = await db.query(
            'SELECT * FROM staff WHERE staff_number = ?',
            [staff_number]
        );

        if (staff.length === 0) {
            return res.status(404).json({ message: 'Staff number not found.' });
        }

        const staffMember = staff[0];

        // Checking if account is active
        if (staffMember.status !== 'active') {
            return res.status(403).json({ message: 'Account not yet activated. Contact your admin.' });
        }

        // Checking password
        const isMatch = await bcrypt.compare(password, staffMember.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect password.' });
        }

        // Create token
        const token = jwt.sign(
            {
                id: staffMember.id,
                staff_number: staffMember.staff_number,
                system_role: 'staff',
                role_id: staffMember.role_id,
                section_id: staffMember.section_id
            },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        res.status(200).json({
            message: 'Login successful.',
            token,
            user: {
                id: staffMember.id,
                staff_number: staffMember.staff_number,
                full_name: staffMember.full_name,
                system_role: 'staff',
                section_id: staffMember.section_id,
                role_id: staffMember.role_id
            }
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// ADMIN LOGIN
const adminLogin = async (req, res) => {
    const { admin_number, password } = req.body;

    try {
        // Checking if admin number exists
        const [admin] = await db.query(
            'SELECT * FROM admins WHERE admin_number = ?',
            [admin_number]
        );

        if (admin.length === 0) {
            return res.status(404).json({ message: 'Admin number not found.' });
        }

        const adminMember = admin[0];

        // Check if account is active
        if (!adminMember.is_active) {
            return res.status(403).json({ message: 'Account is deactivated. Contact the developer.' });
        }
         if (!adminMember.is_registered) {
            return res.status(403).json({ message: 'Account not yet registered. Please register first.' });
}
        // Check password
        const isMatch = await bcrypt.compare(password, adminMember.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect password.' });
        }

        // Create token
        const token = jwt.sign(
            {
                id: adminMember.id,
                admin_number: adminMember.admin_number,
                system_role: 'admin',
                department_id: adminMember.department_id
            },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        res.status(200).json({
            message: 'Login successful.',
            token,
            user: {
                id: adminMember.id,
                admin_number: adminMember.admin_number,
                full_name: adminMember.full_name,
                system_role: 'admin',
                department_id: adminMember.department_id
            }
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// STAFF REGISTRATION
const staffRegister = async (req, res) => {
    const { staff_number, full_name, gender, email, password } = req.body;

    try {
        // Checking if staff number exists in registry
        const [registry] = await db.query(
            'SELECT * FROM staff_registry WHERE staff_number = ? AND is_registered = FALSE',
            [staff_number]
        );

        if (registry.length === 0) {
            return res.status(404).json({ message: 'Staff number not found or already registered. Contact your admin.' });
        }

        const registryEntry = registry[0];

        // Check if email already exists
        const [existingEmail] = await db.query(
            'SELECT * FROM staff WHERE email = ?',
            [email]
        );

        if (existingEmail.length > 0) {
            return res.status(400).json({ message: 'Email already in use.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Insert into staff table
        await db.query(
            `INSERT INTO staff 
            (staff_number, full_name, email, password_hash, section_id, gender, date_joined, role_id, status) 
            VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, 'pending')`,
            [
                staff_number,
                full_name,
                email,
                password_hash,
                registryEntry.section_id,
                gender,
                registryEntry.role_id
            ]
        );

        // Mark staff number as registered in registry
        await db.query(
            'UPDATE staff_registry SET is_registered = TRUE WHERE staff_number = ?',
            [staff_number]
        );

        res.status(201).json({ message: 'Registration successful. Wait for admin to activate your account.' });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};
// ADMIN REGISTRATION
const adminRegister = async (req, res) => {
    const { admin_number, full_name, email, password } = req.body;

    try {
        // Check if admin number exists and is not yet registered
        const [admin] = await db.query(
            'SELECT * FROM admins WHERE admin_number = ? AND is_registered = FALSE',
            [admin_number]
        );

        if (admin.length === 0) {
            return res.status(404).json({ message: 'Admin number not found or already registered. Contact the developer.' });
        }

        // Check if email already exists
        const [existingEmail] = await db.query(
            'SELECT * FROM admins WHERE email = ?',
            [email]
        );

        if (existingEmail.length > 0) {
            return res.status(400).json({ message: 'Email already in use.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Update admin record with registration details
        await db.query(
            `UPDATE admins 
             SET full_name = ?, email = ?, password_hash = ?, is_registered = TRUE
             WHERE admin_number = ?`,
            [full_name, email, password_hash, admin_number]
        );

        res.status(200).json({ message: 'Registration successful. You can now login.' });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};
module.exports = { staffLogin, adminLogin, staffRegister , adminRegister };