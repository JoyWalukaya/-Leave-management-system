const express = require('express');
const router = express.Router();
const { verifyStaff } = require('../middleware/authMiddleware');
const {
    getMyProfile,
    getMyLeaveBalances,
    getAvailableLeaveTypes,
    getDeptStaffForActing,
    calculateDaysPreview,
    applyForLeave,
    getMyApplications,
    cancelApplication,
    requestLeaveSwitch
} = require('../controllers/staffController');

router.get('/profile', verifyStaff, getMyProfile);
router.get('/balances', verifyStaff, getMyLeaveBalances);
router.get('/leave-types', verifyStaff, getAvailableLeaveTypes);
router.get('/dept-staff', verifyStaff, getDeptStaffForActing);
router.get('/days-preview', verifyStaff, calculateDaysPreview);
router.post('/apply', verifyStaff, applyForLeave);
router.get('/applications', verifyStaff, getMyApplications);
router.patch('/applications/cancel/:application_id', verifyStaff, cancelApplication);
router.post('/switch', verifyStaff, requestLeaveSwitch);

module.exports = router;