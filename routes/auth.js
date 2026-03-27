const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');

// Single login route for all roles
router.post('/login', login);

module.exports = router;