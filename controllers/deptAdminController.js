const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { sendStaffCredentials } = require('../services/emailService');
const { calculateWorkingDays, calculateWorkingDaysForDept } = require('./staffController');

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

const getDeptAdminProfile = async (req, res) => {
    const id = req.user.id;
    try {
        const [admin] = await db.query(
            `SELECT da.id, da.full_name, da.email, da.username,
                    o.name AS org_name,
                    d.name AS dept_name
             FROM dept_admins da
             JOIN organizations o ON da.org_id = o.id
             JOIN departments d ON da.department_id = d.id
             WHERE da.id = ?`,
            [id]
        );
        if (admin.length === 0) return res.status(404).json({ message: 'Profile not found.' });
        res.status(200).json({ profile: admin[0] });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const getDeptRoles = async (req, res) => {
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

const getDeptSections = async (req, res) => {
    const org_id = req.user.org_id;
    const department_id = req.user.department_id;
    try {
        const [sections] = await db.query(
            'SELECT * FROM sections WHERE org_id = ? AND department_id = ? ORDER BY name',
            [org_id, department_id]
        );
        res.status(200).json({ sections });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const getDeptStaff = async (req, res) => {
    const org_id = req.user.org_id;
    const department_id = req.user.department_id;
    try {
        const [staff] = await db.query(
            `SELECT s.id, s.staff_number, s.full_name, s.email,
                    s.gender, s.username, s.status, s.date_joined,
                    sec.name AS section_name,
                    r.name AS role_name
             FROM staff s
             LEFT JOIN sections sec ON s.section_id = sec.id
             JOIN roles r ON s.role_id = r.id
             WHERE s.org_id = ? AND s.department_id = ?
             ORDER BY sec.name, s.full_name`,
            [org_id, department_id]
        );
        res.status(200).json({ staff });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const createStaff = async (req, res) => {
    const org_id = req.user.org_id;
    const department_id = req.user.department_id;
    const { staff_number, full_name, email, gender, role_id, section_id, date_joined } = req.body;

    if (!staff_number || !full_name || !gender || !role_id || !date_joined) {
        return res.status(400).json({ message: 'Staff number, full name, gender, role and date joined are required.' });
    }

    if (email && !isValidEmail(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    try {
        const [existing] = await db.query('SELECT * FROM staff WHERE staff_number = ?', [staff_number]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Staff number already exists.' });
        }

        if (email) {
            const [existingEmail] = await db.query('SELECT * FROM staff WHERE email = ?', [email]);
            if (existingEmail.length > 0) {
                return res.status(400).json({ message: 'Email already in use.' });
            }
        }

        await db.query(
            `INSERT INTO staff 
             (org_id, department_id, section_id, role_id, staff_number,
              full_name, email, gender, date_joined, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [org_id, department_id, section_id || null, role_id,
            staff_number, full_name, email || null, gender, date_joined]
        );

        res.status(201).json({ message: 'Staff member added. Click Send Email to send login credentials.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const updateStaff = async (req, res) => {
    const org_id = req.user.org_id;
    const department_id = req.user.department_id;
    const { staff_id } = req.params;
    const { staff_number, full_name, email, gender, role_id, section_id, date_joined } = req.body;

    if (email && !isValidEmail(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    try {
        await db.query(
            `UPDATE staff
             SET staff_number = ?, full_name = ?, email = ?,
                 gender = ?, role_id = ?, section_id = ?, date_joined = ?
             WHERE id = ? AND org_id = ? AND department_id = ?`,
            [staff_number, full_name, email || null, gender, role_id,
            section_id || null, date_joined, staff_id, org_id, department_id]
        );
        res.status(200).json({ message: 'Staff updated successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const deactivateStaff = async (req, res) => {
    const org_id = req.user.org_id;
    const department_id = req.user.department_id;
    const { staff_id } = req.params;
    try {
        await db.query(
            `UPDATE staff SET status = 'inactive'
             WHERE id = ? AND org_id = ? AND department_id = ?`,
            [staff_id, org_id, department_id]
        );
        res.status(200).json({ message: 'Staff deactivated successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const deleteStaff = async (req, res) => {
    const org_id = req.user.org_id;
    const department_id = req.user.department_id;
    const { staff_id } = req.params;
    try {
        const [staff] = await db.query(
            'SELECT * FROM staff WHERE id = ? AND org_id = ? AND department_id = ?',
            [staff_id, org_id, department_id]
        );
        if (staff.length === 0) return res.status(404).json({ message: 'Staff not found.' });
        if (staff[0].status !== 'inactive') {
            return res.status(400).json({ message: 'Deactivate the staff member before deleting.' });
        }
        await db.query('DELETE FROM staff WHERE id = ?', [staff_id]);
        res.status(200).json({ message: 'Staff deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const sendStaffEmail = async (req, res) => {
    const org_id = req.user.org_id;
    const department_id = req.user.department_id;
    const { staff_id } = req.params;
    try {
        const [staffData] = await db.query(
            `SELECT s.*, d.name AS dept_name, sec.name AS section_name, o.name AS org_name
             FROM staff s
             JOIN departments d ON s.department_id = d.id
             LEFT JOIN sections sec ON s.section_id = sec.id
             JOIN organizations o ON s.org_id = o.id
             WHERE s.id = ? AND s.org_id = ? AND s.department_id = ?`,
            [staff_id, org_id, department_id]
        );

        if (staffData.length === 0) return res.status(404).json({ message: 'Staff not found.' });

        const staff = staffData[0];

        if (!staff.email) {
            return res.status(400).json({ message: 'Staff has no email address. Update their details first.' });
        }

        let username = generateUsername(staff.full_name);
        const [existingUsername] = await db.query(
            'SELECT * FROM staff WHERE username = ? AND id != ?', [username, staff_id]
        );
        if (existingUsername.length > 0) {
            username = `${username}${Math.floor(Math.random() * 100)}`;
        }

        const plainPassword = generatePassword(username);
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(plainPassword, salt);

        await db.query(
            `UPDATE staff SET username = ?, password_hash = ?, status = 'pending' WHERE id = ?`,
            [username, password_hash, staff_id]
        );

        // Create leave balances if they dont exist yet
        const currentYear = new Date().getFullYear();
        const [entitlements] = await db.query(
            'SELECT * FROM leave_entitlements WHERE org_id = ? AND role_id = ?',
            [org_id, staff.role_id]
        );

        for (const entitlement of entitlements) {
            const [existingBalance] = await db.query(
                `SELECT * FROM leave_balances 
                 WHERE staff_id = ? AND leave_type_id = ? AND year = ?`,
                [staff_id, entitlement.leave_type_id, currentYear]
            );
            if (existingBalance.length === 0) {
                await db.query(
                    `INSERT INTO leave_balances 
                     (org_id, staff_id, leave_type_id, year, total_days, used_days, remaining_days)
                     VALUES (?, ?, ?, ?, ?, 0, ?)`,
                    [org_id, staff_id, entitlement.leave_type_id, currentYear,
                    entitlement.max_days_per_year, entitlement.max_days_per_year]
                );
            }
        }

        await sendStaffCredentials(
            staff.email, staff.full_name, staff.org_name,
            staff.dept_name, staff.section_name, username, plainPassword
        );

        res.status(200).json({ message: 'Login credentials sent successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const getLeaveApplications = async (req, res) => {
    const org_id = req.user.org_id;
    const department_id = req.user.department_id;
    try {
        const [applications] = await db.query(
            `SELECT la.id, la.start_date, la.end_date, la.total_working_days,
                    la.reason, la.status, la.admin_comment,
                    s.full_name AS staff_name, s.staff_number,
                    sec.name AS section_name,
                    lt.name AS leave_type,
                    acting.full_name AS acting_staff_name,
                    CASE WHEN ls.id IS NOT NULL THEN 1 ELSE 0 END AS is_switch
             FROM leave_applications la
             JOIN staff s ON la.staff_id = s.id
             LEFT JOIN sections sec ON s.section_id = sec.id
             JOIN leave_types lt ON la.leave_type_id = lt.id
             LEFT JOIN staff acting ON la.acting_staff_id = acting.id
             LEFT JOIN leave_switches ls ON la.id = ls.new_application_id
             WHERE la.org_id = ? AND s.department_id = ?
             ORDER BY la.id DESC`,
            [org_id, department_id]
        );
        res.status(200).json({ applications });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const reviewApplication = async (req, res) => {
    const org_id = req.user.org_id;
    const department_id = req.user.department_id;
    const { application_id } = req.params;
    const { status, admin_comment } = req.body;
    const admin_id = req.user.id;

    if (!['approved', 'denied'].includes(status)) {
        return res.status(400).json({ message: 'Status must be approved or denied.' });
    }

    try {
        const [application] = await db.query(
            `SELECT la.* FROM leave_applications la
             JOIN staff s ON la.staff_id = s.id
             WHERE la.id = ? AND la.org_id = ? AND s.department_id = ?`,
            [application_id, org_id, department_id]
        );

        if (application.length === 0) return res.status(404).json({ message: 'Application not found.' });
        if (application[0].status !== 'pending') {
            return res.status(400).json({ message: 'Application has already been reviewed.' });
        }

        const [isSwitch] = await db.query(
            'SELECT * FROM leave_switches WHERE new_application_id = ?', [application_id]
        );
        if (isSwitch.length > 0) {
            return res.status(400).json({
                message: 'This is a switch application. Please review it from the Leave Switches tab.'
            });
        }

        await db.query(
            `UPDATE leave_applications
             SET status = ?, admin_comment = ?, reviewed_at = NOW(), reviewed_by = ?
             WHERE id = ?`,
            [status, admin_comment, admin_id, application_id]
        );

        if (status === 'approved') {
            const app = application[0];
            const currentYear = new Date().getFullYear();

            await db.query(
                `UPDATE leave_balances
                 SET used_days = used_days + ?,
                     remaining_days = remaining_days - ?
                 WHERE staff_id = ? AND leave_type_id = ? AND year = ?`,
                [app.total_working_days, app.total_working_days,
                app.staff_id, app.leave_type_id, currentYear]
            );

            if (app.acting_staff_id) {
                const { sendActingStaffNotification } = require('../services/emailService');
                const [actingStaff] = await db.query('SELECT * FROM staff WHERE id = ?', [app.acting_staff_id]);
                const [absentStaff] = await db.query('SELECT * FROM staff WHERE id = ?', [app.staff_id]);
                if (actingStaff.length > 0 && actingStaff[0].email) {
                    await sendActingStaffNotification(
                        actingStaff[0].email, actingStaff[0].full_name,
                        absentStaff[0].full_name, app.start_date, app.end_date
                    );
                }
            }
        }

        res.status(200).json({ message: `Application ${status} successfully.` });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const getStaffOnLeave = async (req, res) => {
    const org_id = req.user.org_id;
    const department_id = req.user.department_id;
    try {
        const [onLeave] = await db.query(
            `SELECT s.full_name, s.staff_number,
                    sec.name AS section_name,
                    lt.name AS leave_type,
                    la.start_date, la.end_date, la.total_working_days,
                    acting.full_name AS acting_staff_name
             FROM leave_applications la
             JOIN staff s ON la.staff_id = s.id
             LEFT JOIN sections sec ON s.section_id = sec.id
             JOIN leave_types lt ON la.leave_type_id = lt.id
             LEFT JOIN staff acting ON la.acting_staff_id = acting.id
             WHERE la.org_id = ? AND s.department_id = ?
             AND la.status = 'approved'
             AND la.start_date <= CURDATE()
             AND la.end_date >= CURDATE()
             ORDER BY sec.name, la.start_date`,
            [org_id, department_id]
        );
        res.status(200).json({ staff_on_leave: onLeave });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const getLeaveSwitches = async (req, res) => {
    const org_id = req.user.org_id;
    const department_id = req.user.department_id;
    try {
        const [switches] = await db.query(
            `SELECT ls.id, ls.switch_date, ls.status, ls.reason,
                    s.full_name AS staff_name, s.staff_number,
                    sec.name AS section_name,
                    lt1.name AS original_leave_type,
                    lt2.name AS new_leave_type,
                    la1.start_date AS original_start_date,
                    la1.end_date AS original_end_date,
                    la2.start_date AS new_start_date,
                    la2.end_date AS new_end_date,
                    ls.original_application_id,
                    ls.new_application_id
             FROM leave_switches ls
             JOIN leave_applications la1 ON ls.original_application_id = la1.id
             JOIN leave_applications la2 ON ls.new_application_id = la2.id
             JOIN leave_types lt1 ON la1.leave_type_id = lt1.id
             JOIN leave_types lt2 ON la2.leave_type_id = lt2.id
             JOIN staff s ON la1.staff_id = s.id
             LEFT JOIN sections sec ON s.section_id = sec.id
             WHERE ls.org_id = ? AND s.department_id = ?
             ORDER BY ls.requested_at DESC`,
            [org_id, department_id]
        );
        res.status(200).json({ switches });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

const reviewLeaveSwitch = async (req, res) => {
    const org_id = req.user.org_id;
    const department_id = req.user.department_id;
    const { switch_id } = req.params;
    const { status, admin_comment } = req.body;
    const admin_id = req.user.id;

    if (!['approved', 'denied'].includes(status)) {
        return res.status(400).json({ message: 'Status must be approved or denied.' });
    }

    try {
        const [switchRequest] = await db.query(
            `SELECT ls.* FROM leave_switches ls
             JOIN leave_applications la ON ls.original_application_id = la.id
             JOIN staff s ON la.staff_id = s.id
             WHERE ls.id = ? AND ls.org_id = ? AND s.department_id = ?`,
            [switch_id, org_id, department_id]
        );

        if (switchRequest.length === 0) return res.status(404).json({ message: 'Switch request not found.' });
        if (switchRequest[0].status !== 'pending') {
            return res.status(400).json({ message: 'Switch request already reviewed.' });
        }

        const sw = switchRequest[0];

        await db.query(
            `UPDATE leave_switches
             SET status = ?, admin_comment = ?, reviewed_at = NOW(), reviewed_by = ?
             WHERE id = ?`,
            [status, admin_comment, admin_id, switch_id]
        );

        if (status === 'approved') {
            const currentYear = new Date().getFullYear();

            const [originalApp] = await db.query(
                'SELECT * FROM leave_applications WHERE id = ?', [sw.original_application_id]
            );
            const [newApp] = await db.query(
                'SELECT * FROM leave_applications WHERE id = ?', [sw.new_application_id]
            );

            const original = originalApp[0];
            const newApplication = newApp[0];

            // Get staff details for working days calculation
            const [staffData] = await db.query(
                'SELECT section_id, department_id, org_id FROM staff WHERE id = ?',
                [original.staff_id]
            );

            const staff_section_id = staffData[0].section_id;
            const staff_dept_id = staffData[0].department_id;
            const staff_org_id = staffData[0].org_id;

            // sw.switch_date = last day of original leave
            // Calculate days actually used in original leave
            // from start_date to switch_date (inclusive)
            let daysActuallyUsed;
            try {
                if (staff_section_id) {
                    daysActuallyUsed = await calculateWorkingDays(
                        original.start_date, sw.switch_date, staff_section_id
                    );
                } else {
                    daysActuallyUsed = await calculateWorkingDaysForDept(
                        original.start_date, sw.switch_date, staff_dept_id, staff_org_id
                    );
                }
            } catch (err) {
                daysActuallyUsed = parseFloat(original.total_working_days);
            }

            // Days to return to original leave type balance
            const daysToReturn = parseFloat(original.total_working_days) - daysActuallyUsed;

            // Shorten original leave to end on switch_date
            await db.query(
                `UPDATE leave_applications 
                 SET end_date = ?, total_working_days = ?
                 WHERE id = ?`,
                [sw.switch_date, daysActuallyUsed, sw.original_application_id]
            );

            // Approve new leave application
            await db.query(
                `UPDATE leave_applications 
                 SET status = 'approved', reviewed_by = ?, reviewed_at = NOW()
                 WHERE id = ?`,
                [admin_id, sw.new_application_id]
            );

            // Return unused days to original leave balance
            if (daysToReturn > 0) {
                await db.query(
                    `UPDATE leave_balances
                     SET used_days = used_days - ?,
                         remaining_days = remaining_days + ?
                     WHERE staff_id = ? AND leave_type_id = ? AND year = ?`,
                    [daysToReturn, daysToReturn,
                    original.staff_id, original.leave_type_id, currentYear]
                );
            }

            // Deduct days from new leave type balance
            await db.query(
                `UPDATE leave_balances
                 SET used_days = used_days + ?,
                     remaining_days = remaining_days - ?
                 WHERE staff_id = ? AND leave_type_id = ? AND year = ?`,
                [newApplication.total_working_days, newApplication.total_working_days,
                newApplication.staff_id, newApplication.leave_type_id, currentYear]
            );
        }

        if (status === 'denied') {
            await db.query(
                'DELETE FROM leave_applications WHERE id = ?', [sw.new_application_id]
            );
        }

        res.status(200).json({ message: `Leave switch ${status} successfully.` });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

module.exports = {
    getDeptAdminProfile,
    getDeptRoles,
    getDeptSections,
    getDeptStaff,
    createStaff,
    updateStaff,
    deactivateStaff,
    deleteStaff,
    sendStaffEmail,
    getLeaveApplications,
    reviewApplication,
    getStaffOnLeave,
    getLeaveSwitches,
    reviewLeaveSwitch
};