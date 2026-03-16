const express = require('express');
const router = express.Router();
const { staffLogin, adminLogin, staffRegister, adminRegister } = require('../controllers/authController');

// Staff registration
router.post('/register', staffRegister);

// Staff login
router.post('/staff-login', staffLogin);

// Admin login
router.post('/admin-login', adminLogin);

// Admin registration
router.post('/admin-register', adminRegister);

module.exports = router;