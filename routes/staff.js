const express = require('express');
const router = express.Router();
const { verifyStaff } = require('../middleware/authMiddleware');
const {
    getMyProfile,
    getMyLeaveBalances,
    getAvailableLeaveTypes,
    applyForLeave,
    getMyApplications,
    cancelApplication,
    requestLeaveSwitch
} = require('../controllers/staffController');

// Get my profile
router.get('/profile', verifyStaff, getMyProfile);

// Get my leave balances
router.get('/balances', verifyStaff, getMyLeaveBalances);

// Get available leave types (filtered by gender)
router.get('/leave-types', verifyStaff, getAvailableLeaveTypes);

// Apply for leave
router.post('/apply', verifyStaff, applyForLeave);

// Get my applications
router.get('/applications', verifyStaff, getMyApplications);

// Cancel an application
router.patch('/applications/cancel/:application_id', verifyStaff, cancelApplication);

// Request leave switch
router.post('/switch', verifyStaff, requestLeaveSwitch);

module.exports = router;