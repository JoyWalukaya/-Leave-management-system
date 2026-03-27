const express = require('express');
const router = express.Router();
const { verifyStaff } = require('../middleware/authMiddleware');
const {
    getMyProfile,
    getMyLeaveBalances,
    getAvailableLeaveTypes,
    getDeptStaffForActing,
    applyForLeave,
    getMyApplications,
    cancelApplication,
    requestLeaveSwitch
} = require('../controllers/staffController');

// Profile and balances
router.get('/profile', verifyStaff, getMyProfile);
router.get('/balances', verifyStaff, getMyLeaveBalances);
router.get('/leave-types', verifyStaff, getAvailableLeaveTypes);
router.get('/dept-staff', verifyStaff, getDeptStaffForActing);

// Leave applications
router.post('/apply', verifyStaff, applyForLeave);
router.get('/applications', verifyStaff, getMyApplications);
router.patch('/applications/cancel/:application_id', verifyStaff, cancelApplication);

// Leave switch
router.post('/switch', verifyStaff, requestLeaveSwitch);

module.exports = router;