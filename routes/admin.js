const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middleware/authMiddleware');
const {
    addStaffToRegistry,
    getPendingStaff,
    activateStaff,
    getLeaveApplications,
    reviewApplication,
    getStaffOnLeave,
    getSections,
    getRoles,
    getStaffRegistry,
    getLeaveSwitchRequests,
    reviewLeaveSwitch
} = require('../controllers/adminController');

// Add staff number to registry
router.post('/registry/add', verifyAdmin, addStaffToRegistry);

// Get pending staff accounts
router.get('/staff/pending', verifyAdmin, getPendingStaff);

// Activate staff account
router.patch('/staff/activate/:staff_id', verifyAdmin, activateStaff);

// Get all leave applications for admin's department
router.get('/applications', verifyAdmin, getLeaveApplications);

// Approve or deny a leave application
router.patch('/applications/review/:application_id', verifyAdmin, reviewApplication);

// Get who is currently on leave per section
router.get('/on-leave', verifyAdmin, getStaffOnLeave);

// Get sections for admin's department
router.get('/sections', verifyAdmin, getSections);

// Get all roles
router.get('/roles', verifyAdmin, getRoles);

// Get staff registry with status
router.get('/registry', verifyAdmin, getStaffRegistry);

// Get leave switch requests
router.get('/switches', verifyAdmin, getLeaveSwitchRequests);

// Review leave switch request
router.patch('/switches/review/:switch_id', verifyAdmin, reviewLeaveSwitch);

module.exports = router;