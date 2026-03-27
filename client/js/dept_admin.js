const API = 'http://localhost:5000/api';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

if (!token || !user || user.system_role !== 'dept_admin') {
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

// Load roles and sections for dropdowns
async function loadDropdowns() {
    const [rolesData, sectionsData] = await Promise.all([
        apiGet('/dept-admin/roles'),
        apiGet('/dept-admin/sections')
    ]);
    if (rolesData) {
        const roleSelect = document.getElementById('staff-role');
        roleSelect.innerHTML = '<option value="">Select role</option>';
        rolesData.roles.forEach(r => {
            const option = document.createElement('option');
            option.value = r.id;
            option.textContent = r.name;
            roleSelect.appendChild(option);
        });
    }
    if (sectionsData) {
        const sectionSelect = document.getElementById('staff-section');
        sectionSelect.innerHTML = '<option value="">No section</option>';
        sectionsData.sections.forEach(s => {
            const option = document.createElement('option');
            option.value = s.id;
            option.textContent = s.name;
            sectionSelect.appendChild(option);
        });
    }
}

// Load staff
async function loadStaff() {
    const data = await apiGet('/dept-admin/staff');
    if (!data) return;
    const tbody = document.getElementById('staff-table');
    if (data.staff.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-secondary)">No staff yet.</td></tr>';
        return;
    }
    tbody.innerHTML = data.staff.map(s => `
    <tr>
        <td>${s.staff_number}</td>
        <td>${s.full_name}</td>
        <td>${s.email || '-'}</td>
        <td>${s.section_name || '-'}</td>
        <td>${s.role_name}</td>
        <td><span class="badge badge-${s.status}">${s.status}</span></td>
        <td style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            ${s.status !== 'inactive' ? `
                <button class="btn btn-primary" style="padding:0.3rem 0.8rem; font-size:0.8rem"
                    onclick="sendEmail(${s.id})">Send Email</button>
                <button class="btn btn-danger" style="padding:0.3rem 0.8rem; font-size:0.8rem"
                    onclick="deactivateStaff(${s.id})">Deactivate</button>
            ` : `
                <button class="btn btn-danger" style="padding:0.3rem 0.8rem; font-size:0.8rem; background:#666"
                    onclick="deleteStaff(${s.id})">Delete</button>
            `}
        </td>
    </tr>
`).join('');
}

// Create staff
async function createStaff() {
    const staff_number = document.getElementById('staff-number').value.trim();
    const full_name = document.getElementById('staff-full-name').value.trim();
    const email = document.getElementById('staff-email').value.trim();
    const gender = document.getElementById('staff-gender').value;
    const role_id = document.getElementById('staff-role').value;
    const section_id = document.getElementById('staff-section').value;
    const date_joined = document.getElementById('staff-date-joined').value;

    if (!staff_number || !full_name || !gender || !role_id || !date_joined) {
        showAlert('staff-alert', 'Please fill in all required fields.', 'error');
        return;
    }

    const { ok, data } = await apiPost('/dept-admin/staff', {
        staff_number, full_name, email, gender,
        role_id, section_id: section_id || null, date_joined
    });

    if (ok) {
        showAlert('staff-alert', data.message, 'success');
        document.getElementById('staff-number').value = '';
        document.getElementById('staff-full-name').value = '';
        document.getElementById('staff-email').value = '';
        document.getElementById('staff-gender').value = '';
        document.getElementById('staff-role').value = '';
        document.getElementById('staff-section').value = '';
        document.getElementById('staff-date-joined').value = '';
        loadStaff();
    } else {
        showAlert('staff-alert', data.message, 'error');
    }
}

// Send email credentials to staff
async function sendEmail(staff_id) {
    if (!confirm('Send login credentials to this staff member? If credentials were previously sent they will be invalidated.')) return;

    const { ok, data } = await apiPost(`/dept-admin/staff/send-email/${staff_id}`, {});

    if (ok) {
        showAlert('main-alert', 'Credentials sent successfully.', 'success');
        loadStaff();
    } else {
        showAlert('main-alert', data.message, 'error');
    }
}

// Deactivate staff
async function deactivateStaff(staff_id) {
    if (!confirm('Deactivate this staff member?')) return;
    const { ok, data } = await apiPatch(`/dept-admin/staff/deactivate/${staff_id}`);
    if (ok) {
        showAlert('main-alert', 'Staff deactivated.', 'success');
        loadStaff();
    } else {
        showAlert('main-alert', data.message, 'error');
    }
}

// Load leave applications
async function loadApplications() {
    const data = await apiGet('/dept-admin/applications');
    if (!data) return;
    const tbody = document.getElementById('applications-table');
    if (data.applications.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; color:var(--text-secondary)">No applications yet.</td></tr>';
        return;
    }
    tbody.innerHTML = data.applications.map(a => `
        <tr>
            <td>${a.staff_name}</td>
            <td>${a.staff_number}</td>
            <td>${a.section_name || '-'}</td>
            <td>
                ${a.leave_type}
                ${a.is_switch ? '<span class="badge badge-pending" style="font-size:0.7rem; margin-left:0.3rem">Switch</span>' : ''}
            </td>
            <td>${a.start_date}</td>
            <td>${a.end_date}</td>
            <td>${a.total_working_days}</td>
            <td>${a.acting_staff_name || '-'}</td>
            <td>${a.reason || '-'}</td>
            <td><span class="badge badge-${a.status}">${a.status}</span></td>
            <td>
                ${a.status === 'pending' && !a.is_switch ? `
                    <div style="display:flex; gap:0.5rem;">
                        <button class="btn btn-success" style="padding:0.3rem 0.8rem; font-size:0.8rem"
                            onclick="openModal(${a.id}, 'approved')">Approve</button>
                        <button class="btn btn-danger" style="padding:0.3rem 0.8rem; font-size:0.8rem"
                            onclick="openModal(${a.id}, 'denied')">Deny</button>
                    </div>
                ` : '-'}
            </td>
        </tr>
    `).join('');
}

// Load staff on leave
async function loadStaffOnLeave() {
    const data = await apiGet('/dept-admin/on-leave');
    if (!data) return;
    const tbody = document.getElementById('onleave-table');
    if (data.staff_on_leave.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-secondary)">No staff currently on leave.</td></tr>';
        return;
    }
    tbody.innerHTML = data.staff_on_leave.map(s => `
        <tr>
            <td>${s.full_name}</td>
            <td>${s.staff_number}</td>
            <td>${s.section_name || '-'}</td>
            <td>${s.leave_type}</td>
            <td>${s.start_date}</td>
            <td>${s.end_date}</td>
            <td>${s.total_working_days}</td>
            <td>${s.acting_staff_name || '-'}</td>
        </tr>
    `).join('');
}

// Load leave switches
async function loadSwitches() {
    const data = await apiGet('/dept-admin/switches');
    if (!data) return;
    const tbody = document.getElementById('switches-table');
    if (data.switches.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--text-secondary)">No switch requests yet.</td></tr>';
        return;
    }
    tbody.innerHTML = data.switches.map(s => `
        <tr>
            <td>${s.staff_name}</td>
            <td>${s.staff_number}</td>
            <td>${s.section_name || '-'}</td>
            <td>${s.original_leave_type}<br>
                <small style="color:var(--text-secondary)">${s.original_start_date} → ${s.original_end_date}</small>
            </td>
            <td>${s.new_leave_type}<br>
                <small style="color:var(--text-secondary)">${s.new_start_date} → ${s.new_end_date}</small>
            </td>
            <td>${s.switch_date}</td>
            <td>${s.reason || '-'}</td>
            <td><span class="badge badge-${s.status}">${s.status}</span></td>
            <td>
                ${s.status === 'pending' ? `
                    <div style="display:flex; gap:0.5rem;">
                        <button class="btn btn-success" style="padding:0.3rem 0.8rem; font-size:0.8rem"
                            onclick="openSwitchReviewModal(${s.id}, 'approved')">Approve</button>
                        <button class="btn btn-danger" style="padding:0.3rem 0.8rem; font-size:0.8rem"
                            onclick="openSwitchReviewModal(${s.id}, 'denied')">Deny</button>
                    </div>
                ` : '-'}
            </td>
        </tr>
    `).join('');
}

// Review modal
function openModal(applicationId, action) {
    document.getElementById('modal-application-id').value = applicationId;
    document.getElementById('modal-action').value = action;
    document.getElementById('modal-comment').value = '';
    const modal = document.getElementById('review-modal');
    const title = document.getElementById('modal-title');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    title.textContent = action === 'approved' ? 'Approve Application' : 'Deny Application';
    confirmBtn.className = action === 'approved' ? 'btn btn-success' : 'btn btn-danger';
    confirmBtn.textContent = action === 'approved' ? 'Approve' : 'Deny';
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('review-modal').style.display = 'none';
}

async function confirmReview() {
    const application_id = document.getElementById('modal-application-id').value;
    const status = document.getElementById('modal-action').value;
    const admin_comment = document.getElementById('modal-comment').value.trim();
    const { ok, data } = await apiPatch(`/dept-admin/applications/review/${application_id}`, { status, admin_comment });
    if (ok) {
        closeModal();
        showAlert('main-alert', `Application ${status} successfully.`, 'success');
        loadApplications();
        loadStaffOnLeave();
    } else {
        closeModal();
        showAlert('main-alert', data.message, 'error');
    }
}

// Switch review modal
function openSwitchReviewModal(switchId, action) {
    document.getElementById('switch-review-id').value = switchId;
    document.getElementById('switch-review-action').value = action;
    document.getElementById('switch-review-comment').value = '';
    const modal = document.getElementById('switch-review-modal');
    const title = document.getElementById('switch-modal-title');
    const confirmBtn = document.getElementById('switch-review-confirm-btn');
    title.textContent = action === 'approved' ? 'Approve Leave Switch' : 'Deny Leave Switch';
    confirmBtn.className = action === 'approved' ? 'btn btn-success' : 'btn btn-danger';
    confirmBtn.textContent = action === 'approved' ? 'Approve' : 'Deny';
    modal.style.display = 'flex';
}

function closeSwitchReviewModal() {
    document.getElementById('switch-review-modal').style.display = 'none';
}

async function confirmSwitchReview() {
    const switchId = document.getElementById('switch-review-id').value;
    const status = document.getElementById('switch-review-action').value;
    const admin_comment = document.getElementById('switch-review-comment').value.trim();
    const { ok, data } = await apiPatch(`/dept-admin/switches/review/${switchId}`, { status, admin_comment });
    if (ok) {
        closeSwitchReviewModal();
        showAlert('main-alert', `Leave switch ${status} successfully.`, 'success');
        loadSwitches();
        loadApplications();
        loadStaffOnLeave();
    } else {
        closeSwitchReviewModal();
        showAlert('main-alert', data.message, 'error');
    }
}
async function loadDeptAdminProfile() {
    const data = await apiGet('/dept-admin/profile');
    if (!data) return;
    const p = data.profile;
    document.getElementById('dept-admin-title').textContent = `${p.dept_name} — ${p.org_name}`;
    document.getElementById('nav-user-name').textContent = p.full_name;
    document.getElementById('dept-admin-profile-content').innerHTML = `
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
                <p style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase">Department</p>
                <p style="font-weight:600; margin-top:0.3rem">${p.dept_name}</p>
            </div>
            <div>
                <p style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase">Organization</p>
                <p style="font-weight:600; margin-top:0.3rem">${p.org_name}</p>
            </div>
        </div>
    `;
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
async function deleteStaff(staff_id) {
    if (!confirm('Permanently delete this staff member?')) return;
    const { ok, data } = await apiDelete(`/dept-admin/staff/${staff_id}`);
    if (ok) {
        showAlert('main-alert', 'Staff deleted.', 'success');
        loadStaff();
    } else {
        showAlert('main-alert', data.message, 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('nav-user-name').textContent = user.full_name;
    loadDeptAdminProfile();
    loadDropdowns();
    loadStaff();
    loadApplications();
    loadStaffOnLeave();
    loadSwitches();
});