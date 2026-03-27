const express = require('express');
const router = express.Router();
const { verifyDeptAdmin } = require('../middleware/authMiddleware');
const {
    getDeptAdminProfile,
    getDeptRoles,
    getDeptSections,
    getDeptStaff,
    createStaff,
    updateStaff,
    deactivateStaff,
    deleteStaff,
    sendStaffEmail,
    getLeaveApplications,
    reviewApplication,
    getStaffOnLeave,
    getLeaveSwitches,
    reviewLeaveSwitch
} = require('../controllers/deptAdminController');

router.get('/profile', verifyDeptAdmin, getDeptAdminProfile);
router.get('/roles', verifyDeptAdmin, getDeptRoles);
router.get('/sections', verifyDeptAdmin, getDeptSections);
router.get('/staff', verifyDeptAdmin, getDeptStaff);
router.post('/staff', verifyDeptAdmin, createStaff);
router.patch('/staff/deactivate/:staff_id', verifyDeptAdmin, deactivateStaff);
router.delete('/staff/:staff_id', verifyDeptAdmin, deleteStaff);
router.patch('/staff/:staff_id', verifyDeptAdmin, updateStaff);
router.post('/staff/send-email/:staff_id', verifyDeptAdmin, sendStaffEmail);
router.get('/applications', verifyDeptAdmin, getLeaveApplications);
router.patch('/applications/review/:application_id', verifyDeptAdmin, reviewApplication);
router.get('/on-leave', verifyDeptAdmin, getStaffOnLeave);
router.get('/switches', verifyDeptAdmin, getLeaveSwitches);
router.patch('/switches/review/:switch_id', verifyDeptAdmin, reviewLeaveSwitch);

module.exports = router;