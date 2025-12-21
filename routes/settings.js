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
  body('emailAddress').optional().isEmail(),
  body('whatsappNumber').optional().isMobilePhone(),
  body('phoneNumber').optional().isMobilePhone(),
  body('telegramChatId').optional().isString(),
  body('captchaApiKey').optional().isString(),
  body('captchaEnabled').optional().isBoolean(),
  body('paymentMethod').optional().isIn(['credit_card', 'debit_card', 'none'])
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
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
    if (req.body.emailAddress) updateData.email_address = req.body.emailAddress;
    if (req.body.whatsappNumber) updateData.whatsapp_number = req.body.whatsappNumber;
    if (req.body.phoneNumber) updateData.phone_number = req.body.phoneNumber;
    if (req.body.telegramChatId) updateData.telegram_chat_id = req.body.telegramChatId;
    if (req.body.captchaApiKey) updateData.captcha_api_key = req.body.captchaApiKey;
    if (req.body.captchaEnabled !== undefined) updateData.captcha_enabled = req.body.captchaEnabled;
    if (req.body.paymentMethod) updateData.payment_method = req.body.paymentMethod;

    await settings.update(updateData);

    logger.info(`Settings updated for user: ${req.user.id}`);

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


