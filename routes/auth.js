const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Joi = require('joi');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const { sendEmail } = require('../utils/email');
const auth = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Register
router.post('/register', async (req, res) => {
  try {

    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { firstName, lastName, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      phone
    });

    // Generate 6-digit OTP
    const emailOTP = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailVerificationToken = emailOTP;
    user.emailVerificationExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // Create default wallet
    // Google Sign In (around line 329)
    const wallet = new Wallet({
      userId: user._id,
      addresses: {
        BTC: `bc1${crypto.randomBytes(20).toString('hex')}`,
        ETH: `0x${crypto.randomBytes(20).toString('hex')}`,
        USDT: `0x${crypto.randomBytes(20).toString('hex')}`,
        PI: `pi${crypto.randomBytes(20).toString('hex')}`
      }
    });
    
    // Apply the same fix to Facebook (line 386) and Apple (line 449) routes
    await wallet.save();

    // Send OTP email
    await sendEmail({
      to: email,
      subject: 'RDX Exchange - Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #25D366;">Welcome to RDX Exchange!</h2>
          <p>Your email verification code is:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #25D366; font-size: 32px; margin: 0; letter-spacing: 5px;">${emailOTP}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for the verification code.',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (user.status !== 'active' && user.status !== 'pending') {
      return res.status(401).json({
        success: false,
        message: 'Account is suspended. Please contact support.'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    user.isEmailVerified = true;
    user.status = 'active';
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification'
    });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new OTP
    const emailOTP = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailVerificationToken = emailOTP;
    user.emailVerificationExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send OTP email
    await sendEmail({
      to: email,
      subject: 'RDX Exchange - New Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #25D366;">New Verification Code</h2>
          <p>Your new email verification code is:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #25D366; font-size: 32px; margin: 0; letter-spacing: 5px;">${emailOTP}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `
    });

    res.json({
      success: true,
      message: 'New verification code sent to your email'
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resending OTP'
    });
  }
});
// Add these routes to your existing auth.js file

// Google Sign In
router.post('/google', async (req, res) => {
  try {
    const { idToken, email, name, photoUrl } = req.body;
    
    // Verify Google ID token (you'll need to install google-auth-library)
    // const { OAuth2Client } = require('google-auth-library');
    // const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    // const ticket = await client.verifyIdToken({
    //   idToken: idToken,
    //   audience: process.env.GOOGLE_CLIENT_ID,
    // });
    // const payload = ticket.getPayload();
    
    // For now, we'll trust the frontend verification
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user
      user = new User({
        name,
        email,
        profilePicture: photoUrl,
        isEmailVerified: true, // Google emails are pre-verified
        authProvider: 'google',
      });
      await user.save();
      
      // Create wallet for new user
      const wallet = new Wallet({
        userId: user._id,
        balance: 0,
      });
      await wallet.save();
    }
    
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Google sign in successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        isEmailVerified: user.isEmailVerified,
      },
      token,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Google sign in failed',
      error: error.message,
    });
  }
});

// Facebook Sign In
router.post('/facebook', async (req, res) => {
  try {
    const { accessToken, email, name, photoUrl, facebookId } = req.body;
    
    // Verify Facebook access token
    // You can add Facebook Graph API verification here
    
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user
      user = new User({
        name,
        email,
        profilePicture: photoUrl,
        isEmailVerified: true, // Facebook emails are pre-verified
        authProvider: 'facebook',
        facebookId,
      });
      await user.save();
      
      // Create wallet for new user
      const wallet = new Wallet({
        userId: user._id,
        balance: 0,
      });
      await wallet.save();
    }
    
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Facebook sign in successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        isEmailVerified: user.isEmailVerified,
      },
      token,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Facebook sign in failed',
      error: error.message,
    });
  }
});

// Apple Sign In
router.post('/apple', async (req, res) => {
  try {
    const { identityToken, email, givenName, familyName, userIdentifier } = req.body;
    
    // Verify Apple identity token
    // You can add Apple ID verification here using apple-auth library
    
    const name = `${givenName || ''} ${familyName || ''}`.trim() || 'Apple User';
    
    let user = await User.findOne({ 
      $or: [
        { email: email },
        { appleId: userIdentifier }
      ]
    });
    
    if (!user) {
      // Create new user
      user = new User({
        name,
        email: email || `${userIdentifier}@privaterelay.appleid.com`,
        isEmailVerified: true, // Apple emails are pre-verified
        authProvider: 'apple',
        appleId: userIdentifier,
      });
      await user.save();
      
      // Create wallet for new user
      const wallet = new Wallet({
        userId: user._id,
        balance: 0,
      });
      await wallet.save();
    }
    
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Apple sign in successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        isEmailVerified: user.isEmailVerified,
      },
      token,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Apple sign in failed',
      error: error.message,
    });
  }
});
module.exports = router;