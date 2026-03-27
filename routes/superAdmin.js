const express = require('express');
const router = express.Router();
const { verifySuperAdmin } = require('../middleware/authMiddleware');
const {
    getOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    getOrgAdmins,
    createOrgAdmin,
    deactivateOrgAdmin,
    reactivateOrgAdmin,
    deleteOrgAdmin,
    getSuperAdminOverview
} = require('../controllers/superAdminController');

router.get('/organizations', verifySuperAdmin, getOrganizations);
router.post('/organizations', verifySuperAdmin, createOrganization);
router.patch('/organizations/:org_id', verifySuperAdmin, updateOrganization);
router.delete('/organizations/:org_id', verifySuperAdmin, deleteOrganization);

router.get('/org-admins', verifySuperAdmin, getOrgAdmins);
router.post('/org-admins', verifySuperAdmin, createOrgAdmin);
router.patch('/org-admins/deactivate/:org_admin_id', verifySuperAdmin, deactivateOrgAdmin);
router.patch('/org-admins/reactivate/:org_admin_id', verifySuperAdmin, reactivateOrgAdmin);
router.delete('/org-admins/:org_admin_id', verifySuperAdmin, deleteOrgAdmin);

router.get('/overview', verifySuperAdmin, getSuperAdminOverview);

module.exports = router;