const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { sendOrgAdminCredentials } = require('../services/emailService');

const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const generateUsername = (full_name) => {
    return full_name.toLowerCase().replace(/\s+/g, '.');
};

const generatePassword = (username) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let random = '';
    for (let i = 0; i < 4; i++) {
        random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${username}${random}`;
};

const getOrganizations = async (req, res) => {
    try {
        const [orgs] = await db.query('SELECT * FROM organizations ORDER BY created_at DESC');
        res.status(200).json({ organizations: orgs });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const createOrganization = async (req, res) => {
    const { name, code, email, phone, address } = req.body;

    if (!name || !code) {
        return res.status(400).json({ message: 'Organization name and code are required.' });
    }

    try {
        const [existing] = await db.query('SELECT * FROM organizations WHERE code = ?', [code]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Organization code already exists.' });
        }

        const [result] = await db.query(
            'INSERT INTO organizations (name, code, email, phone, address) VALUES (?, ?, ?, ?, ?)',
            [name, code, email, phone, address]
        );

        await db.query('INSERT INTO org_settings (org_id) VALUES (?)', [result.insertId]);

        res.status(201).json({ message: 'Organization created successfully.', org_id: result.insertId });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const updateOrganization = async (req, res) => {
    const { org_id } = req.params;
    const { name, code, email, phone, address, is_active } = req.body;

    try {
        await db.query(
            'UPDATE organizations SET name = ?, code = ?, email = ?, phone = ?, address = ?, is_active = ? WHERE id = ?',
            [name, code, email, phone, address, is_active, org_id]
        );
        res.status(200).json({ message: 'Organization updated successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const deleteOrganization = async (req, res) => {
    const { org_id } = req.params;
    try {
        const [org] = await db.query('SELECT * FROM organizations WHERE id = ?', [org_id]);
        if (org.length === 0) {
            return res.status(404).json({ message: 'Organization not found.' });
        }
        if (org[0].is_active) {
            return res.status(400).json({ message: 'Deactivate the organization before deleting.' });
        }
        await db.query('DELETE FROM organizations WHERE id = ?', [org_id]);
        res.status(200).json({ message: 'Organization deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const getOrgAdmins = async (req, res) => {
    try {
        const [admins] = await db.query(
            `SELECT oa.id, oa.full_name, oa.email, oa.username,
                    oa.is_active, oa.created_at,
                    o.name AS org_name
             FROM org_admins oa
             JOIN organizations o ON oa.org_id = o.id
             ORDER BY oa.created_at DESC`
        );
        res.status(200).json({ org_admins: admins });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const createOrgAdmin = async (req, res) => {
    const { org_id, full_name, email } = req.body;

    if (!org_id || !full_name || !email) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    try {
        // Check if org already has an active org admin
        const [existingOrgAdmin] = await db.query(
            'SELECT * FROM org_admins WHERE org_id = ? AND is_active = 1',
            [org_id]
        );
        if (existingOrgAdmin.length > 0) {
            return res.status(400).json({ message: 'This organization already has an active org admin.' });
        }

        const [existing] = await db.query('SELECT * FROM org_admins WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email already in use.' });
        }

        const [org] = await db.query('SELECT * FROM organizations WHERE id = ?', [org_id]);
        if (org.length === 0) {
            return res.status(404).json({ message: 'Organization not found.' });
        }

        let username = generateUsername(full_name);
        const [existingUsername] = await db.query('SELECT * FROM org_admins WHERE username = ?', [username]);
        if (existingUsername.length > 0) {
            username = `${username}${Math.floor(Math.random() * 100)}`;
        }

        const plainPassword = generatePassword(username);
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(plainPassword, salt);

        await db.query(
            'INSERT INTO org_admins (org_id, full_name, email, username, password_hash) VALUES (?, ?, ?, ?, ?)',
            [org_id, full_name, email, username, password_hash]
        );

        await sendOrgAdminCredentials(email, full_name, org[0].name, username, plainPassword);

        res.status(201).json({ message: 'Org admin created and credentials sent via email.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const deactivateOrgAdmin = async (req, res) => {
    const { org_admin_id } = req.params;
    try {
        await db.query('UPDATE org_admins SET is_active = 0 WHERE id = ?', [org_admin_id]);
        res.status(200).json({ message: 'Org admin deactivated successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const reactivateOrgAdmin = async (req, res) => {
    const { org_admin_id } = req.params;
    try {
        await db.query('UPDATE org_admins SET is_active = 1 WHERE id = ?', [org_admin_id]);
        res.status(200).json({ message: 'Org admin reactivated successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const deleteOrgAdmin = async (req, res) => {
    const { org_admin_id } = req.params;
    try {
        const [admin] = await db.query('SELECT * FROM org_admins WHERE id = ?', [org_admin_id]);
        if (admin.length === 0) {
            return res.status(404).json({ message: 'Org admin not found.' });
        }
        if (admin[0].is_active) {
            return res.status(400).json({ message: 'Deactivate the org admin before deleting.' });
        }
        await db.query('DELETE FROM org_admins WHERE id = ?', [org_admin_id]);
        res.status(200).json({ message: 'Org admin deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const getSuperAdminOverview = async (req, res) => {
    try {
        const [departments] = await db.query(
            `SELECT d.*, o.name AS org_name 
             FROM departments d
             JOIN organizations o ON d.org_id = o.id
             ORDER BY o.name, d.name`
        );
        const [sections] = await db.query(
            `SELECT s.*, d.name AS dept_name, o.name AS org_name
             FROM sections s
             JOIN departments d ON s.department_id = d.id
             JOIN organizations o ON s.org_id = o.id
             ORDER BY o.name, d.name, s.name`
        );
        const [roles] = await db.query(
            `SELECT r.*, o.name AS org_name
             FROM roles r
             JOIN organizations o ON r.org_id = o.id
             ORDER BY o.name, r.name`
        );
        const [leaveTypes] = await db.query(
            `SELECT lt.*, o.name AS org_name
             FROM leave_types lt
             JOIN organizations o ON lt.org_id = o.id
             ORDER BY o.name, lt.name`
        );
        const [staff] = await db.query(
            `SELECT s.id, s.staff_number, s.full_name, s.email,
                    s.gender, s.status, s.date_joined,
                    o.name AS org_name,
                    d.name AS dept_name,
                    sec.name AS section_name,
                    r.name AS role_name
             FROM staff s
             JOIN organizations o ON s.org_id = o.id
             JOIN departments d ON s.department_id = d.id
             LEFT JOIN sections sec ON s.section_id = sec.id
             JOIN roles r ON s.role_id = r.id
             ORDER BY o.name, d.name, s.full_name`
        );
        const [applications] = await db.query(
            `SELECT la.id, la.start_date, la.end_date, la.total_working_days,
                    la.status, la.reason,
                    s.full_name AS staff_name, s.staff_number,
                    lt.name AS leave_type,
                    o.name AS org_name,
                    d.name AS dept_name
             FROM leave_applications la
             JOIN staff s ON la.staff_id = s.id
             JOIN leave_types lt ON la.leave_type_id = lt.id
             JOIN organizations o ON la.org_id = o.id
             JOIN departments d ON s.department_id = d.id
             ORDER BY o.name, la.id DESC`
        );
        const [deptAdmins] = await db.query(
            `SELECT da.id, da.full_name, da.email, da.username,
                    da.is_active, da.created_at,
                    o.name AS org_name,
                    d.name AS dept_name
             FROM dept_admins da
             JOIN organizations o ON da.org_id = o.id
             JOIN departments d ON da.department_id = d.id
             ORDER BY o.name, d.name`
        );

        res.status(200).json({
            departments,
            sections,
            roles,
            leave_types: leaveTypes,
            staff,
            applications,
            dept_admins: deptAdmins
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

module.exports = {
    getOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    getOrgAdmins,
    createOrgAdmin,
    deactivateOrgAdmin,
    reactivateOrgAdmin,
    deleteOrgAdmin,
    getSuperAdminOverview
};