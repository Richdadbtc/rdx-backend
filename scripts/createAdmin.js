const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      console.log('Admin user already exists');
      return;
    }

    const admin = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@rdxexchange.com',
      password: 'admin123',
      role: 'admin',
      status: 'active',
      isEmailVerified: true
    });

    await admin.save();
    console.log('Admin user created successfully');
    console.log('Email: admin@rdxexchange.com');
    console.log('Password: admin123');
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    mongoose.disconnect();
  }
}

createAdmin();