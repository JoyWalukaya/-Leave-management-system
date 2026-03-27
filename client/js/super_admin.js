const API = 'http://localhost:5000/api';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

if (!token || !user || user.system_role !== 'super_admin') {
    window.location.href = 'index.html';
}

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

function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    btn.classList.add('active');
}

function showAlert(id, message, type) {
    const alert = document.getElementById(id);
    alert.textContent = message;
    alert.className = `alert alert-${type} show`;
    setTimeout(() => { alert.className = 'alert'; }, 5000);
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

async function apiGet(endpoint) {
    const response = await fetch(`${API}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.status === 401 || response.status === 403) {
        localStorage.clear();
        window.location.href = 'index.html';
        return;
    }
    return response.json();
}

async function apiPost(endpoint, body) {
    const response = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
    });
    if (response.status === 401 || response.status === 403) {
        localStorage.clear();
        window.location.href = 'index.html';
        return { ok: false, data: {} };
    }
    return { ok: response.ok, data: await response.json() };
}

async function apiPatch(endpoint, body = {}) {
    const response = await fetch(`${API}${endpoint}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
    });
    if (response.status === 401 || response.status === 403) {
        localStorage.clear();
        window.location.href = 'index.html';
        return { ok: false, data: {} };
    }
    return { ok: response.ok, data: await response.json() };
}

async function apiDelete(endpoint) {
    const response = await fetch(`${API}${endpoint}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.status === 401 || response.status === 403) {
        localStorage.clear();
        window.location.href = 'index.html';
        return { ok: false, data: {} };
    }
    return { ok: response.ok, data: await response.json() };
}

// Organizations
async function loadOrganizations() {
    const data = await apiGet('/super-admin/organizations');
    if (!data) return;
    const tbody = document.getElementById('organizations-table');
    const select = document.getElementById('org-admin-org');
    select.innerHTML = '<option value="">Select organization</option>';
    if (data.organizations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-secondary)">No organizations yet.</td></tr>';
        return;
    }
    tbody.innerHTML = data.organizations.map(o => `
        <tr>
            <td>${o.name}</td>
            <td>${o.code}</td>
            <td>${o.email || '-'}</td>
            <td>${o.phone || '-'}</td>
            <td><span class="badge ${o.is_active ? 'badge-approved' : 'badge-denied'}">${o.is_active ? 'Active' : 'Inactive'}</span></td>
            <td style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                <button class="btn btn-primary" style="padding:0.3rem 0.8rem; font-size:0.8rem"
                    onclick="editOrg(${o.id}, '${o.name.replace(/'/g, "\\'")}', '${o.code}', '${(o.email||'').replace(/'/g, "\\'")}', '${(o.phone||'').replace(/'/g, "\\'")}', '${(o.address||'').replace(/'/g, "\\'")}')">Edit</button>
                <button class="btn btn-danger" style="padding:0.3rem 0.8rem; font-size:0.8rem"
                    onclick="toggleOrg(${o.id}, ${o.is_active})">${o.is_active ? 'Deactivate' : 'Activate'}</button>
                ${!o.is_active ? `
                    <button class="btn btn-danger" style="padding:0.3rem 0.8rem; font-size:0.8rem; background:#666"
                        onclick="deleteOrg(${o.id})">Delete</button>
                ` : ''}
            </td>
        </tr>
    `).join('');
    data.organizations.forEach(o => {
        const option = document.createElement('option');
        option.value = o.id;
        option.textContent = o.name;
        select.appendChild(option);
    });
}

function editOrg(id, name, code, email, phone, address) {
    document.getElementById('org-name').value = name;
    document.getElementById('org-code').value = code;
    document.getElementById('org-email').value = email;
    document.getElementById('org-phone').value = phone;
    document.getElementById('org-address').value = address;
    const btn = document.getElementById('org-submit-btn');
    btn.textContent = 'Update Organization';
    btn.onclick = () => updateOrg(id);
}

async function updateOrg(id) {
    const name = document.getElementById('org-name').value.trim();
    const code = document.getElementById('org-code').value.trim();
    const email = document.getElementById('org-email').value.trim();
    const phone = document.getElementById('org-phone').value.trim();
    const address = document.getElementById('org-address').value.trim();
    if (!name || !code) { showAlert('org-alert', 'Name and code are required.', 'error'); return; }
    const { ok, data } = await apiPatch(`/super-admin/organizations/${id}`, { name, code, email, phone, address, is_active: 1 });
    if (ok) {
        showAlert('org-alert', 'Organization updated.', 'success');
        const btn = document.getElementById('org-submit-btn');
        btn.textContent = 'Add Organization';
        btn.onclick = createOrganization;
        document.getElementById('org-name').value = '';
        document.getElementById('org-code').value = '';
        document.getElementById('org-email').value = '';
        document.getElementById('org-phone').value = '';
        document.getElementById('org-address').value = '';
        loadOrganizations();
    } else {
        showAlert('org-alert', data.message, 'error');
    }
}

async function createOrganization() {
    const name = document.getElementById('org-name').value.trim();
    const code = document.getElementById('org-code').value.trim();
    const email = document.getElementById('org-email').value.trim();
    const phone = document.getElementById('org-phone').value.trim();
    const address = document.getElementById('org-address').value.trim();
    if (!name || !code) { showAlert('org-alert', 'Name and code are required.', 'error'); return; }
    const { ok, data } = await apiPost('/super-admin/organizations', { name, code, email, phone, address });
    if (ok) {
        showAlert('org-alert', 'Organization created successfully.', 'success');
        document.getElementById('org-name').value = '';
        document.getElementById('org-code').value = '';
        document.getElementById('org-email').value = '';
        document.getElementById('org-phone').value = '';
        document.getElementById('org-address').value = '';
        loadOrganizations();
    } else {
        showAlert('org-alert', data.message, 'error');
    }
}

async function toggleOrg(org_id, is_active) {
    const { ok, data } = await apiPatch(`/super-admin/organizations/${org_id}`, { is_active: is_active ? 0 : 1 });
    if (ok) { loadOrganizations(); } else { showAlert('main-alert', data.message, 'error'); }
}

async function deleteOrg(org_id) {
    if (!confirm('Permanently delete this organization? This cannot be undone.')) return;
    const { ok, data } = await apiDelete(`/super-admin/organizations/${org_id}`);
    if (ok) { loadOrganizations(); } else { showAlert('main-alert', data.message, 'error'); }
}

// Org Admins
async function loadOrgAdmins() {
    const data = await apiGet('/super-admin/org-admins');
    if (!data) return;
    const tbody = document.getElementById('org-admins-table');
    if (data.org_admins.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-secondary)">No org admins yet.</td></tr>';
        return;
    }
    tbody.innerHTML = data.org_admins.map(a => `
        <tr>
            <td>${a.full_name}</td>
            <td>${a.email}</td>
            <td>${a.username}</td>
            <td>${a.org_name}</td>
            <td><span class="badge ${a.is_active ? 'badge-approved' : 'badge-denied'}">${a.is_active ? 'Active' : 'Inactive'}</span></td>
            <td style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                ${a.is_active ?
                    `<button class="btn btn-danger" style="padding:0.3rem 0.8rem; font-size:0.8rem"
                        onclick="deactivateOrgAdmin(${a.id})">Deactivate</button>` :
                    `<button class="btn btn-success" style="padding:0.3rem 0.8rem; font-size:0.8rem"
                        onclick="reactivateOrgAdmin(${a.id})">Reactivate</button>
                     <button class="btn btn-danger" style="padding:0.3rem 0.8rem; font-size:0.8rem; background:#666"
                        onclick="deleteOrgAdmin(${a.id})">Delete</button>`
                }
            </td>
        </tr>
    `).join('');
}

async function createOrgAdmin() {
    const org_id = document.getElementById('org-admin-org').value;
    const full_name = document.getElementById('org-admin-name').value.trim();
    const email = document.getElementById('org-admin-email').value.trim();
    if (!org_id || !full_name || !email) { showAlert('org-admin-alert', 'All fields are required.', 'error'); return; }
    const { ok, data } = await apiPost('/super-admin/org-admins', { org_id, full_name, email });
    if (ok) {
        showAlert('org-admin-alert', 'Org admin created and credentials sent via email.', 'success');
        document.getElementById('org-admin-org').value = '';
        document.getElementById('org-admin-name').value = '';
        document.getElementById('org-admin-email').value = '';
        loadOrgAdmins();
    } else {
        showAlert('org-admin-alert', data.message, 'error');
    }
}

async function deactivateOrgAdmin(id) {
    if (!confirm('Deactivate this org admin?')) return;
    const { ok, data } = await apiPatch(`/super-admin/org-admins/deactivate/${id}`);
    if (ok) { loadOrgAdmins(); } else { showAlert('main-alert', data.message, 'error'); }
}

async function reactivateOrgAdmin(id) {
    const { ok, data } = await apiPatch(`/super-admin/org-admins/reactivate/${id}`);
    if (ok) { loadOrgAdmins(); } else { showAlert('main-alert', data.message, 'error'); }
}

async function deleteOrgAdmin(id) {
    if (!confirm('Permanently delete this org admin?')) return;
    const { ok, data } = await apiDelete(`/super-admin/org-admins/${id}`);
    if (ok) { loadOrgAdmins(); } else { showAlert('main-alert', data.message, 'error'); }
}

// Overview
async function loadOverview() {
    const data = await apiGet('/super-admin/overview');
    if (!data) return;

    // Dept admins
    const deptAdminsTbody = document.getElementById('overview-dept-admins');
    if (deptAdminsTbody) {
        deptAdminsTbody.innerHTML = data.dept_admins.length === 0 ?
            '<tr><td colspan="5" style="text-align:center; color:var(--text-secondary)">None yet.</td></tr>' :
            data.dept_admins.map(a => `
                <tr>
                    <td>${a.org_name}</td>
                    <td>${a.dept_name}</td>
                    <td>${a.full_name}</td>
                    <td>${a.email}</td>
                    <td><span class="badge ${a.is_active ? 'badge-approved' : 'badge-denied'}">${a.is_active ? 'Active' : 'Inactive'}</span></td>
                </tr>
            `).join('');
    }

    // Staff
    const staffTbody = document.getElementById('overview-staff');
    if (staffTbody) {
        staffTbody.innerHTML = data.staff.length === 0 ?
            '<tr><td colspan="7" style="text-align:center; color:var(--text-secondary)">None yet.</td></tr>' :
            data.staff.map(s => `
                <tr>
                    <td>${s.org_name}</td>
                    <td>${s.dept_name}</td>
                    <td>${s.section_name || '-'}</td>
                    <td>${s.staff_number}</td>
                    <td>${s.full_name}</td>
                    <td>${s.role_name}</td>
                    <td><span class="badge badge-${s.status}">${s.status}</span></td>
                </tr>
            `).join('');
    }

    // Applications
    const appsTbody = document.getElementById('overview-applications');
    if (appsTbody) {
        appsTbody.innerHTML = data.applications.length === 0 ?
            '<tr><td colspan="7" style="text-align:center; color:var(--text-secondary)">None yet.</td></tr>' :
            data.applications.map(a => `
                <tr>
                    <td>${a.org_name}</td>
                    <td>${a.dept_name}</td>
                    <td>${a.staff_name}</td>
                    <td>${a.leave_type}</td>
                    <td>${a.start_date}</td>
                    <td>${a.end_date}</td>
                    <td><span class="badge badge-${a.status}">${a.status}</span></td>
                </tr>
            `).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('nav-user-name').textContent = user.full_name;
    loadOrganizations();
    loadOrgAdmins();
    loadOverview();
});