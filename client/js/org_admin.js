const API = 'http://localhost:5000/api';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

if (!token || !user || user.system_role !== 'org_admin') {
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

// Settings
async function loadSettings() {
    const data = await apiGet('/org-admin/settings');
    if (!data || !data.settings) return;
    const s = data.settings;
    document.getElementById('year-reset-month').value = s.year_reset_month || 1;
    document.getElementById('year-reset-day').value = s.year_reset_day || 1;
    document.getElementById('saturday-rule').value = s.saturday_rule || 0;
    document.getElementById('carry-forward-days').value = s.carry_forward_days || 0;
    document.getElementById('carry-forward-expiry').value = s.carry_forward_expiry_months || 3;
    document.getElementById('allow-leave-switch').value = s.allow_leave_switch || 1;
    document.getElementById('leave-switch-notice').value = s.leave_switch_notice_days || 0;
}

async function saveSettings() {
    const { ok, data } = await apiPost('/org-admin/settings', {
        year_reset_month: parseInt(document.getElementById('year-reset-month').value),
        year_reset_day: parseInt(document.getElementById('year-reset-day').value),
        saturday_rule: parseFloat(document.getElementById('saturday-rule').value),
        carry_forward_days: parseInt(document.getElementById('carry-forward-days').value),
        carry_forward_expiry_months: parseInt(document.getElementById('carry-forward-expiry').value),
        allow_leave_switch: parseInt(document.getElementById('allow-leave-switch').value),
        leave_switch_notice_days: parseInt(document.getElementById('leave-switch-notice').value),
        setup_complete: 1
    });
    if (ok) {
        showAlert('settings-alert', 'Settings saved successfully.', 'success');
    } else {
        showAlert('settings-alert', data.message, 'error');
    }
}

// Departments
async function loadDepartments() {
    const data = await apiGet('/org-admin/departments');
    if (!data) return;

    const tbody = document.getElementById('departments-table');
    const selects = ['section-dept', 'work-days-dept', 'dept-admin-dept', 'entitlement-dept'];

    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<option value="">Select department</option>';
    });

    if (data.departments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-secondary)">No departments yet.</td></tr>';
        return;
    }

    tbody.innerHTML = data.departments.map(d => `
        <tr>
            <td>${d.name}</td>
            <td>${d.code || '-'}</td>
            <td>
                <button class="btn btn-danger" style="padding:0.3rem 0.8rem; font-size:0.8rem"
                    onclick="deleteDepartment(${d.id})">Delete</button>
            </td>
        </tr>
    `).join('');

    data.departments.forEach(d => {
        selects.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const option = document.createElement('option');
                option.value = d.id;
                option.textContent = d.name;
                el.appendChild(option);
            }
        });
    });
}

async function createDepartment() {
    const name = document.getElementById('dept-name').value.trim();
    const code = document.getElementById('dept-code').value.trim();
    if (!name) { showAlert('dept-alert', 'Department name is required.', 'error'); return; }
    const { ok, data } = await apiPost('/org-admin/departments', { name, code });
    if (ok) {
        showAlert('dept-alert', 'Department created.', 'success');
        document.getElementById('dept-name').value = '';
        document.getElementById('dept-code').value = '';
        loadDepartments();
    } else {
        showAlert('dept-alert', data.message, 'error');
    }
}

async function deleteDepartment(id) {
    if (!confirm('Delete this department?')) return;
    const { ok, data } = await apiDelete(`/org-admin/departments/${id}`);
    if (ok) { loadDepartments(); } else { showAlert('dept-alert', data.message, 'error'); }
}

// Sections
async function loadSections() {
    const data = await apiGet('/org-admin/sections');
    if (!data) return;
    const tbody = document.getElementById('sections-table');
    if (data.sections.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-secondary)">No sections yet.</td></tr>';
        return;
    }
    tbody.innerHTML = data.sections.map(s => `
        <tr>
            <td>${s.name}</td>
            <td>${s.department_name}</td>
            <td>
                <button class="btn btn-danger" style="padding:0.3rem 0.8rem; font-size:0.8rem"
                    onclick="deleteSection(${s.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function createSection() {
    const department_id = document.getElementById('section-dept').value;
    const name = document.getElementById('section-name').value.trim();
    if (!department_id || !name) { showAlert('section-alert', 'Department and name are required.', 'error'); return; }
    const { ok, data } = await apiPost('/org-admin/sections', { department_id, name });
    if (ok) {
        showAlert('section-alert', 'Section created.', 'success');
        document.getElementById('section-name').value = '';
        loadSections();
        loadSectionsForWorkDays();
    } else {
        showAlert('section-alert', data.message, 'error');
    }
}

async function deleteSection(id) {
    if (!confirm('Delete this section?')) return;
    const { ok, data } = await apiDelete(`/org-admin/sections/${id}`);
    if (ok) { loadSections(); } else { showAlert('section-alert', data.message, 'error'); }
}

// Load sections for work days dropdown based on selected department
async function loadSectionsForWorkDays() {
    const dept_id = document.getElementById('work-days-dept').value;
    const select = document.getElementById('work-days-section');
    select.innerHTML = '<option value="">All sections in dept</option>';
    if (!dept_id) return;
    const data = await apiGet('/org-admin/sections');
    if (!data) return;
    data.sections
        .filter(s => s.department_id == dept_id)
        .forEach(s => {
            const option = document.createElement('option');
            option.value = s.id;
            option.textContent = s.name;
            select.appendChild(option);
        });
}

// Roles
async function loadRoles() {
    const data = await apiGet('/org-admin/roles');
    if (!data) return;
    const tbody = document.getElementById('roles-table');
    const selects = ['entitlement-role'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<option value="">Select role</option>';
    });
    if (data.roles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-secondary)">No roles yet.</td></tr>';
        return;
    }
    tbody.innerHTML = data.roles.map(r => `
        <tr>
            <td>${r.name}</td>
            <td>${r.is_managerial ? 'Yes' : 'No'}</td>
            <td>
                <button class="btn btn-danger" style="padding:0.3rem 0.8rem; font-size:0.8rem"
                    onclick="deleteRole(${r.id})">Delete</button>
            </td>
        </tr>
    `).join('');
    data.roles.forEach(r => {
        selects.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const option = document.createElement('option');
                option.value = r.id;
                option.textContent = r.name;
                el.appendChild(option);
            }
        });
    });
}

async function createRole() {
    const name = document.getElementById('role-name').value.trim();
    const is_managerial = document.getElementById('role-managerial').value;
    if (!name) { showAlert('role-alert', 'Role name is required.', 'error'); return; }
    const { ok, data } = await apiPost('/org-admin/roles', { name, is_managerial });
    if (ok) {
        showAlert('role-alert', 'Role created.', 'success');
        document.getElementById('role-name').value = '';
        loadRoles();
    } else {
        showAlert('role-alert', data.message, 'error');
    }
}

async function deleteRole(id) {
    if (!confirm('Delete this role?')) return;
    const { ok, data } = await apiDelete(`/org-admin/roles/${id}`);
    if (ok) { loadRoles(); } else { showAlert('role-alert', data.message, 'error'); }
}

// Leave Types
async function loadLeaveTypes() {
    const data = await apiGet('/org-admin/leave-types');
    if (!data) return;
    const tbody = document.getElementById('leave-types-table');
    const select = document.getElementById('entitlement-leave-type');
    select.innerHTML = '<option value="">Select leave type</option>';
    if (data.leave_types.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-secondary)">No leave types yet.</td></tr>';
        return;
    }
    tbody.innerHTML = data.leave_types.map(lt => `
        <tr>
            <td>${lt.name}</td>
            <td style="text-transform:capitalize">${lt.gender_restriction}</td>
            <td><span class="badge ${lt.is_active ? 'badge-approved' : 'badge-denied'}">${lt.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn btn-danger" style="padding:0.3rem 0.8rem; font-size:0.8rem"
                    onclick="deleteLeaveType(${lt.id})">Delete</button>
            </td>
        </tr>
    `).join('');
    data.leave_types.forEach(lt => {
        const option = document.createElement('option');
        option.value = lt.id;
        option.textContent = lt.name;
        select.appendChild(option);
    });
}

async function createLeaveType() {
    const name = document.getElementById('leave-type-name').value.trim();
    const gender_restriction = document.getElementById('leave-type-gender').value;
    if (!name) { showAlert('leave-type-alert', 'Leave type name is required.', 'error'); return; }
    const { ok, data } = await apiPost('/org-admin/leave-types', { name, gender_restriction });
    if (ok) {
        showAlert('leave-type-alert', 'Leave type created.', 'success');
        document.getElementById('leave-type-name').value = '';
        loadLeaveTypes();
    } else {
        showAlert('leave-type-alert', data.message, 'error');
    }
}

async function deleteLeaveType(id) {
    if (!confirm('Delete this leave type?')) return;
    const { ok, data } = await apiDelete(`/org-admin/leave-types/${id}`);
    if (ok) { loadLeaveTypes(); } else { showAlert('leave-type-alert', data.message, 'error'); }
}

// Entitlements
async function loadEntitlements() {
    const data = await apiGet('/org-admin/leave-entitlements');
    if (!data) return;
    const tbody = document.getElementById('entitlements-table');
    if (data.entitlements.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-secondary)">No entitlements yet.</td></tr>';
        return;
    }
    tbody.innerHTML = data.entitlements.map(e => `
        <tr>
            <td>${e.leave_type_name}</td>
            <td>${e.role_name}</td>
            <td>${e.max_days_per_year}</td>
            <td>${e.max_concurrent_staff}</td>
            <td>${e.min_days_before_reapply}</td>
            <td>${e.max_carry_forward_days}</td>
            <td>
                <button class="btn btn-danger" style="padding:0.3rem 0.8rem; font-size:0.8rem"
                    onclick="deleteEntitlement(${e.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function saveEntitlement() {
    const leave_type_id = document.getElementById('entitlement-leave-type').value;
    const role_id = document.getElementById('entitlement-role').value;
    const max_days_per_year = document.getElementById('entitlement-max-days').value;
    const max_concurrent_staff = document.getElementById('entitlement-max-concurrent').value;
    const min_days_before_reapply = document.getElementById('entitlement-min-days').value;
    const max_carry_forward_days = document.getElementById('entitlement-carry-forward').value;

    if (!leave_type_id || !role_id || !max_days_per_year) {
        showAlert('entitlement-alert', 'Leave type, role and max days are required.', 'error');
        return;
    }

    const { ok, data } = await apiPost('/org-admin/leave-entitlements', {
        leave_type_id, role_id, max_days_per_year,
        max_concurrent_staff: max_concurrent_staff || 1,
        min_days_before_reapply: min_days_before_reapply || 0,
        max_carry_forward_days: max_carry_forward_days || 0
    });

    if (ok) {
        showAlert('entitlement-alert', 'Entitlement saved.', 'success');
        loadEntitlements();
    } else {
        showAlert('entitlement-alert', data.message, 'error');
    }
}

async function deleteEntitlement(id) {
    if (!confirm('Delete this entitlement?')) return;
    const { ok, data } = await apiDelete(`/org-admin/leave-entitlements/${id}`);
    if (ok) { loadEntitlements(); } else { showAlert('entitlement-alert', data.message, 'error'); }
}

// Work Days
async function loadWorkDays() {
    const data = await apiGet('/org-admin/work-days');
    if (!data) return;
    const tbody = document.getElementById('work-days-table');
    if (data.work_days.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--text-secondary)">No work days set yet.</td></tr>';
        return;
    }
    tbody.innerHTML = data.work_days.map(w => `
        <tr>
            <td>${w.department_name || '-'}</td>
            <td>${w.section_name || 'All sections'}</td>
            <td>${w.monday}</td>
            <td>${w.tuesday}</td>
            <td>${w.wednesday}</td>
            <td>${w.thursday}</td>
            <td>${w.friday}</td>
            <td>${w.saturday}</td>
            <td>${w.sunday}</td>
        </tr>
    `).join('');
}

async function saveWorkDays() {
    const department_id = document.getElementById('work-days-dept').value;
    const section_id = document.getElementById('work-days-section').value;
    if (!department_id) { showAlert('work-days-alert', 'Please select a department.', 'error'); return; }
    const { ok, data } = await apiPost('/org-admin/work-days', {
        department_id,
        section_id: section_id || null,
        monday: parseFloat(document.getElementById('wd-monday').value),
        tuesday: parseFloat(document.getElementById('wd-tuesday').value),
        wednesday: parseFloat(document.getElementById('wd-wednesday').value),
        thursday: parseFloat(document.getElementById('wd-thursday').value),
        friday: parseFloat(document.getElementById('wd-friday').value),
        saturday: parseFloat(document.getElementById('wd-saturday').value),
        sunday: parseFloat(document.getElementById('wd-sunday').value)
    });
    if (ok) {
        showAlert('work-days-alert', 'Work days saved.', 'success');
        loadWorkDays();
    } else {
        showAlert('work-days-alert', data.message, 'error');
    }
}

// Holidays
async function loadHolidays() {
    const data = await apiGet('/org-admin/public-holidays');
    if (!data) return;
    const tbody = document.getElementById('holidays-table');
    if (data.holidays.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-secondary)">No holidays yet.</td></tr>';
        return;
    }
    tbody.innerHTML = data.holidays.map(h => `
        <tr>
            <td>${h.name}</td>
            <td>${h.holiday_date}</td>
            <td>
                <button class="btn btn-danger" style="padding:0.3rem 0.8rem; font-size:0.8rem"
                    onclick="deleteHoliday(${h.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function createHoliday() {
    const name = document.getElementById('holiday-name').value.trim();
    const holiday_date = document.getElementById('holiday-date').value;
    if (!name || !holiday_date) { showAlert('holiday-alert', 'Name and date are required.', 'error'); return; }
    const { ok, data } = await apiPost('/org-admin/public-holidays', { name, holiday_date });
    if (ok) {
        showAlert('holiday-alert', 'Holiday added.', 'success');
        document.getElementById('holiday-name').value = '';
        document.getElementById('holiday-date').value = '';
        loadHolidays();
    } else {
        showAlert('holiday-alert', data.message, 'error');
    }
}

async function deleteHoliday(id) {
    if (!confirm('Delete this holiday?')) return;
    const { ok, data } = await apiDelete(`/org-admin/public-holidays/${id}`);
    if (ok) { loadHolidays(); } else { showAlert('holiday-alert', data.message, 'error'); }
}

// Dept Admins
async function loadDeptAdmins() {
    const data = await apiGet('/org-admin/dept-admins');
    if (!data) return;
    const tbody = document.getElementById('dept-admins-table');
    if (data.dept_admins.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-secondary)">No dept admins yet.</td></tr>';
        return;
    }
    tbody.innerHTML = data.dept_admins.map(a => `
    <tr>
        <td>${a.full_name}</td>
        <td>${a.email}</td>
        <td>${a.username}</td>
        <td>${a.department_name}</td>
        <td><span class="badge ${a.is_active ? 'badge-approved' : 'badge-denied'}">${a.is_active ? 'Active' : 'Inactive'}</span></td>
        <td style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            ${a.is_active ?
                `<button class="btn btn-danger" style="padding:0.3rem 0.8rem; font-size:0.8rem"
                    onclick="deactivateDeptAdmin(${a.id})">Deactivate</button>` :
                `<button class="btn btn-success" style="padding:0.3rem 0.8rem; font-size:0.8rem"
                    onclick="reactivateDeptAdmin(${a.id})">Reactivate</button>
                 <button class="btn btn-danger" style="padding:0.3rem 0.8rem; font-size:0.8rem; background:#666"
                    onclick="deleteDeptAdmin(${a.id})">Delete</button>`
            }
        </td>
    </tr>
`).join('');
}

async function createDeptAdmin() {
    const department_id = document.getElementById('dept-admin-dept').value;
    const full_name = document.getElementById('dept-admin-name').value.trim();
    const email = document.getElementById('dept-admin-email').value.trim();
    if (!department_id || !full_name || !email) {
        showAlert('dept-admin-alert', 'All fields are required.', 'error');
        return;
    }
    const { ok, data } = await apiPost('/org-admin/dept-admins', { department_id, full_name, email });
    if (ok) {
        showAlert('dept-admin-alert', 'Dept admin created and credentials sent via email.', 'success');
        document.getElementById('dept-admin-dept').value = '';
        document.getElementById('dept-admin-name').value = '';
        document.getElementById('dept-admin-email').value = '';
        loadDeptAdmins();
    } else {
        showAlert('dept-admin-alert', data.message, 'error');
    }
}

async function deactivateDeptAdmin(id) {
    if (!confirm('Deactivate this dept admin?')) return;
    const { ok, data } = await apiPatch(`/org-admin/dept-admins/deactivate/${id}`);
    if (ok) { loadDeptAdmins(); } else { showAlert('main-alert', data.message, 'error'); }
}

// All Staff
async function loadAllStaff() {
    const data = await apiGet('/org-admin/staff');
    if (!data) return;
    const tbody = document.getElementById('staff-table');
    if (data.staff.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-secondary)">No staff yet.</td></tr>';
        return;
    }
    tbody.innerHTML = data.staff.map(s => `
        <tr>
            <td>${s.staff_number}</td>
            <td>${s.full_name}</td>
            <td>${s.email || '-'}</td>
            <td>${s.department_name}</td>
            <td>${s.section_name || '-'}</td>
            <td>${s.role_name}</td>
            <td><span class="badge badge-${s.status}">${s.status}</span></td>
            <td>${s.date_joined}</td>
        </tr>
    `).join('');
}

async function reactivateDeptAdmin(id) {
    const { ok, data } = await apiPatch(`/org-admin/dept-admins/reactivate/${id}`);
    if (ok) { loadDeptAdmins(); } else { showAlert('main-alert', data.message, 'error'); }
}
// Load org admin profile
async function loadOrgAdminProfile() {
    const data = await apiGet('/org-admin/profile');
    if (!data) return;
    const p = data.profile;
    // Set org name in header
    document.getElementById('org-admin-title').textContent = `${p.org_name} — Org Admin Dashboard`;
    document.getElementById('nav-user-name').textContent = p.full_name;
    document.getElementById('org-admin-profile-content').innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:1rem;">
            <div>
                <p style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase">Full Name</p>
                <p style="font-weight:600; margin-top:0.3rem">${p.full_name}</p>
            </div>
            <div>
                <p style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase">Username</p>
                <p style="font-weight:600; margin-top:0.3rem">${p.username}</p>
            </div>
            <div>
                <p style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase">Email</p>
                <p style="font-weight:600; margin-top:0.3rem">${p.email}</p>
            </div>
            <div>
                <p style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase">Organization</p>
                <p style="font-weight:600; margin-top:0.3rem">${p.org_name}</p>
            </div>
        </div>
    `;
}
async function deleteDeptAdmin(id) {
    if (!confirm('Permanently delete this dept admin?')) return;
    const { ok, data } = await apiDelete(`/org-admin/dept-admins/${id}`);
    if (ok) { loadDeptAdmins(); } else { showAlert('main-alert', data.message, 'error'); }
}
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('nav-user-name').textContent = user.full_name;
    loadOrgAdminProfile();
    loadSettings();
    loadDepartments();
    loadSections();
    loadRoles();
    loadLeaveTypes();
    loadEntitlements();
    loadWorkDays();
    loadHolidays();
    loadDeptAdmins();
    loadAllStaff();
});