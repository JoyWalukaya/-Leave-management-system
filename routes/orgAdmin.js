const express = require('express');
const router = express.Router();
const { verifyOrgAdmin } = require('../middleware/authMiddleware');
const {
    getOrgAdminProfile,
    getOrgSettings,
    saveOrgSettings,
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getSections,
    createSection,
    updateSection,
    deleteSection,
    getRoles,
    createRole,
    updateRole,
    deleteRole,
    getLeaveTypes,
    createLeaveType,
    updateLeaveType,
    deleteLeaveType,
    getLeaveEntitlements,
    saveLeaveEntitlement,
    deleteLeaveEntitlement,
    getWorkDays,
    saveWorkDays,
    getPublicHolidays,
    createPublicHoliday,
    updatePublicHoliday,
    deletePublicHoliday,
    getDeptAdmins,
    createDeptAdmin,
    deactivateDeptAdmin,
    reactivateDeptAdmin,
    deleteDeptAdmin,
    getAllStaff
} = require('../controllers/orgAdminController');

router.get('/profile', verifyOrgAdmin, getOrgAdminProfile);
router.get('/settings', verifyOrgAdmin, getOrgSettings);
router.post('/settings', verifyOrgAdmin, saveOrgSettings);
router.get('/departments', verifyOrgAdmin, getDepartments);
router.post('/departments', verifyOrgAdmin, createDepartment);
router.patch('/departments/:dept_id', verifyOrgAdmin, updateDepartment);
router.delete('/departments/:dept_id', verifyOrgAdmin, deleteDepartment);
router.get('/sections', verifyOrgAdmin, getSections);
router.post('/sections', verifyOrgAdmin, createSection);
router.patch('/sections/:section_id', verifyOrgAdmin, updateSection);
router.delete('/sections/:section_id', verifyOrgAdmin, deleteSection);
router.get('/roles', verifyOrgAdmin, getRoles);
router.post('/roles', verifyOrgAdmin, createRole);
router.patch('/roles/:role_id', verifyOrgAdmin, updateRole);
router.delete('/roles/:role_id', verifyOrgAdmin, deleteRole);
router.get('/leave-types', verifyOrgAdmin, getLeaveTypes);
router.post('/leave-types', verifyOrgAdmin, createLeaveType);
router.patch('/leave-types/:leave_type_id', verifyOrgAdmin, updateLeaveType);
router.delete('/leave-types/:leave_type_id', verifyOrgAdmin, deleteLeaveType);
router.get('/leave-entitlements', verifyOrgAdmin, getLeaveEntitlements);
router.post('/leave-entitlements', verifyOrgAdmin, saveLeaveEntitlement);
router.delete('/leave-entitlements/:entitlement_id', verifyOrgAdmin, deleteLeaveEntitlement);
router.get('/work-days', verifyOrgAdmin, getWorkDays);
router.post('/work-days', verifyOrgAdmin, saveWorkDays);
router.get('/public-holidays', verifyOrgAdmin, getPublicHolidays);
router.post('/public-holidays', verifyOrgAdmin, createPublicHoliday);
router.patch('/public-holidays/:holiday_id', verifyOrgAdmin, updatePublicHoliday);
router.delete('/public-holidays/:holiday_id', verifyOrgAdmin, deletePublicHoliday);
router.get('/dept-admins', verifyOrgAdmin, getDeptAdmins);
router.post('/dept-admins', verifyOrgAdmin, createDeptAdmin);
router.patch('/dept-admins/deactivate/:dept_admin_id', verifyOrgAdmin, deactivateDeptAdmin);
router.patch('/dept-admins/reactivate/:dept_admin_id', verifyOrgAdmin, reactivateDeptAdmin);
router.delete('/dept-admins/:dept_admin_id', verifyOrgAdmin, deleteDeptAdmin);
router.get('/staff', verifyOrgAdmin, getAllStaff);

module.exports = router;