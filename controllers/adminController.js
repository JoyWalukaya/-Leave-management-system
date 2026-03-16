const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { calculateWorkingDays } = require('./staffController');

// ADD STAFF NUMBER TO REGISTRY
const addStaffToRegistry = async (req, res) => {
    const { staff_number, section_id, role_id } = req.body;
    const admin_department_id = req.user.department_id;

    try {
        const [section] = await db.query(
            'SELECT * FROM sections WHERE id = ? AND department_id = ?',
            [section_id, admin_department_id]
        );

        if (section.length === 0) {
            return res.status(403).json({ message: 'Section does not belong to your department.' });
        }

        const [existing] = await db.query(
            'SELECT * FROM staff_registry WHERE staff_number = ?',
            [staff_number]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Staff number already exists in registry.' });
        }

        await db.query(
            'INSERT INTO staff_registry (staff_number, section_id, role_id) VALUES (?, ?, ?)',
            [staff_number, section_id, role_id]
        );

        res.status(201).json({ message: 'Staff number added to registry successfully.' });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// GET PENDING STAFF ACCOUNTS
const getPendingStaff = async (req, res) => {
    const admin_department_id = req.user.department_id;

    try {
        const [pendingStaff] = await db.query(
            `SELECT s.id, s.staff_number, s.full_name, s.email, s.gender,
                    s.date_joined, sec.name AS section_name, r.name AS role_name
             FROM staff s
             JOIN sections sec ON s.section_id = sec.id
             JOIN roles r ON s.role_id = r.id
             WHERE sec.department_id = ? AND s.status = 'pending'`,
            [admin_department_id]
        );

        res.status(200).json({ pending_staff: pendingStaff });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// ACTIVATE STAFF ACCOUNT
const activateStaff = async (req, res) => {
    const { staff_id } = req.params;
    const admin_department_id = req.user.department_id;

    try {
        const [staff] = await db.query(
            `SELECT s.* FROM staff s
             JOIN sections sec ON s.section_id = sec.id
             WHERE s.id = ? AND sec.department_id = ?`,
            [staff_id, admin_department_id]
        );

        if (staff.length === 0) {
            return res.status(404).json({ message: 'Staff not found in your department.' });
        }

        if (staff[0].status === 'active') {
            return res.status(400).json({ message: 'Staff account is already active.' });
        }

        await db.query(
            'UPDATE staff SET status = ? WHERE id = ?',
            ['active', staff_id]
        );

        const currentYear = new Date().getFullYear();
        const role_id = staff[0].role_id;

        const [entitlements] = await db.query(
            'SELECT * FROM leave_entitlements WHERE role_id = ?',
            [role_id]
        );

        for (const entitlement of entitlements) {
            await db.query(
                `INSERT INTO leave_balances 
                (staff_id, leave_type_id, year, total_days, used_days, remaining_days)
                VALUES (?, ?, ?, ?, 0, ?)`,
                [staff_id, entitlement.leave_type_id, currentYear,
                entitlement.max_days_per_year, entitlement.max_days_per_year]
            );
        }

        res.status(200).json({ message: 'Staff account activated successfully.' });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// GET LEAVE APPLICATIONS
const getLeaveApplications = async (req, res) => {
    const admin_department_id = req.user.department_id;

    try {
        const [applications] = await db.query(
            `SELECT la.id, la.start_date, la.end_date, la.total_working_days,
                    la.reason, la.status, la.admin_comment,
                    s.full_name AS staff_name, s.staff_number,
                    sec.name AS section_name,
                    lt.name AS leave_type,
                    CASE WHEN ls.id IS NOT NULL THEN 1 ELSE 0 END AS is_switch
             FROM leave_applications la
             JOIN staff s ON la.staff_id = s.id
             JOIN sections sec ON s.section_id = sec.id
             JOIN leave_types lt ON la.leave_type_id = lt.id
             LEFT JOIN leave_switches ls ON la.id = ls.new_application_id
             WHERE sec.department_id = ?
             ORDER BY la.id DESC`,
            [admin_department_id]
        );

        res.status(200).json({ applications });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};


// APPROVE OR DENY APPLICATION
const reviewApplication = async (req, res) => {
    const { application_id } = req.params;
    const { status, admin_comment } = req.body;
    const admin_id = req.user.id;
    const admin_department_id = req.user.department_id;

    if (!['approved', 'denied'].includes(status)) {
        return res.status(400).json({ message: 'Status must be approved or denied.' });
    }

    try {
        const [application] = await db.query(
            `SELECT la.* FROM leave_applications la
             JOIN staff s ON la.staff_id = s.id
             JOIN sections sec ON s.section_id = sec.id
             WHERE la.id = ? AND sec.department_id = ?`,
            [application_id, admin_department_id]
        );

        if (application.length === 0) {
            return res.status(404).json({ message: 'Application not found in your department.' });
        }

        if (application[0].status !== 'pending') {
            return res.status(400).json({ message: 'Application has already been reviewed.' });
        }

        // Block approving switch applications from here
        const [isSwitch] = await db.query(
            'SELECT * FROM leave_switches WHERE new_application_id = ?',
            [application_id]
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
        }

        res.status(200).json({ message: `Application ${status} successfully.` });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// GET WHO IS ON LEAVE PER SECTION
const getStaffOnLeave = async (req, res) => {
    const admin_department_id = req.user.department_id;

    try {
        const [onLeave] = await db.query(
            `SELECT s.full_name, s.staff_number,
                    sec.name AS section_name,
                    lt.name AS leave_type,
                    la.start_date, la.end_date, la.total_working_days
             FROM leave_applications la
             JOIN staff s ON la.staff_id = s.id
             JOIN sections sec ON s.section_id = sec.id
             JOIN leave_types lt ON la.leave_type_id = lt.id
             WHERE sec.department_id = ?
             AND la.status = 'approved'
             AND la.start_date <= CURDATE()
             AND la.end_date >= CURDATE()
             ORDER BY sec.name, la.start_date`,
            [admin_department_id]
        );

        res.status(200).json({ staff_on_leave: onLeave });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// GET SECTIONS FOR ADMIN'S DEPARTMENT
const getSections = async (req, res) => {
    const admin_department_id = req.user.department_id;

    try {
        const [sections] = await db.query(
            'SELECT * FROM sections WHERE department_id = ?',
            [admin_department_id]
        );

        res.status(200).json({ sections });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// GET ALL ROLES
const getRoles = async (req, res) => {
    try {
        const [roles] = await db.query('SELECT * FROM roles');
        res.status(200).json({ roles });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// GET STAFF REGISTRY WITH STATUS
const getStaffRegistry = async (req, res) => {
    const admin_department_id = req.user.department_id;

    try {
        const [registry] = await db.query(
            `SELECT 
                sr.staff_number,
                sec.name AS section_name,
                r.name AS role_name,
                sr.is_registered,
                s.full_name,
                s.email,
                s.gender,
                s.date_joined,
                s.status AS account_status
             FROM staff_registry sr
             JOIN sections sec ON sr.section_id = sec.id
             JOIN roles r ON sr.role_id = r.id
             LEFT JOIN staff s ON sr.staff_number = s.staff_number
             WHERE sec.department_id = ?
             ORDER BY sec.name, sr.staff_number`,
            [admin_department_id]
        );

        res.status(200).json({ registry });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// GET LEAVE SWITCH REQUESTS
const getLeaveSwitchRequests = async (req, res) => {
    const admin_department_id = req.user.department_id;

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
             JOIN sections sec ON s.section_id = sec.id
             WHERE sec.department_id = ?
             ORDER BY ls.requested_at DESC`,
            [admin_department_id]
        );

        res.status(200).json({ switches });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// REVIEW LEAVE SWITCH REQUEST
const reviewLeaveSwitch = async (req, res) => {
    const { switch_id } = req.params;
    const { status, admin_comment } = req.body;
    const admin_id = req.user.id;
    const admin_department_id = req.user.department_id;

    if (!['approved', 'denied'].includes(status)) {
        return res.status(400).json({ message: 'Status must be approved or denied.' });
    }

    try {
        const [switchRequest] = await db.query(
            `SELECT ls.* FROM leave_switches ls
             JOIN leave_applications la ON ls.original_application_id = la.id
             JOIN staff s ON la.staff_id = s.id
             JOIN sections sec ON s.section_id = sec.id
             WHERE ls.id = ? AND sec.department_id = ?`,
            [switch_id, admin_department_id]
        );

        if (switchRequest.length === 0) {
            return res.status(404).json({ message: 'Switch request not found.' });
        }

        if (switchRequest[0].status !== 'pending') {
            return res.status(400).json({ message: 'Switch request already reviewed.' });
        }

        const sw = switchRequest[0];

        // Update switch request status
        await db.query(
            `UPDATE leave_switches 
             SET status = ?, admin_comment = ?, reviewed_at = NOW(), reviewed_by = ?
             WHERE id = ?`,
            [status, admin_comment, admin_id, switch_id]
        );

        if (status === 'approved') {
            const currentYear = new Date().getFullYear();

            const [originalApp] = await db.query(
                'SELECT * FROM leave_applications WHERE id = ?',
                [sw.original_application_id]
            );

            const [newApp] = await db.query(
                'SELECT * FROM leave_applications WHERE id = ?',
                [sw.new_application_id]
            );

            const original = originalApp[0];
            const newApplication = newApp[0];

            // Get staff section_id for working days calculation
            const [staffData] = await db.query(
                'SELECT section_id FROM staff WHERE id = ?',
                [original.staff_id]
            );
            const section_id = staffData[0].section_id;

            // Calculate actual days used in original leave
            // sw.switch_date = day before new leave starts = last day of original leave
            const daysActuallyUsed = await calculateWorkingDays(
                original.start_date,
                sw.switch_date,
                section_id
            );

            // Days to return = original total - days actually used
            const daysToReturn = parseFloat(original.total_working_days) - daysActuallyUsed;

            // Update original leave end date and total working days
            await db.query(
                `UPDATE leave_applications 
                 SET end_date = ?, total_working_days = ?
                 WHERE id = ?`,
                [sw.switch_date, daysActuallyUsed, sw.original_application_id]
            );

            // Approve the new leave application
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

            // Deduct days for new leave type
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
            // Delete the pending new application
            await db.query(
                'DELETE FROM leave_applications WHERE id = ?',
                [sw.new_application_id]
            );
        }

        res.status(200).json({ message: `Leave switch ${status} successfully.` });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

module.exports = {
    addStaffToRegistry,
    getPendingStaff,
    activateStaff,
    getLeaveApplications,
    reviewApplication,
    getStaffOnLeave,
    getSections,
    getRoles,
    getStaffRegistry,
    getLeaveSwitchRequests,
    reviewLeaveSwitch
};