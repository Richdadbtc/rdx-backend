const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
// Security middleware
app.use(helmet());
// Update the CORS configuration around line 15
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3002', // Add admin dashboard
    'http://192.168.182.33:5000', 
    'http://192.168.182.33:3001',
    /^http:\/\/192\.168\.182\.33:\d+$/,
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Middleware
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve admin dashboard static files
app.use('/admin', express.static(path.join(__dirname, '../rdx-admin-html')));

// Admin dashboard route - serve index.html for admin routes
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../rdx-admin-html/index.html'));
});

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/trading', require('./routes/trading'));
app.use('/api/crypto', require('./routes/crypto'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/rewards', require('./routes/rewards'));
app.use('/api/admin', require('./routes/admin'));
// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Add this before the error handling middleware (around line 50)

// Development only - Clear database endpoint
if (process.env.NODE_ENV === 'development') {
  app.delete('/api/dev/clear-database', async (req, res) => {
    try {
      const User = require('./models/User');
      const Wallet = require('./models/Wallet');
      const Transaction = require('./models/Transaction');
      const Notification = require('./models/Notification');
      const Order = require('./models/Order');
      const Reward = require('./models/Reward');

      // Clear all collections
      await Promise.all([
        User.deleteMany({}),
        Wallet.deleteMany({}),
        Transaction.deleteMany({}),
        Notification.deleteMany({}),
        Order.deleteMany({}),
        Reward.deleteMany({})  
      ]);

      res.json({ 
        success: true, 
        message: 'Database cleared successfully' 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Error clearing database', 
        error: error.message 
      });
    }
  });
}
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 RDX Exchange Backend running on port ${PORT}`);
  console.log(`🌐 Server accessible at http://192.168.182.33:${PORT}`);
});


