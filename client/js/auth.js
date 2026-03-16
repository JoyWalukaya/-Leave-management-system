const API = 'http://localhost:5000/api';

// THEME TOGGLE
function toggleTheme() {
    const html = document.documentElement;
    const btn = document.querySelector('.theme-toggle');
    if (html.getAttribute('data-theme') === 'light') {
        html.setAttribute('data-theme', 'dark');
        btn.textContent = '☀️ Light Mode';
    } else {
        html.setAttribute('data-theme', 'light');
        btn.textContent = '🌙 Dark Mode';
    }
}

// SWITCH LOGIN TABS
function switchLoginTab(tabId) {
    // Remove active from all tabs and forms
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));

    // Add active to clicked tab and matching form
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');

    // Clear alerts
    hideAlert();
}

// SHOW / HIDE ALERTS
function showAlert(message, type) {
    const alert = document.getElementById('login-alert');
    alert.textContent = message;
    alert.className = `alert alert-${type} show`;
}

function hideAlert() {
    const alert = document.getElementById('login-alert');
    alert.className = 'alert';
}

// STAFF LOGIN
async function staffLogin() {
    const staff_number = document.getElementById('staff-number').value.trim();
    const password = document.getElementById('staff-password').value.trim();

    if (!staff_number || !password) {
        showAlert('Please fill in all fields.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API}/auth/staff-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staff_number, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Save token and user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            // Redirect to staff dashboard
            window.location.href = 'staff.html';
        } else {
            showAlert(data.message, 'error');
        }

    } catch (err) {
        showAlert('Could not connect to server. Try again.', 'error');
    }
}

// ADMIN LOGIN
async function adminLogin() {
    const admin_number = document.getElementById('admin-number').value.trim();
    const password = document.getElementById('admin-password').value.trim();

    if (!admin_number || !password) {
        showAlert('Please fill in all fields.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API}/auth/admin-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_number, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'admin.html';
        } else {
            showAlert(data.message, 'error');
        }

    } catch (err) {
        showAlert('Could not connect to server. Try again.', 'error');
    }
}

// STAFF REGISTER
async function registerStaff() {
    const staff_number = document.getElementById('reg-staff-number').value.trim();
    const full_name = document.getElementById('reg-full-name').value.trim();
    const gender = document.getElementById('reg-gender').value;
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const confirm_password = document.getElementById('reg-confirm-password').value.trim();

    if (!staff_number || !full_name || !gender || !email || !password || !confirm_password) {
        showAlert('Please fill in all fields.', 'error');
        return;
    }

    if (password !== confirm_password) {
        showAlert('Passwords do not match.', 'error');
        return;
    }

    if (password.length < 6) {
        showAlert('Password must be at least 6 characters.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staff_number, full_name, gender, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('Registration successful! Wait for admin to activate your account.', 'success');
        } else {
            showAlert(data.message, 'error');
        }

    } catch (err) {
        showAlert('Could not connect to server. Try again.', 'error');
    }
}

// ADMIN REGISTER
async function registerAdmin() {
    const admin_number = document.getElementById('reg-admin-number').value.trim();
    const full_name = document.getElementById('reg-admin-full-name').value.trim();
    const email = document.getElementById('reg-admin-email').value.trim();
    const password = document.getElementById('reg-admin-password').value.trim();
    const confirm_password = document.getElementById('reg-admin-confirm-password').value.trim();

    if (!admin_number || !full_name || !email || !password || !confirm_password) {
        showAlert('Please fill in all fields.', 'error');
        return;
    }

    if (password !== confirm_password) {
        showAlert('Passwords do not match.', 'error');
        return;
    }

    if (password.length < 6) {
        showAlert('Password must be at least 6 characters.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API}/auth/admin-register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_number, full_name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('Registration successful! You can now login.', 'success');
        } else {
            showAlert(data.message, 'error');
        }

    } catch (err) {
        showAlert('Could not connect to server. Try again.', 'error');
    }
}

// CHECK IF ALREADY LOGGED IN
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

if (token && user) {
    if (user.system_role === 'staff') {
        window.location.href = 'staff.html';
    } else if (user.system_role === 'admin') {
        window.location.href = 'admin.html';
    }
}