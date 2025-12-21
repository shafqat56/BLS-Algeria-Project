const express = require('express');
const { body, validationResult } = require('express-validator');
const { Settings } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get user settings
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    let settings = await Settings.findOne({
      where: { user_id: req.user.id }
    });

    // Create default settings if none exist
    if (!settings) {
      settings = await Settings.create({
        user_id: req.user.id
      });
    }

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    next(error);
  }
});

// Update settings
router.put('/', authenticateToken, [
  body('emailNotifications').optional().isBoolean(),
  body('whatsappNotifications').optional().isBoolean(),
  body('telegramNotifications').optional().isBoolean(),
  body('smsNotifications').optional().isBoolean(),
  body('emailAddress').optional().custom((value) => {
    if (value === '' || value === null || value === undefined) return true;
    return require('validator').isEmail(value);
  }),
  body('whatsappNumber').optional().custom((value) => {
    if (value === '' || value === null || value === undefined) return true;
    return true; // Accept any string for phone numbers
  }),
  body('phoneNumber').optional().custom((value) => {
    if (value === '' || value === null || value === undefined) return true;
    return true; // Accept any string for phone numbers
  }),
  body('telegramChatId').optional().isString(),
  body('captchaApiKey').optional().isString(),
  body('captchaEnabled').optional().isBoolean(),
  body('paymentMethod').optional().isIn(['credit_card', 'debit_card', 'none'])
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.error('Settings validation errors:', errors.array());
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    let settings = await Settings.findOne({
      where: { user_id: req.user.id }
    });

    if (!settings) {
      settings = await Settings.create({
        user_id: req.user.id
      });
    }

    // Update only provided fields
    const updateData = {};
    if (req.body.emailNotifications !== undefined) updateData.email_notifications = req.body.emailNotifications;
    if (req.body.whatsappNotifications !== undefined) updateData.whatsapp_notifications = req.body.whatsappNotifications;
    if (req.body.telegramNotifications !== undefined) updateData.telegram_notifications = req.body.telegramNotifications;
    if (req.body.smsNotifications !== undefined) updateData.sms_notifications = req.body.smsNotifications;
    
    // Handle string fields - allow empty strings to clear values
    if (req.body.emailAddress !== undefined) {
      updateData.email_address = req.body.emailAddress || null;
    }
    if (req.body.whatsappNumber !== undefined) {
      updateData.whatsapp_number = req.body.whatsappNumber || null;
    }
    if (req.body.phoneNumber !== undefined) {
      updateData.phone_number = req.body.phoneNumber || null;
    }
    if (req.body.telegramChatId !== undefined) {
      updateData.telegram_chat_id = req.body.telegramChatId || null;
    }
    if (req.body.captchaApiKey !== undefined) {
      updateData.captcha_api_key = req.body.captchaApiKey || null;
    }
    
    if (req.body.captchaEnabled !== undefined) updateData.captcha_enabled = req.body.captchaEnabled;
    if (req.body.paymentMethod !== undefined) updateData.payment_method = req.body.paymentMethod || 'none';

    await settings.update(updateData);

    // Reload to get decrypted values
    await settings.reload();

    logger.info(`Settings updated for user: ${req.user.id}`);

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    logger.error('Error updating settings:', error);
    next(error);
  }
});

module.exports = router;


