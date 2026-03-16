const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const staffRoutes = require('./routes/staff');
const db = require('./config/db');

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);

// Test route
app.get('/', (req, res) => {
    res.send('Leave Management System API is running...');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});