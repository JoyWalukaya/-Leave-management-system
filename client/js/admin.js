const API = 'http://localhost:5000/api';
// AUTH CHECK
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

if (!token || !user || user.system_role !== 'admin') {
    window.location.href = 'index.html';
}

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

// SWITCH TABS
function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    btn.classList.add('active');
}

// ALERTS
function showAlert(id, message, type) {
    const alert = document.getElementById(id);
    alert.textContent = message;
    alert.className = `alert alert-${type} show`;
    setTimeout(() => { alert.className = 'alert'; }, 5000);
}

// LOGOUT
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// API HELPERS
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
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });

    if (response.status === 401 || response.status === 403) {
        localStorage.clear();
        window.location.href = 'index.html';
        return { ok: false, data: {} };
    }

    return { ok: response.ok, data: await response.json() };
}

// LOAD ADMIN NAME
async function loadAdminName() {
    const adminUser = JSON.parse(localStorage.getItem('user'));
    if (adminUser) {
        document.getElementById('nav-admin-name').textContent = adminUser.full_name;
    }
}

// LOAD LEAVE APPLICATIONS
async function loadApplications() {
    try {
        const data = await apiGet('/admin/applications');
        if (!data) return;
        const tbody = document.getElementById('applications-table');

        if (data.applications.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:var(--text-secondary)">No applications yet.</td></tr>';
            return;
        }

        tbody.innerHTML = data.applications.map(a => `
            <tr>
                <td>${a.staff_name}</td>
                <td>${a.staff_number}</td>
                <td>${a.section_name}</td>
<td>
    ${a.leave_type}
    ${a.is_switch ? '<span class="badge badge-pending" style="font-size:0.7rem; margin-left:0.3rem">Switch</span>' : ''}
</td>                <td>${a.start_date}</td>
                <td>${a.end_date}</td>
                <td>${a.total_working_days}</td>
                <td>${a.reason || '-'}</td>
                <td><span class="badge badge-${a.status}">${a.status}</span></td>
                <td>
                    ${a.status === 'pending' ? `
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

    } catch (err) {
        console.error('Error loading applications:', err);
    }
}

// LOAD STAFF ON LEAVE
async function loadStaffOnLeave() {
    try {
        const data = await apiGet('/admin/on-leave');
        if (!data) return;
        const tbody = document.getElementById('onleave-table');

        if (data.staff_on_leave.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-secondary)">No staff currently on leave.</td></tr>';
            return;
        }

        tbody.innerHTML = data.staff_on_leave.map(s => `
            <tr>
                <td>${s.full_name}</td>
                <td>${s.staff_number}</td>
                <td>${s.section_name}</td>
                <td>${s.leave_type}</td>
                <td>${s.start_date}</td>
                <td>${s.end_date}</td>
                <td>${s.total_working_days}</td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Error loading staff on leave:', err);
    }
}

// LOAD PENDING STAFF
async function loadPendingStaff() {
    try {
        const data = await apiGet('/admin/staff/pending');
        if (!data) return;
        const tbody = document.getElementById('pending-table');

        if (data.pending_staff.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-secondary)">No pending accounts.</td></tr>';
            return;
        }

        tbody.innerHTML = data.pending_staff.map(s => `
            <tr>
                <td>${s.staff_number}</td>
                <td>${s.full_name}</td>
                <td>${s.email}</td>
                <td style="text-transform:capitalize">${s.gender}</td>
                <td>${s.section_name}</td>
                <td>${s.role_name}</td>
                <td>${s.date_joined}</td>
                <td>
                    <button class="btn btn-success" style="padding:0.3rem 0.8rem; font-size:0.8rem"
                        onclick="activateStaff(${s.id})">Activate</button>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Error loading pending staff:', err);
    }
}

// ACTIVATE STAFF
async function activateStaff(staffId) {
    if (!confirm('Activate this staff account?')) return;

    const { ok, data } = await apiPatch(`/admin/staff/activate/${staffId}`);

    if (ok) {
        showAlert('main-alert', 'Staff account activated successfully.', 'success');
        loadPendingStaff();
    } else {
        showAlert('main-alert', data.message, 'error');
    }
}

// MODAL - APPROVE/DENY
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
    const applicationId = document.getElementById('modal-application-id').value;
    const status = document.getElementById('modal-action').value;
    const admin_comment = document.getElementById('modal-comment').value.trim();

    const { ok, data } = await apiPatch(
        `/admin/applications/review/${applicationId}`,
        { status, admin_comment }
    );

    if (ok) {
        closeModal();
        showAlert('main-alert', `Application ${status} successfully.`, 'success');
        loadApplications();
        loadStaffOnLeave();
    } else {
        showAlert('main-alert', data.message, 'error');
    }
}

// LOAD SECTIONS AND ROLES FOR REGISTRY
async function loadSectionsAndRoles() {
    try {
        const [sectionsData, rolesData] = await Promise.all([
            apiGet('/admin/sections'),
            apiGet('/admin/roles')
        ]);

        if (!sectionsData || !rolesData) return;

        const sectionSelect = document.getElementById('reg-section');
        sectionsData.sections.forEach(s => {
            const option = document.createElement('option');
            option.value = s.id;
            option.textContent = s.name;
            sectionSelect.appendChild(option);
        });

        const roleSelect = document.getElementById('reg-role');
        rolesData.roles.forEach(r => {
            const option = document.createElement('option');
            option.value = r.id;
            option.textContent = r.name;
            roleSelect.appendChild(option);
        });

    } catch (err) {
        console.error('Error loading sections and roles:', err);
    }
}

// ADD TO REGISTRY
async function addToRegistry() {
    const staff_number = document.getElementById('reg-staff-number').value.trim();
    const section_id = document.getElementById('reg-section').value;
    const role_id = document.getElementById('reg-role').value;

    if (!staff_number || !section_id || !role_id) {
        showAlert('registry-alert', 'Please fill in all fields.', 'error');
        return;
    }

    const { ok, data } = await apiPost('/admin/registry/add', {
        staff_number,
        section_id: parseInt(section_id),
        role_id: parseInt(role_id)
    });

    if (ok) {
        showAlert('registry-alert', 'Staff number added to registry successfully.', 'success');
        document.getElementById('reg-staff-number').value = '';
        document.getElementById('reg-section').value = '';
        document.getElementById('reg-role').value = '';
    } else {
        showAlert('registry-alert', data.message, 'error');
    }
}
// LOAD STAFF REGISTRY
async function loadStaffRegistry() {
    try {
        const data = await apiGet('/admin/registry');
        if (!data) return;
        const tbody = document.getElementById('stafflist-table');

        if (data.registry.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--text-secondary)">No staff numbers in registry yet.</td></tr>';
            return;
        }

        tbody.innerHTML = data.registry.map(s => `
            <tr>
                <td>${s.staff_number}</td>
                <td>${s.full_name || '-'}</td>
                <td>${s.email || '-'}</td>
                <td style="text-transform:capitalize">${s.gender || '-'}</td>
                <td>${s.section_name}</td>
                <td>${s.role_name}</td>
                <td>${s.date_joined || '-'}</td>
                <td>
                    <span class="badge ${s.is_registered ? 'badge-approved' : 'badge-pending'}">
                        ${s.is_registered ? 'Registered' : 'Not Registered'}
                    </span>
                </td>
                <td>
                    ${s.account_status ?
                        `<span class="badge badge-${s.account_status}">${s.account_status}</span>` :
                        '-'
                    }
                </td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Error loading staff registry:', err);
    }
}

// LOAD LEAVE SWITCH REQUESTS
async function loadLeaveSwitches() {
    try {
        const data = await apiGet('/admin/switches');
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
                <td>${s.section_name}</td>
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

    } catch (err) {
        console.error('Error loading switches:', err);
    }
}

// SWITCH REVIEW MODAL
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

    const { ok, data } = await apiPatch(
        `/admin/switches/review/${switchId}`,
        { status, admin_comment }
    );

    if (ok) {
        closeSwitchReviewModal();
        showAlert('main-alert', `Leave switch ${status} successfully.`, 'success');
        loadLeaveSwitches();
        loadApplications();
        loadStaffOnLeave();
    } else {
        closeSwitchReviewModal();
        showAlert('main-alert', data.message, 'error');
    }
}
// INITIALIZE PAGE
document.addEventListener('DOMContentLoaded', () => {
    loadAdminName();
    loadApplications();
    loadStaffOnLeave();
    loadLeaveSwitches();
    loadPendingStaff();
    loadSectionsAndRoles();
    loadStaffRegistry();
});