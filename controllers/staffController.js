const db = require('../config/db');

// Calculate working days between two dates
// Takes into account the section's work schedule
// and public holidays for the organization
const calculateWorkingDays = async (start_date, end_date, section_id) => {
    // Get work schedule — first check section level
    // if not found check department level
    let [schedule] = await db.query(
        'SELECT * FROM work_days WHERE section_id = ?',
        [section_id]
    );

    if (schedule.length === 0) {
        // No section schedule — get department schedule
        const [sectionData] = await db.query(
            'SELECT department_id, org_id FROM sections WHERE id = ?',
            [section_id]
        );

        if (sectionData.length > 0) {
            [schedule] = await db.query(
                'SELECT * FROM work_days WHERE department_id = ? AND section_id IS NULL',
                [sectionData[0].department_id]
            );
        }
    }

    if (schedule.length === 0) {
        throw new Error('No work schedule found for this section or department.');
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

    // Get org_id from section
    const [sectionInfo] = await db.query(
        'SELECT org_id FROM sections WHERE id = ?',
        [section_id]
    );

    const org_id = sectionInfo.length > 0 ? sectionInfo[0].org_id : null;

    // Get public holidays for this organization
    let holidays = [];
    if (org_id) {
        [holidays] = await db.query(
            'SELECT holiday_date FROM public_holidays WHERE org_id = ?',
            [org_id]
        );
    }

    // Get saturday rule from org settings
    let saturdayRule = workDay.saturday;
    if (org_id) {
        const [settings] = await db.query(
            'SELECT saturday_rule FROM org_settings WHERE org_id = ?',
            [org_id]
        );
        if (settings.length > 0) {
            saturdayRule = parseFloat(settings[0].saturday_rule);
        }
    }

    // Calculate observed holiday dates
    // Saturday holidays move to Monday
    // Sunday holidays move to Monday
    const observedHolidays = holidays.map(h => {
        const date = new Date(h.holiday_date);
        const day = date.getDay();
        if (day === 6) date.setDate(date.getDate() + 2);
        if (day === 0) date.setDate(date.getDate() + 1);
        return date.toISOString().split('T')[0];
    });

    // Count working days
    let totalDays = 0;
    const current = new Date(start_date);
    const end = new Date(end_date);

    while (current <= end) {
        const dayOfWeek = current.getDay();
        const dateStr = current.toISOString().split('T')[0];
        const isHoliday = observedHolidays.includes(dateStr);

        // Use saturday rule from org settings for saturdays
        let dayValue = dayMap[dayOfWeek];
        if (dayOfWeek === 6) {
            dayValue = saturdayRule;
        }

        if (dayValue > 0 && !isHoliday) {
            totalDays += parseFloat(dayValue);
        }

        current.setDate(current.getDate() + 1);
    }

    return totalDays;
};
const calculateWorkingDaysForDept = async (start_date, end_date, department_id, org_id) => {
    const [schedule] = await db.query(
        'SELECT * FROM work_days WHERE department_id = ? AND section_id IS NULL',
        [department_id]
    );

    if (schedule.length === 0) {
        throw new Error('No work schedule found for this department.');
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
        'SELECT holiday_date FROM public_holidays WHERE org_id = ?', [org_id]
    );

    const [settings] = await db.query(
        'SELECT saturday_rule FROM org_settings WHERE org_id = ?', [org_id]
    );

    const saturdayRule = settings.length > 0 ? parseFloat(settings[0].saturday_rule) : 0;

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
        const isHoliday = observedHolidays.includes(dateStr);
        let dayValue = dayMap[dayOfWeek];
        if (dayOfWeek === 6) dayValue = saturdayRule;
        if (dayValue > 0 && !isHoliday) {
            totalDays += parseFloat(dayValue);
        }
        current.setDate(current.getDate() + 1);
    }

    return totalDays;
};
// Get staff profile
const getMyProfile = async (req, res) => {
    const staff_id = req.user.id;

    try {
        const [staff] = await db.query(
            `SELECT s.id, s.staff_number, s.full_name, s.email, s.gender,
                    s.date_joined, s.status, s.username,
                    sec.name AS section_name,
                    d.name AS department_name,
                    r.name AS role_name,
                    o.name AS org_name
             FROM staff s
             JOIN departments d ON s.department_id = d.id
             LEFT JOIN sections sec ON s.section_id = sec.id
             JOIN roles r ON s.role_id = r.id
             JOIN organizations o ON s.org_id = o.id
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

// Get leave balances for current year
const getMyLeaveBalances = async (req, res) => {
    const staff_id = req.user.id;
    const currentYear = new Date().getFullYear();

    try {
        // Get staff gender first
        const [staffData] = await db.query(
            'SELECT gender FROM staff WHERE id = ?', [staff_id]
        );
        const gender = staffData[0].gender;

        const [balances] = await db.query(
            `SELECT lb.id, lb.total_days, lb.used_days, lb.remaining_days,
                    lt.name AS leave_type, lt.gender_restriction
             FROM leave_balances lb
             JOIN leave_types lt ON lb.leave_type_id = lt.id
             WHERE lb.staff_id = ? AND lb.year = ?
             AND (lt.gender_restriction = 'any' OR lt.gender_restriction = ?)
             AND lt.is_active = 1`,
            [staff_id, currentYear, gender]
        );

        res.status(200).json({ balances });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// Get leave types available for this staff member
// Filtered by gender restriction
const getAvailableLeaveTypes = async (req, res) => {
    const staff_id = req.user.id;
    const org_id = req.user.org_id;

    try {
        const [staff] = await db.query(
            'SELECT gender FROM staff WHERE id = ?',
            [staff_id]
        );

        const gender = staff[0].gender;

        const [leaveTypes] = await db.query(
            `SELECT * FROM leave_types 
             WHERE org_id = ?
             AND (gender_restriction = ? OR gender_restriction = 'any')
             AND is_active = 1`,
            [org_id, gender]
        );

        res.status(200).json({ leave_types: leaveTypes });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// Get all staff in same department for acting staff selection
const getDeptStaffForActing = async (req, res) => {
    const staff_id = req.user.id;
    const org_id = req.user.org_id;
    const department_id = req.user.department_id;

    try {
        const [staff] = await db.query(
            `SELECT id, full_name, staff_number
             FROM staff
             WHERE org_id = ? AND department_id = ?
             AND id != ? AND status = 'active'
             ORDER BY full_name`,
            [org_id, department_id, staff_id]
        );

        res.status(200).json({ staff });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// Apply for leave
const applyForLeave = async (req, res) => {
    const staff_id = req.user.id;
    const org_id = req.user.org_id;
    const section_id = req.user.section_id;
    const role_id = req.user.role_id;
    const { leave_type_id, start_date, end_date, reason, acting_staff_id } = req.body;
    const currentYear = new Date().getFullYear();

    try {
        // Check for overlapping approved leaves
        const [overlapping] = await db.query(
            `SELECT * FROM leave_applications
             WHERE staff_id = ? AND status = 'approved'
             AND start_date <= ? AND end_date >= ?`,
            [staff_id, end_date, start_date]
        );

        if (overlapping.length > 0) {
            return res.status(400).json({
                message: 'You already have an approved leave overlapping these dates. Use Leave Switch instead.'
            });
        }

        // Check for overlapping pending leaves
        const [pendingOverlap] = await db.query(
            `SELECT * FROM leave_applications
             WHERE staff_id = ? AND status = 'pending'
             AND start_date <= ? AND end_date >= ?`,
            [staff_id, end_date, start_date]
        );

        if (pendingOverlap.length > 0) {
            return res.status(400).json({
                message: 'You already have a pending leave overlapping these dates.'
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
                'SELECT * FROM leave_entitlements WHERE leave_type_id = ? AND role_id = ? AND org_id = ?',
                [leave_type_id, role_id, org_id]
            );

            if (entitlement.length > 0) {
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
        }

        // Check max concurrent staff on leave
        const [entitlement] = await db.query(
            'SELECT * FROM leave_entitlements WHERE leave_type_id = ? AND role_id = ? AND org_id = ?',
            [leave_type_id, role_id, org_id]
        );

        if (entitlement.length > 0) {
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
        }

        // Calculate working days
// If staff has no section use department level schedule
let workSectionId = section_id;

// If no section find any section in the department that has a work schedule
if (!workSectionId) {
    const [deptSections] = await db.query(
        `SELECT s.id FROM sections s
         JOIN work_days wd ON wd.section_id = s.id
         WHERE s.department_id = ? AND s.org_id = ?
         LIMIT 1`,
        [req.user.department_id, org_id]
    );

    if (deptSections.length > 0) {
        workSectionId = deptSections[0].id;
    } else {
        // Try department level work days
        const [deptWorkDays] = await db.query(
            `SELECT id FROM work_days 
             WHERE department_id = ? AND section_id IS NULL`,
            [req.user.department_id]
        );

        if (deptWorkDays.length === 0) {
            return res.status(400).json({ 
                message: 'No work schedule found for your department. Contact your admin.' 
            });
        }
        // Use department_id directly
        workSectionId = null;
    }
}

let totalWorkingDays;
try {
    if (workSectionId) {
        totalWorkingDays = await calculateWorkingDays(start_date, end_date, workSectionId);
    } else {
        // Calculate using department schedule directly
        totalWorkingDays = await calculateWorkingDaysForDept(start_date, end_date, req.user.department_id, org_id);
    }
} catch (err) {
    return res.status(400).json({ 
        message: 'No work schedule found. Contact your admin to set up work days.' 
    });
}

        // Submit application
        await db.query(
            `INSERT INTO leave_applications
             (org_id, staff_id, leave_type_id, acting_staff_id,
              start_date, end_date, total_working_days, reason)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [org_id, staff_id, leave_type_id, acting_staff_id || null,
            start_date, end_date, totalWorkingDays, reason]
        );

        res.status(201).json({
            message: 'Leave application submitted successfully. Waiting for admin approval.',
            total_working_days: totalWorkingDays
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// Get all my applications
const getMyApplications = async (req, res) => {
    const staff_id = req.user.id;

    try {
        const [applications] = await db.query(
            `SELECT la.id, la.start_date, la.end_date, la.total_working_days,
                    la.status, la.reason, la.admin_comment, la.applied_at,
                    lt.name AS leave_type,
                    acting.full_name AS acting_staff_name
             FROM leave_applications la
             JOIN leave_types lt ON la.leave_type_id = lt.id
             LEFT JOIN staff acting ON la.acting_staff_id = acting.id
             WHERE la.staff_id = ?
             ORDER BY la.applied_at DESC`,
            [staff_id]
        );

        res.status(200).json({ applications });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// Cancel a pending application
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

// Request leave switch
const requestLeaveSwitch = async (req, res) => {
    const staff_id = req.user.id;
    const org_id = req.user.org_id;
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

        // Validate switch date is within original leave dates
        if (switch_date < orig.start_date || switch_date > orig.end_date) {
            return res.status(400).json({
                message: `Switch date must be between ${orig.start_date} and ${orig.end_date}.`
            });
        }

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
                message: 'A pending switch request already exists for this application.'
            });
        }

        // Calculate working days for new leave
        let newWorkingDays;
if (req.user.section_id) {
    newWorkingDays = await calculateWorkingDays(switch_date, new_end_date, req.user.section_id);
} else {
    newWorkingDays = await calculateWorkingDaysForDept(switch_date, new_end_date, req.user.department_id, org_id);
}

        if (newWorkingDays <= 0) {
            return res.status(400).json({ message: 'No working days in selected date range.' });
        }

        // Check balance for new leave type
        const currentYear = new Date().getFullYear();
        const [balance] = await db.query(
            `SELECT * FROM leave_balances
             WHERE staff_id = ? AND leave_type_id = ? AND year = ?`,
            [staff_id, new_leave_type_id, currentYear]
        );

        if (balance.length === 0 || balance[0].remaining_days < newWorkingDays) {
            const remaining = balance.length > 0 ? balance[0].remaining_days : 0;
            return res.status(400).json({
                message: `Not enough leave days. You need ${newWorkingDays} days but only have ${remaining} remaining.`
            });
        }

        // Old leave ends the day before switch date
        const oldLeaveEndObj = new Date(switch_date);
        oldLeaveEndObj.setDate(oldLeaveEndObj.getDate() - 1);
        const oldLeaveNewEndDate = oldLeaveEndObj.toISOString().split('T')[0];

        // Create new pending application starting on switch date
        const [newApp] = await db.query(
            `INSERT INTO leave_applications
             (org_id, staff_id, leave_type_id, start_date, end_date,
              total_working_days, reason, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [org_id, staff_id, new_leave_type_id,
            switch_date, new_end_date, newWorkingDays, reason]
        );

        // Create switch request
        // switch_date column stores the last day of original leave
        await db.query(
            `INSERT INTO leave_switches
             (org_id, original_application_id, new_application_id, switch_date, reason)
             VALUES (?, ?, ?, ?, ?)`,
            [org_id, original_application_id, newApp.insertId, oldLeaveNewEndDate, reason]
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
    calculateWorkingDaysForDept,
    getMyProfile,
    getMyLeaveBalances,
    getAvailableLeaveTypes,
    getDeptStaffForActing,
    applyForLeave,
    getMyApplications,
    cancelApplication,
    requestLeaveSwitch
};