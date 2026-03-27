const API = 'http://localhost:5000/api';

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

function showAlert(message, type) {
    const alert = document.getElementById('login-alert');
    alert.textContent = message;
    alert.className = `alert alert-${type} show`;
    setTimeout(() => { alert.className = 'alert'; }, 5000);
}

async function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        showAlert('Please enter username and password.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirect based on role
            const role = data.user.system_role;
            if (role === 'super_admin') {
                window.location.href = 'super_admin.html';
            } else if (role === 'org_admin') {
                window.location.href = 'org_admin.html';
            } else if (role === 'dept_admin') {
                window.location.href = 'dept_admin.html';
            } else if (role === 'staff') {
                window.location.href = 'staff.html';
            }
        } else {
            showAlert(data.message, 'error');
        }

    } catch (err) {
        showAlert('Could not connect to server.', 'error');
    }
}