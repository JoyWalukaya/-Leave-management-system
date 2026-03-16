const db = require('../config/db');

// CALCULATE WORKING DAYS
const calculateWorkingDays = async (start_date, end_date, section_id) => {
    const [schedule] = await db.query(
        'SELECT * FROM work_days WHERE section_id = ?',
        [section_id]
    );

    if (schedule.length === 0) {
        throw new Error('No work schedule found for this section.');
    }

    const workDay = schedule[0];

    const dayMap = {
        0: workDay.sunday,
        1: workDay.monday,
        2: workDay.tuesday,
        3: workDay.wednesday,
        4: workDay.thursday,
        5: workDay.friday,
        6: workDay.saturday
    };

    const [holidays] = await db.query(
        `SELECT ph.holiday_date 
         FROM public_holidays ph
         JOIN companies c ON ph.company_id = c.id
         JOIN departments d ON d.company_id = c.id
         JOIN sections s ON s.department_id = d.id
         WHERE s.id = ?`,
        [section_id]
    );

    const observedHolidays = holidays.map(h => {
        const date = new Date(h.holiday_date);
        const day = date.getDay();
        if (day === 6) date.setDate(date.getDate() + 2);
        if (day === 0) date.setDate(date.getDate() + 1);
        return date.toISOString().split('T')[0];
    });

    let totalDays = 0;
    const current = new Date(start_date);
    const end = new Date(end_date);

    while (current <= end) {
        const dayOfWeek = current.getDay();
        const dateStr = current.toISOString().split('T')[0];
        const dayValue = dayMap[dayOfWeek];
        const isHoliday = observedHolidays.includes(dateStr);

        if (dayValue > 0 && !isHoliday) {
            totalDays += parseFloat(dayValue);
        }

        current.setDate(current.getDate() + 1);
    }

    return totalDays;
};

// GET MY PROFILE
const getMyProfile = async (req, res) => {
    const staff_id = req.user.id;

    try {
        const [staff] = await db.query(
            `SELECT s.id, s.staff_number, s.full_name, s.email, s.gender,
                    s.date_joined, s.status,
                    sec.name AS section_name,
                    d.name AS department_name,
                    r.name AS role_name
             FROM staff s
             JOIN sections sec ON s.section_id = sec.id
             JOIN departments d ON sec.department_id = d.id
             JOIN roles r ON s.role_id = r.id
             WHERE s.id = ?`,
            [staff_id]
        );

        if (staff.length === 0) {
            return res.status(404).json({ message: 'Staff not found.' });
        }

        res.status(200).json({ profile: staff[0] });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// GET MY LEAVE BALANCES
const getMyLeaveBalances = async (req, res) => {
    const staff_id = req.user.id;
    const currentYear = new Date().getFullYear();

    try {
        const [balances] = await db.query(
            `SELECT lb.id, lb.total_days, lb.used_days, lb.remaining_days,
                    lt.name AS leave_type, lt.gender_restriction
             FROM leave_balances lb
             JOIN leave_types lt ON lb.leave_type_id = lt.id
             WHERE lb.staff_id = ? AND lb.year = ?`,
            [staff_id, currentYear]
        );

        res.status(200).json({ balances });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// GET AVAILABLE LEAVE TYPES
const getAvailableLeaveTypes = async (req, res) => {
    const staff_id = req.user.id;

    try {
        const [staff] = await db.query(
            'SELECT gender FROM staff WHERE id = ?',
            [staff_id]
        );

        const gender = staff[0].gender;

        const [leaveTypes] = await db.query(
            `SELECT * FROM leave_types 
             WHERE (gender_restriction = ? OR gender_restriction = 'any')
             AND is_active = TRUE`,
            [gender]
        );

        res.status(200).json({ leave_types: leaveTypes });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// APPLY FOR LEAVE
const applyForLeave = async (req, res) => {
    const staff_id = req.user.id;
    const section_id = req.user.section_id;
    const role_id = req.user.role_id;
    const { leave_type_id, start_date, end_date, reason } = req.body;
    const currentYear = new Date().getFullYear();

    try {
        // Check for overlapping approved leaves
        const [overlapping] = await db.query(
            `SELECT * FROM leave_applications
             WHERE staff_id = ?
             AND status = 'approved'
             AND start_date <= ? AND end_date >= ?`,
            [staff_id, end_date, start_date]
        );

        if (overlapping.length > 0) {
            return res.status(400).json({
                message: 'You already have an approved leave that overlaps with these dates. Please use Leave Switch instead.'
            });
        }

        // Check for overlapping pending leaves
        const [pendingOverlap] = await db.query(
            `SELECT * FROM leave_applications
             WHERE staff_id = ?
             AND status = 'pending'
             AND start_date <= ? AND end_date >= ?`,
            [staff_id, end_date, start_date]
        );

        if (pendingOverlap.length > 0) {
            return res.status(400).json({
                message: 'You already have a pending leave application that overlaps with these dates.'
            });
        }

        // Check leave balance
        const [balance] = await db.query(
            `SELECT * FROM leave_balances 
             WHERE staff_id = ? AND leave_type_id = ? AND year = ?`,
            [staff_id, leave_type_id, currentYear]
        );

        if (balance.length === 0 || balance[0].remaining_days <= 0) {
            return res.status(400).json({ message: 'No remaining leave days for this leave type.' });
        }

        // Check min days before reapply
        const [lastApplication] = await db.query(
            `SELECT * FROM leave_applications
             WHERE staff_id = ? AND leave_type_id = ? AND status = 'approved'
             ORDER BY end_date DESC LIMIT 1`,
            [staff_id, leave_type_id]
        );

        if (lastApplication.length > 0) {
            const [entitlement] = await db.query(
                'SELECT * FROM leave_entitlements WHERE leave_type_id = ? AND role_id = ?',
                [leave_type_id, role_id]
            );

            const minDays = entitlement[0].min_days_before_reapply;
            if (minDays > 0) {
                const lastEndDate = new Date(lastApplication[0].end_date);
                const today = new Date();
                const daysSince = Math.floor((today - lastEndDate) / (1000 * 60 * 60 * 24));

                if (daysSince < minDays) {
                    const daysLeft = minDays - daysSince;
                    return res.status(400).json({
                        message: `You must wait ${daysLeft} more days before reapplying for this leave type.`
                    });
                }
            }
        }

        // Check max concurrent staff on leave
        const [entitlement] = await db.query(
            'SELECT * FROM leave_entitlements WHERE leave_type_id = ? AND role_id = ?',
            [leave_type_id, role_id]
        );

        const maxConcurrent = entitlement[0].max_concurrent_staff;

        const [currentOnLeave] = await db.query(
            `SELECT COUNT(*) as count FROM leave_applications la
             JOIN staff s ON la.staff_id = s.id
             WHERE s.section_id = ? AND la.leave_type_id = ?
             AND la.status = 'approved'
             AND la.start_date <= CURDATE()
             AND la.end_date >= CURDATE()`,
            [section_id, leave_type_id]
        );

        if (currentOnLeave[0].count >= maxConcurrent) {
            const [earliest] = await db.query(
                `SELECT MIN(end_date) as earliest_date FROM leave_applications la
                 JOIN staff s ON la.staff_id = s.id
                 WHERE s.section_id = ? AND la.leave_type_id = ?
                 AND la.status = 'approved'
                 AND la.end_date >= CURDATE()`,
                [section_id, leave_type_id]
            );

            return res.status(400).json({
                message: `Maximum staff on leave reached. Earliest you can apply is ${earliest[0].earliest_date}.`
            });
        }

        // Calculate working days
        const totalWorkingDays = await calculateWorkingDays(start_date, end_date, section_id);

        if (totalWorkingDays <= 0) {
            return res.status(400).json({ message: 'No working days in selected date range.' });
        }

        if (totalWorkingDays > balance[0].remaining_days) {
            return res.status(400).json({
                message: `You only have ${balance[0].remaining_days} days remaining but requested ${totalWorkingDays} days.`
            });
        }

        await db.query(
            `INSERT INTO leave_applications 
             (staff_id, leave_type_id, start_date, end_date, total_working_days, reason)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [staff_id, leave_type_id, start_date, end_date, totalWorkingDays, reason]
        );

        res.status(201).json({
            message: 'Leave application submitted successfully. Waiting for admin approval.',
            total_working_days: totalWorkingDays
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// GET MY APPLICATIONS
const getMyApplications = async (req, res) => {
    const staff_id = req.user.id;

    try {
        const [applications] = await db.query(
            `SELECT la.id, la.start_date, la.end_date, la.total_working_days,
                    la.status, la.reason, la.admin_comment, la.applied_at,
                    lt.name AS leave_type
             FROM leave_applications la
             JOIN leave_types lt ON la.leave_type_id = lt.id
             WHERE la.staff_id = ?
             ORDER BY la.applied_at DESC`,
            [staff_id]
        );

        res.status(200).json({ applications });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// CANCEL APPLICATION
const cancelApplication = async (req, res) => {
    const staff_id = req.user.id;
    const { application_id } = req.params;

    try {
        const [application] = await db.query(
            'SELECT * FROM leave_applications WHERE id = ? AND staff_id = ?',
            [application_id, staff_id]
        );

        if (application.length === 0) {
            return res.status(404).json({ message: 'Application not found.' });
        }

        if (application[0].status !== 'pending') {
            return res.status(400).json({ message: 'Only pending applications can be cancelled.' });
        }

        await db.query(
            'UPDATE leave_applications SET status = ? WHERE id = ?',
            ['cancelled', application_id]
        );

        res.status(200).json({ message: 'Application cancelled successfully.' });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// REQUEST LEAVE SWITCH
const requestLeaveSwitch = async (req, res) => {
    const staff_id = req.user.id;
    const { original_application_id, new_leave_type_id, switch_date, new_end_date, reason } = req.body;

    try {
        // Verify original application belongs to staff and is approved
        const [original] = await db.query(
            `SELECT * FROM leave_applications 
             WHERE id = ? AND staff_id = ? AND status = 'approved'`,
            [original_application_id, staff_id]
        );

        if (original.length === 0) {
            return res.status(404).json({ message: 'Approved application not found.' });
        }

        const orig = original[0];

        // Validate switch date is between start and end date
        if (switch_date < orig.start_date || switch_date > orig.end_date) {
            return res.status(400).json({
                message: `Switch date must be between ${orig.start_date} and ${orig.end_date}.`
            });
        }

        // Validate new end date is on or after switch date
        if (new_end_date < switch_date) {
            return res.status(400).json({
                message: 'New end date cannot be before switch date.'
            });
        }

        // Block if a pending switch already exists for this application
        const [existingSwitch] = await db.query(
            `SELECT * FROM leave_switches 
             WHERE original_application_id = ? AND status = 'pending'`,
            [original_application_id]
        );

        if (existingSwitch.length > 0) {
            return res.status(400).json({
                message: 'A pending switch request already exists for this application. Wait for admin to review it first.'
            });
        }

        // Calculate working days for new leave (switch_date to new_end_date)
        const newWorkingDays = await calculateWorkingDays(
            switch_date,
            new_end_date,
            req.user.section_id
        );

        if (newWorkingDays <= 0) {
            return res.status(400).json({ message: 'No working days in selected date range.' });
        }

        // Check new leave type balance
        const currentYear = new Date().getFullYear();
        const [balance] = await db.query(
            `SELECT * FROM leave_balances 
             WHERE staff_id = ? AND leave_type_id = ? AND year = ?`,
            [staff_id, new_leave_type_id, currentYear]
        );

        if (balance.length === 0 || balance[0].remaining_days < newWorkingDays) {
            const remaining = balance.length > 0 ? balance[0].remaining_days : 0;
            return res.status(400).json({
                message: `Not enough leave days. You need ${newWorkingDays} days but only have ${remaining} remaining for this leave type.`
            });
        }

        // Old leave ends the day BEFORE switch date
        const oldLeaveEndObj = new Date(switch_date);
        oldLeaveEndObj.setDate(oldLeaveEndObj.getDate() - 1);
        const oldLeaveNewEndDate = oldLeaveEndObj.toISOString().split('T')[0];

        // Create new pending application — starts on switch_date
        const [newApp] = await db.query(
            `INSERT INTO leave_applications 
             (staff_id, leave_type_id, start_date, end_date, total_working_days, reason, status)
             VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [staff_id, new_leave_type_id, switch_date, new_end_date, newWorkingDays, reason]
        );

        // Store oldLeaveNewEndDate in switch_date column
        // so admin knows where to shorten original leave to
        await db.query(
            `INSERT INTO leave_switches 
             (original_application_id, new_application_id, switch_date, reason)
             VALUES (?, ?, ?, ?)`,
            [original_application_id, newApp.insertId, oldLeaveNewEndDate, reason]
        );

        res.status(201).json({
            message: 'Leave switch request submitted. Waiting for admin approval.',
            new_working_days: newWorkingDays
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

module.exports = {
    calculateWorkingDays,
    getMyProfile,
    getMyLeaveBalances,
    getAvailableLeaveTypes,
    applyForLeave,
    getMyApplications,
    cancelApplication,
    requestLeaveSwitch
};