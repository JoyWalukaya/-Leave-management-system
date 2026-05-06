const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { sendDeptAdminCredentials } = require('../services/emailService');

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

const getOrgAdminProfile = async (req, res) => {
    const id = req.user.id;
    try {
        const [admin] = await db.query(
            `SELECT oa.id, oa.full_name, oa.email, oa.username,
                    o.name AS org_name
             FROM org_admins oa
             JOIN organizations o ON oa.org_id = o.id
             WHERE oa.id = ?`,
            [id]
        );
        if (admin.length === 0) {
            return res.status(404).json({ message: 'Profile not found.' });
        }
        res.status(200).json({ profile: admin[0] });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const getOrgSettings = async (req, res) => {
    const org_id = req.user.org_id;
    try {
        const [settings] = await db.query('SELECT * FROM org_settings WHERE org_id = ?', [org_id]);
        res.status(200).json({ settings: settings[0] || null });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const saveOrgSettings = async (req, res) => {
    const org_id = req.user.org_id;
    const {
        year_reset_month, year_reset_day,
        allow_leave_switch, leave_switch_notice_days, setup_complete
    } = req.body;
    try {
        await db.query(
            `INSERT INTO org_settings 
             (org_id, year_reset_month, year_reset_day,
              allow_leave_switch, leave_switch_notice_days, setup_complete)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             year_reset_month = VALUES(year_reset_month),
             year_reset_day = VALUES(year_reset_day),
             allow_leave_switch = VALUES(allow_leave_switch),
             leave_switch_notice_days = VALUES(leave_switch_notice_days),
             setup_complete = VALUES(setup_complete)`,
            [org_id, year_reset_month, year_reset_day,
            allow_leave_switch, leave_switch_notice_days, setup_complete]
        );
        res.status(200).json({ message: 'Settings saved successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const getDepartments = async (req, res) => {
    const org_id = req.user.org_id;
    try {
        const [departments] = await db.query(
            'SELECT * FROM departments WHERE org_id = ? ORDER BY name', [org_id]
        );
        res.status(200).json({ departments });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const createDepartment = async (req, res) => {
    const org_id = req.user.org_id;
    const { name, code } = req.body;
    if (!name) return res.status(400).json({ message: 'Department name is required.' });
    try {
        const [result] = await db.query(
            'INSERT INTO departments (org_id, name, code) VALUES (?, ?, ?)', [org_id, name, code]
        );
        res.status(201).json({ message: 'Department created successfully.', dept_id: result.insertId });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const updateDepartment = async (req, res) => {
    const org_id = req.user.org_id;
    const { dept_id } = req.params;
    const { name, code } = req.body;
    try {
        await db.query(
            'UPDATE departments SET name = ?, code = ? WHERE id = ? AND org_id = ?',
            [name, code, dept_id, org_id]
        );
        res.status(200).json({ message: 'Department updated successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const deleteDepartment = async (req, res) => {
    const org_id = req.user.org_id;
    const { dept_id } = req.params;
    try {
        await db.query('DELETE FROM departments WHERE id = ? AND org_id = ?', [dept_id, org_id]);
        res.status(200).json({ message: 'Department deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const getSections = async (req, res) => {
    const org_id = req.user.org_id;
    try {
        const [sections] = await db.query(
            `SELECT s.*, d.name AS department_name
             FROM sections s
             JOIN departments d ON s.department_id = d.id
             WHERE s.org_id = ?
             ORDER BY d.name, s.name`,
            [org_id]
        );
        res.status(200).json({ sections });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const createSection = async (req, res) => {
    const org_id = req.user.org_id;
    const { department_id, name } = req.body;
    if (!department_id || !name) {
        return res.status(400).json({ message: 'Department and section name are required.' });
    }
    try {
        const [result] = await db.query(
            'INSERT INTO sections (org_id, department_id, name) VALUES (?, ?, ?)',
            [org_id, department_id, name]
        );
        res.status(201).json({ message: 'Section created successfully.', section_id: result.insertId });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const updateSection = async (req, res) => {
    const org_id = req.user.org_id;
    const { section_id } = req.params;
    const { name, department_id } = req.body;
    try {
        await db.query(
            'UPDATE sections SET name = ?, department_id = ? WHERE id = ? AND org_id = ?',
            [name, department_id, section_id, org_id]
        );
        res.status(200).json({ message: 'Section updated successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const deleteSection = async (req, res) => {
    const org_id = req.user.org_id;
    const { section_id } = req.params;
    try {
        await db.query('DELETE FROM sections WHERE id = ? AND org_id = ?', [section_id, org_id]);
        res.status(200).json({ message: 'Section deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const getRoles = async (req, res) => {
    const org_id = req.user.org_id;
    try {
        const [roles] = await db.query(
            'SELECT * FROM roles WHERE org_id = ? ORDER BY name', [org_id]
        );
        res.status(200).json({ roles });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const createRole = async (req, res) => {
    const org_id = req.user.org_id;
    const { name, is_managerial } = req.body;
    if (!name) return res.status(400).json({ message: 'Role name is required.' });
    try {
        const [result] = await db.query(
            'INSERT INTO roles (org_id, name, is_managerial) VALUES (?, ?, ?)',
            [org_id, name, is_managerial || 0]
        );
        res.status(201).json({ message: 'Role created successfully.', role_id: result.insertId });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const updateRole = async (req, res) => {
    const org_id = req.user.org_id;
    const { role_id } = req.params;
    const { name, is_managerial } = req.body;
    try {
        await db.query(
            'UPDATE roles SET name = ?, is_managerial = ? WHERE id = ? AND org_id = ?',
            [name, is_managerial, role_id, org_id]
        );
        res.status(200).json({ message: 'Role updated successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const deleteRole = async (req, res) => {
    const org_id = req.user.org_id;
    const { role_id } = req.params;
    try {
        await db.query('DELETE FROM roles WHERE id = ? AND org_id = ?', [role_id, org_id]);
        res.status(200).json({ message: 'Role deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const getLeaveTypes = async (req, res) => {
    const org_id = req.user.org_id;
    try {
        const [leaveTypes] = await db.query(
            'SELECT * FROM leave_types WHERE org_id = ? ORDER BY name', [org_id]
        );
        res.status(200).json({ leave_types: leaveTypes });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const createLeaveType = async (req, res) => {
    const org_id = req.user.org_id;
    const { name, gender_restriction } = req.body;
    if (!name) return res.status(400).json({ message: 'Leave type name is required.' });
    try {
        const [result] = await db.query(
            'INSERT INTO leave_types (org_id, name, gender_restriction) VALUES (?, ?, ?)',
            [org_id, name, gender_restriction || 'any']
        );
        res.status(201).json({ message: 'Leave type created successfully.', leave_type_id: result.insertId });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const updateLeaveType = async (req, res) => {
    const org_id = req.user.org_id;
    const { leave_type_id } = req.params;
    const { name, gender_restriction, is_active } = req.body;
    try {
        await db.query(
            'UPDATE leave_types SET name = ?, gender_restriction = ?, is_active = ? WHERE id = ? AND org_id = ?',
            [name, gender_restriction, is_active, leave_type_id, org_id]
        );
        res.status(200).json({ message: 'Leave type updated successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const deleteLeaveType = async (req, res) => {
    const org_id = req.user.org_id;
    const { leave_type_id } = req.params;
    try {
        await db.query('DELETE FROM leave_types WHERE id = ? AND org_id = ?', [leave_type_id, org_id]);
        res.status(200).json({ message: 'Leave type deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const getLeaveEntitlements = async (req, res) => {
    const org_id = req.user.org_id;
    try {
        const [entitlements] = await db.query(
            `SELECT le.*, lt.name AS leave_type_name, r.name AS role_name
             FROM leave_entitlements le
             JOIN leave_types lt ON le.leave_type_id = lt.id
             JOIN roles r ON le.role_id = r.id
             WHERE le.org_id = ?
             ORDER BY lt.name, r.name`,
            [org_id]
        );
        res.status(200).json({ entitlements });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const saveLeaveEntitlement = async (req, res) => {
    const org_id = req.user.org_id;
    const {
        leave_type_id, role_id, max_days_per_year,
        max_concurrent_staff, min_days_before_reapply, max_carry_forward_days
    } = req.body;
    try {
        await db.query(
            `INSERT INTO leave_entitlements
             (org_id, leave_type_id, role_id, max_days_per_year,
              max_concurrent_staff, min_days_before_reapply, max_carry_forward_days)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             max_days_per_year = VALUES(max_days_per_year),
             max_concurrent_staff = VALUES(max_concurrent_staff),
             min_days_before_reapply = VALUES(min_days_before_reapply),
             max_carry_forward_days = VALUES(max_carry_forward_days)`,
            [org_id, leave_type_id, role_id, max_days_per_year,
            max_concurrent_staff || 1, min_days_before_reapply || 0, max_carry_forward_days || 0]
        );
        res.status(200).json({ message: 'Leave entitlement saved successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const deleteLeaveEntitlement = async (req, res) => {
    const org_id = req.user.org_id;
    const { entitlement_id } = req.params;
    try {
        await db.query('DELETE FROM leave_entitlements WHERE id = ? AND org_id = ?', [entitlement_id, org_id]);
        res.status(200).json({ message: 'Leave entitlement deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const getWorkDays = async (req, res) => {
    const org_id = req.user.org_id;
    try {
        const [workDays] = await db.query(
            `SELECT wd.*, d.name AS department_name, s.name AS section_name
             FROM work_days wd
             LEFT JOIN departments d ON wd.department_id = d.id
             LEFT JOIN sections s ON wd.section_id = s.id
             WHERE wd.org_id = ?`,
            [org_id]
        );
        res.status(200).json({ work_days: workDays });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const saveWorkDays = async (req, res) => {
    const org_id = req.user.org_id;
    const {
        department_id, section_id,
        monday, tuesday, wednesday, thursday, friday, saturday, sunday
    } = req.body;
    try {
        await db.query(
            `INSERT INTO work_days
             (org_id, department_id, section_id, monday, tuesday, wednesday,
              thursday, friday, saturday, sunday)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             monday = VALUES(monday), tuesday = VALUES(tuesday),
             wednesday = VALUES(wednesday), thursday = VALUES(thursday),
             friday = VALUES(friday), saturday = VALUES(saturday),
             sunday = VALUES(sunday)`,
            [org_id, department_id, section_id || null,
            monday, tuesday, wednesday, thursday, friday, saturday, sunday]
        );
        res.status(200).json({ message: 'Work days saved successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const getPublicHolidays = async (req, res) => {
    const org_id = req.user.org_id;
    try {
        const [holidays] = await db.query(
            'SELECT * FROM public_holidays WHERE org_id = ? ORDER BY holiday_date', [org_id]
        );
        res.status(200).json({ holidays });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const createPublicHoliday = async (req, res) => {
    const org_id = req.user.org_id;
    const { name, holiday_date, is_recurring } = req.body;
    if (!name || !holiday_date) {
        return res.status(400).json({ message: 'Name and date are required.' });
    }
    try {
        await db.query(
            'INSERT INTO public_holidays (org_id, name, holiday_date, is_recurring) VALUES (?, ?, ?, ?)',
            [org_id, name, holiday_date, is_recurring !== undefined ? is_recurring : 1]
        );
        res.status(201).json({ message: 'Public holiday created successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const updatePublicHoliday = async (req, res) => {
    const org_id = req.user.org_id;
    const { holiday_id } = req.params;
    const { name, holiday_date } = req.body;
    try {
        await db.query(
            'UPDATE public_holidays SET name = ?, holiday_date = ? WHERE id = ? AND org_id = ?',
            [name, holiday_date, holiday_id, org_id]
        );
        res.status(200).json({ message: 'Public holiday updated successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const deletePublicHoliday = async (req, res) => {
    const org_id = req.user.org_id;
    const { holiday_id } = req.params;
    try {
        await db.query('DELETE FROM public_holidays WHERE id = ? AND org_id = ?', [holiday_id, org_id]);
        res.status(200).json({ message: 'Public holiday deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const getDeptAdmins = async (req, res) => {
    const org_id = req.user.org_id;
    try {
        const [admins] = await db.query(
            `SELECT da.id, da.full_name, da.email, da.username,
                    da.is_active, da.created_at,
                    d.name AS department_name
             FROM dept_admins da
             JOIN departments d ON da.department_id = d.id
             WHERE da.org_id = ?
             ORDER BY d.name`,
            [org_id]
        );
        res.status(200).json({ dept_admins: admins });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const createDeptAdmin = async (req, res) => {
    const org_id = req.user.org_id;
    const { department_id, full_name, email } = req.body;

    if (!department_id || !full_name || !email) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    try {
        const [existing] = await db.query('SELECT * FROM dept_admins WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email already in use.' });
        }

        const [org] = await db.query('SELECT * FROM organizations WHERE id = ?', [org_id]);
        const [dept] = await db.query('SELECT * FROM departments WHERE id = ?', [department_id]);

        let username = generateUsername(full_name);
        const [existingUsername] = await db.query('SELECT * FROM dept_admins WHERE username = ?', [username]);
        if (existingUsername.length > 0) {
            username = `${username}${Math.floor(Math.random() * 100)}`;
        }

        const plainPassword = generatePassword(username);
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(plainPassword, salt);

        await db.query(
            'INSERT INTO dept_admins (org_id, department_id, full_name, email, username, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
            [org_id, department_id, full_name, email, username, password_hash]
        );

        await sendDeptAdminCredentials(email, full_name, org[0].name, dept[0].name, username, plainPassword);

        res.status(201).json({ message: 'Dept admin created and credentials sent via email.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const deactivateDeptAdmin = async (req, res) => {
    const org_id = req.user.org_id;
    const { dept_admin_id } = req.params;
    try {
        await db.query(
            'UPDATE dept_admins SET is_active = 0 WHERE id = ? AND org_id = ?',
            [dept_admin_id, org_id]
        );
        res.status(200).json({ message: 'Dept admin deactivated successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const reactivateDeptAdmin = async (req, res) => {
    const org_id = req.user.org_id;
    const { dept_admin_id } = req.params;
    try {
        await db.query(
            'UPDATE dept_admins SET is_active = 1 WHERE id = ? AND org_id = ?',
            [dept_admin_id, org_id]
        );
        res.status(200).json({ message: 'Dept admin reactivated successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const deleteDeptAdmin = async (req, res) => {
    const org_id = req.user.org_id;
    const { dept_admin_id } = req.params;
    try {
        const [admin] = await db.query(
            'SELECT * FROM dept_admins WHERE id = ? AND org_id = ?',
            [dept_admin_id, org_id]
        );
        if (admin.length === 0) {
            return res.status(404).json({ message: 'Dept admin not found.' });
        }
        if (admin[0].is_active) {
            return res.status(400).json({ message: 'Deactivate the dept admin before deleting.' });
        }
        await db.query('DELETE FROM dept_admins WHERE id = ?', [dept_admin_id]);
        res.status(200).json({ message: 'Dept admin deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const getAllStaff = async (req, res) => {
    const org_id = req.user.org_id;
    try {
        const [staff] = await db.query(
            `SELECT s.id, s.staff_number, s.full_name, s.email,
                    s.gender, s.username, s.status, s.date_joined,
                    d.name AS department_name,
                    sec.name AS section_name,
                    r.name AS role_name
             FROM staff s
             JOIN departments d ON s.department_id = d.id
             LEFT JOIN sections sec ON s.section_id = sec.id
             JOIN roles r ON s.role_id = r.id
             WHERE s.org_id = ?
             ORDER BY d.name, sec.name, s.full_name`,
            [org_id]
        );
        res.status(200).json({ staff });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

module.exports = {
    getOrgAdminProfile,
    getOrgSettings,
    saveOrgSettings,
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getSections,
    createSection,
    updateSection,
    deleteSection,
    getRoles,
    createRole,
    updateRole,
    deleteRole,
    getLeaveTypes,
    createLeaveType,
    updateLeaveType,
    deleteLeaveType,
    getLeaveEntitlements,
    saveLeaveEntitlement,
    deleteLeaveEntitlement,
    getWorkDays,
    saveWorkDays,
    getPublicHolidays,
    createPublicHoliday,
    updatePublicHoliday,
    deletePublicHoliday,
    getDeptAdmins,
    createDeptAdmin,
    deactivateDeptAdmin,
    reactivateDeptAdmin,
    deleteDeptAdmin,
    getAllStaff
};