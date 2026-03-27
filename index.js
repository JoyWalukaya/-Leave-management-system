const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const authRoutes = require('./routes/auth');
const superAdminRoutes = require('./routes/superAdmin');
const orgAdminRoutes = require('./routes/orgAdmin');
const deptAdminRoutes = require('./routes/deptAdmin');
const staffRoutes = require('./routes/staff');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/org-admin', orgAdminRoutes);
app.use('/api/dept-admin', deptAdminRoutes);
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