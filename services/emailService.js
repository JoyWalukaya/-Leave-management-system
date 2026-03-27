const nodemailer = require('nodemailer');

// ============================
// EMAIL TRANSPORTER
// This connects to Gmail SMTP
// and allows us to send emails
// ============================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ============================
// SEND ORG ADMIN CREDENTIALS
// Called when super admin creates
// a new org admin account
// ============================
const sendOrgAdminCredentials = async (email, full_name, org_name, username, password) => {
    const mailOptions = {
        from: `"Leave Management System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Your Organization Admin Account — ${org_name}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #272F52;">Leave Management System</h2>
                <p>Hello ${full_name},</p>
                <p>Your organization admin account has been created for <strong>${org_name}</strong>.</p>
                <p>Use the credentials below to log in:</p>
                <div style="background: #f4f4f4; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                    <p><strong>Username:</strong> ${username}</p>
                    <p><strong>Password:</strong> ${password}</p>
                </div>
                <p>Login at: <a href="${process.env.APP_URL}">${process.env.APP_URL}</a></p>
                <p style="color: #922A30;">Please keep your credentials safe and do not share them.</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};

// ============================
// SEND DEPT ADMIN CREDENTIALS
// Called when org admin creates
// a new department admin account
// ============================
const sendDeptAdminCredentials = async (email, full_name, org_name, dept_name, username, password) => {
    const mailOptions = {
        from: `"Leave Management System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Your Department Admin Account — ${org_name}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #272F52;">Leave Management System</h2>
                <p>Hello ${full_name},</p>
                <p>Your department admin account has been created for <strong>${dept_name}</strong> at <strong>${org_name}</strong>.</p>
                <p>Use the credentials below to log in:</p>
                <div style="background: #f4f4f4; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                    <p><strong>Username:</strong> ${username}</p>
                    <p><strong>Password:</strong> ${password}</p>
                </div>
                <p>Login at: <a href="${process.env.APP_URL}">${process.env.APP_URL}</a></p>
                <p style="color: #922A30;">Please keep your credentials safe and do not share them.</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};

// ============================
// SEND STAFF CREDENTIALS
// Called when dept admin clicks
// "Send Email" for a staff member
// ============================
const sendStaffCredentials = async (email, full_name, org_name, dept_name, section_name, username, password) => {
    const mailOptions = {
        from: `"Leave Management System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Your Staff Account — ${org_name}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #272F52;">Leave Management System</h2>
                <p>Hello ${full_name},</p>
                <p>Your staff account has been created at <strong>${org_name}</strong>.</p>
                <p><strong>Department:</strong> ${dept_name}</p>
                ${section_name ? `<p><strong>Section:</strong> ${section_name}</p>` : ''}
                <p>Use the credentials below to log in:</p>
                <div style="background: #f4f4f4; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                    <p><strong>Username:</strong> ${username}</p>
                    <p><strong>Password:</strong> ${password}</p>
                </div>
                <p>Login at: <a href="${process.env.APP_URL}">${process.env.APP_URL}</a></p>
                <p style="color: #922A30;">Please keep your credentials safe and do not share them.</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};

// ============================
// SEND LEAVE NOTIFICATION
// Called when a leave application
// is approved — notifies the
// acting staff member
// ============================
const sendActingStaffNotification = async (email, full_name, absent_staff_name, start_date, end_date) => {
    const mailOptions = {
        from: `"Leave Management System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `You have been assigned as Acting Staff`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #272F52;">Leave Management System</h2>
                <p>Hello ${full_name},</p>
                <p>You have been assigned to cover for <strong>${absent_staff_name}</strong> who will be on leave.</p>
                <div style="background: #f4f4f4; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                    <p><strong>From:</strong> ${start_date}</p>
                    <p><strong>To:</strong> ${end_date}</p>
                </div>
                <p>Please plan accordingly.</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};

module.exports = {
    sendOrgAdminCredentials,
    sendDeptAdminCredentials,
    sendStaffCredentials,
    sendActingStaffNotification
};