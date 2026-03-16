const API = 'http://localhost:5000/api';

// AUTH CHECK
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

if (!token || !user || user.system_role !== 'staff') {
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

async function apiPatch(endpoint) {
    const response = await fetch(`${API}${endpoint}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.status === 401 || response.status === 403) {
        localStorage.clear();
        window.location.href = 'index.html';
        return { ok: false, data: {} };
    }

    return { ok: response.ok, data: await response.json() };
}

// LOAD PROFILE
async function loadProfile() {
    try {
        const data = await apiGet('/staff/profile');
        if (!data) return;
        const p = data.profile;

        document.getElementById('nav-user-name').textContent = p.full_name;

        document.getElementById('profile-content').innerHTML = `
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:1rem;">
                <div>
                    <p style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px">Staff Number</p>
                    <p style="font-weight:600; margin-top:0.3rem">${p.staff_number}</p>
                </div>
                <div>
                    <p style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px">Full Name</p>
                    <p style="font-weight:600; margin-top:0.3rem">${p.full_name}</p>
                </div>
                <div>
                    <p style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px">Email</p>
                    <p style="font-weight:600; margin-top:0.3rem">${p.email}</p>
                </div>
                <div>
                    <p style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px">Gender</p>
                    <p style="font-weight:600; margin-top:0.3rem; text-transform:capitalize">${p.gender}</p>
                </div>
                <div>
                    <p style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px">Section</p>
                    <p style="font-weight:600; margin-top:0.3rem">${p.section_name}</p>
                </div>
                <div>
                    <p style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px">Department</p>
                    <p style="font-weight:600; margin-top:0.3rem">${p.department_name}</p>
                </div>
                <div>
                    <p style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px">Role</p>
                    <p style="font-weight:600; margin-top:0.3rem">${p.role_name}</p>
                </div>
                <div>
                    <p style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px">Date Joined</p>
                    <p style="font-weight:600; margin-top:0.3rem">${p.date_joined}</p>
                </div>
                <div>
                    <p style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.5px">Status</p>
                    <p style="margin-top:0.3rem"><span class="badge badge-${p.status}">${p.status}</span></p>
                </div>
            </div>
        `;
    } catch (err) {
        console.error('Error loading profile:', err);
    }
}

// LOAD LEAVE BALANCES
async function loadBalances() {
    try {
        const data = await apiGet('/staff/balances');
        if (!data) return;
        const grid = document.getElementById('balances-grid');

        if (data.balances.length === 0) {
            grid.innerHTML = '<p style="color:var(--text-secondary)">No leave balances found.</p>';
            return;
        }

        grid.innerHTML = data.balances.map(b => `
            <div class="stat-card ${b.remaining_days == 0 ? 'red' : b.remaining_days <= 5 ? 'gold' : ''}">
                <div class="stat-number">${b.remaining_days}</div>
                <div class="stat-label">${b.leave_type}</div>
                <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.3rem">
                    ${b.used_days} used of ${b.total_days}
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error loading balances:', err);
    }
}

// LOAD RECENT APPLICATIONS
async function loadRecentApplications() {
    try {
        const data = await apiGet('/staff/applications');
        if (!data) return;
        const tbody = document.getElementById('recent-applications');

        if (data.applications.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-secondary)">No applications yet.</td></tr>';
            return;
        }

        const recent = data.applications.slice(0, 5);
        tbody.innerHTML = recent.map(a => `
            <tr>
                <td>${a.leave_type}</td>
                <td>${a.start_date}</td>
                <td>${a.end_date}</td>
                <td>${a.total_working_days}</td>
                <td><span class="badge badge-${a.status}">${a.status}</span></td>
            </tr>
        `).join('');

        const activeLeave = data.applications.find(a =>
            a.status === 'approved' &&
            new Date(a.start_date) <= new Date() &&
            new Date(a.end_date) >= new Date()
        );

        if (activeLeave) startCountdown(activeLeave);

    } catch (err) {
        console.error('Error loading applications:', err);
    }
}

// COUNTDOWN TIMER
function startCountdown(leave) {
    const container = document.getElementById('countdown-container');
    container.style.display = 'block';
    document.getElementById('countdown-leave-type').textContent = leave.leave_type;
    document.getElementById('countdown-dates').textContent =
        `${leave.start_date} → ${leave.end_date}`;

    function update() {
        const now = new Date();
        const end = new Date(leave.end_date);
        end.setHours(23, 59, 59, 999);
        const diff = end - now;

        if (diff <= 0) {
            container.style.display = 'none';
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        document.getElementById('cd-days').textContent = String(days).padStart(2, '0');
        document.getElementById('cd-hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('cd-minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('cd-seconds').textContent = String(seconds).padStart(2, '0');
    }

    update();
    setInterval(update, 1000);
}

// LOAD LEAVE TYPES FOR APPLY
async function loadLeaveTypes() {
    try {
        const data = await apiGet('/staff/leave-types');
        if (!data) return;
        const select = document.getElementById('apply-leave-type');

        data.leave_types.forEach(lt => {
            const option = document.createElement('option');
            option.value = lt.id;
            option.textContent = lt.name;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('Error loading leave types:', err);
    }
}

// CHECK LEAVE BALANCE ON SELECT
async function checkLeaveBalance() {
    const leaveTypeId = document.getElementById('apply-leave-type').value;
    const infoDiv = document.getElementById('balance-info');
    const infoText = document.getElementById('balance-info-text');

    if (!leaveTypeId) {
        infoDiv.style.display = 'none';
        return;
    }

    try {
        const data = await apiGet('/staff/balances');
        if (!data) return;

        const leaveTypeSelect = document.getElementById('apply-leave-type');
        const leaveTypeName = leaveTypeSelect.options[leaveTypeSelect.selectedIndex].text;
        const matchedBalance = data.balances.find(b => b.leave_type === leaveTypeName);

        if (matchedBalance) {
            infoDiv.style.display = 'block';
            infoText.textContent = `You have ${matchedBalance.remaining_days} days remaining for ${leaveTypeName}.`;
        }
    } catch (err) {
        console.error('Error checking balance:', err);
    }
}

// CALCULATE DAYS PREVIEW
function calculateDays() {
    const startDate = document.getElementById('apply-start-date').value;
    const endDate = document.getElementById('apply-end-date').value;
    const preview = document.getElementById('days-preview');
    const previewText = document.getElementById('days-preview-text');

    if (startDate && endDate) {
        if (new Date(endDate) < new Date(startDate)) {
            preview.style.display = 'block';
            previewText.textContent = 'End date cannot be before start date.';
            return;
        }
        preview.style.display = 'block';
        previewText.textContent = `Selected: ${startDate} to ${endDate}. Exact working days calculated on submission.`;
    }
}

// APPLY FOR LEAVE
async function applyForLeave() {
    const leave_type_id = document.getElementById('apply-leave-type').value;
    const start_date = document.getElementById('apply-start-date').value;
    const end_date = document.getElementById('apply-end-date').value;
    const reason = document.getElementById('apply-reason').value.trim();

    if (!leave_type_id || !start_date || !end_date || !reason) {
        showAlert('apply-alert', 'Please fill in all fields.', 'error');
        return;
    }

    if (new Date(end_date) < new Date(start_date)) {
        showAlert('apply-alert', 'End date cannot be before start date.', 'error');
        return;
    }

    const { ok, data } = await apiPost('/staff/apply', {
        leave_type_id: parseInt(leave_type_id),
        start_date,
        end_date,
        reason
    });

    if (ok) {
        showAlert('apply-alert',
            `Application submitted! Total working days: ${data.total_working_days}`,
            'success'
        );
        document.getElementById('apply-leave-type').value = '';
        document.getElementById('apply-start-date').value = '';
        document.getElementById('apply-end-date').value = '';
        document.getElementById('apply-reason').value = '';
        document.getElementById('balance-info').style.display = 'none';
        document.getElementById('days-preview').style.display = 'none';
        loadBalances();
    } else {
        showAlert('apply-alert', data.message, 'error');
    }
}

// LOAD ALL APPLICATIONS
async function loadAllApplications() {
    try {
        const data = await apiGet('/staff/applications');
        if (!data) return;
        const tbody = document.getElementById('applications-table');

        if (data.applications.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-secondary)">No applications yet.</td></tr>';
            return;
        }

        tbody.innerHTML = data.applications.map(a => `
            <tr>
                <td>${a.leave_type}</td>
                <td>${a.start_date}</td>
                <td>${a.end_date}</td>
                <td>${a.total_working_days}</td>
                <td><span class="badge badge-${a.status}">${a.status}</span></td>
                <td>${a.admin_comment || '-'}</td>
                <td>
                    ${a.status === 'pending' ?
                        `<button class="btn btn-danger" style="padding:0.3rem 0.8rem; font-size:0.8rem"
                            onclick="cancelApplication(${a.id})">Cancel</button>` :
                        '-'
                    }
                </td>
                <td>
                    ${a.status === 'approved' ?
                        `<button class="btn btn-gold" style="padding:0.3rem 0.8rem; font-size:0.8rem"
                            onclick="openSwitchModal(${a.id}, '${a.leave_type}', '${a.start_date}', '${a.end_date}')">Switch Leave</button>` :
                        '-'
                    }
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error loading applications:', err);
    }
}

// CANCEL APPLICATION
async function cancelApplication(id) {
    if (!confirm('Are you sure you want to cancel this application?')) return;

    const { ok, data } = await apiPatch(`/staff/applications/cancel/${id}`);

    if (ok) {
        showAlert('main-alert', 'Application cancelled successfully.', 'success');
        loadAllApplications();
    } else {
        showAlert('main-alert', data.message, 'error');
    }
}

// OPEN SWITCH MODAL
function openSwitchModal(applicationId, currentLeaveType, startDate, endDate) {
    document.getElementById('switch-original-id').value = applicationId;
    document.getElementById('switch-original-end').value = endDate;
    document.getElementById('switch-date').value = '';
    document.getElementById('switch-new-end-date').value = '';
    document.getElementById('switch-reason').value = '';
    document.getElementById('switch-balance-info').style.display = 'none';

    // Set min and max for switch date
    const switchDateInput = document.getElementById('switch-date');
    const today = new Date().toISOString().split('T')[0];
    switchDateInput.min = startDate > today ? startDate : today;
    switchDateInput.max = endDate;

    // Update new end date min when switch date changes
    document.getElementById('switch-date').onchange = function() {
        const switchDate = this.value;
        if (switchDate) {
            document.getElementById('switch-new-end-date').min = switchDate;
            const currentEndDate = document.getElementById('switch-new-end-date').value;
            if (currentEndDate && currentEndDate < switchDate) {
                document.getElementById('switch-new-end-date').value = '';
            }
        }
        checkSwitchBalance();
    };

    // Populate leave types dropdown excluding current leave type
    const select = document.getElementById('switch-leave-type');
    select.innerHTML = '<option value="">Select new leave type</option>';

    apiGet('/staff/leave-types').then(data => {
        if (!data) return;
        data.leave_types
            .filter(lt => lt.name !== currentLeaveType)
            .forEach(lt => {
                const option = document.createElement('option');
                option.value = lt.id;
                option.textContent = lt.name;
                select.appendChild(option);
            });
    });

    const modal = document.getElementById('switch-modal');
    modal.style.display = 'flex';
}

// CHECK SWITCH BALANCE
async function checkSwitchBalance() {
    const leaveTypeId = document.getElementById('switch-leave-type').value;
    const infoDiv = document.getElementById('switch-balance-info');

    if (!leaveTypeId) {
        infoDiv.style.display = 'none';
        return;
    }

    try {
        const data = await apiGet('/staff/balances');
        if (!data) return;

        const leaveTypeSelect = document.getElementById('switch-leave-type');
        const leaveTypeName = leaveTypeSelect.options[leaveTypeSelect.selectedIndex].text;
        const matchedBalance = data.balances.find(b => b.leave_type === leaveTypeName);

        if (matchedBalance) {
            infoDiv.style.display = 'block';
            infoDiv.innerHTML = `
                <strong>${leaveTypeName}</strong>: 
                ${matchedBalance.remaining_days} days remaining
            `;
        }
    } catch (err) {
        console.error('Error checking switch balance:', err);
    }
}

// CLOSE SWITCH MODAL
function closeSwitchModal() {
    document.getElementById('switch-modal').style.display = 'none';
}

// SUBMIT LEAVE SWITCH
async function submitLeaveSwitch() {
    const original_application_id = document.getElementById('switch-original-id').value;
    const new_leave_type_id = document.getElementById('switch-leave-type').value;
    const switch_date = document.getElementById('switch-date').value;
    const new_end_date = document.getElementById('switch-new-end-date').value;
    const reason = document.getElementById('switch-reason').value.trim();

    if (!new_leave_type_id || !switch_date || !new_end_date || !reason) {
        showAlert('main-alert', 'Please fill in all fields.', 'error');
        closeSwitchModal();
        return;
    }

    if (new_end_date < switch_date) {
        showAlert('main-alert', 'New end date cannot be before switch date.', 'error');
        closeSwitchModal();
        return;
    }

    const { ok, data } = await apiPost('/staff/switch', {
        original_application_id: parseInt(original_application_id),
        new_leave_type_id: parseInt(new_leave_type_id),
        switch_date,
        new_end_date,
        reason
    });

    if (ok) {
        closeSwitchModal();
        showAlert('main-alert', 'Leave switch request submitted. Waiting for admin approval.', 'success');
        loadAllApplications();
    } else {
        closeSwitchModal();
        showAlert('main-alert', data.message, 'error');
    }
}

// INITIALIZE PAGE
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    loadBalances();
    loadRecentApplications();
    loadLeaveTypes();
    loadAllApplications();
});