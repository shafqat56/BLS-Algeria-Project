const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, Settings } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        error: 'User already exists' 
      });
    }

    // Create user
    const user = await User.create({
      email,
      password
    });

    // Create default settings for user
    await Settings.create({
      user_id: user.id,
      email_address: email
    });

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ 
      where: { email },
      attributes: { include: ['password'] }
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Update last login
    await user.update({ last_login: new Date() });

    // Generate token
    const token = user.generateToken();

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        subscriptionStatus: user.subscription_status,
        biometricEnabled: user.biometric_enabled
      }
    });
  } catch (error) {
    next(error);
  }
});

// Verify biometric (for Face ID / fingerprint)
router.post('/verify-biometric', authenticateToken, [
  body('biometricData').notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const user = await User.findByPk(req.user.id);
    
    if (!user.biometric_enabled) {
      return res.status(400).json({ 
        success: false, 
        error: 'Biometric authentication not enabled' 
      });
    }

    const isValid = user.verifyBiometric(req.body.biometricData);
    
    if (!isValid) {
      return res.status(401).json({ 
        success: false, 
        error: 'Biometric verification failed' 
      });
    }

    // Generate token on successful biometric verification
    const token = user.generateToken();

    res.json({
      success: true,
      token
    });
  } catch (error) {
    next(error);
  }
});

// Enable biometric
router.post('/enable-biometric', authenticateToken, [
  body('biometricData').notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const user = await User.findByPk(req.user.id);
    
    await user.update({
      biometric_enabled: true,
      biometric_data: req.body.biometricData
    });

    logger.info(`Biometric enabled for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Biometric authentication enabled'
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'biometric_data'] }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        subscriptionStatus: user.subscription_status,
        subscriptionExpiry: user.subscription_expiry,
        biometricEnabled: user.biometric_enabled,
        paymentMethod: user.payment_method,
        lastLogin: user.last_login,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


