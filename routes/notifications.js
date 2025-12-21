const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');
const logger = require('../utils/logger');

const router = express.Router();

// Test notifications
router.post('/test', authenticateToken, async (req, res, next) => {
  try {
    const { type, recipient } = req.body;

    if (!type || !['email', 'whatsapp', 'telegram', 'sms'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification type'
      });
    }

    const testMessage = {
      title: 'Test Notification',
      message: 'This is a test notification from BLS Appointment Monitor',
      slotDate: new Date(),
      center: 'Test Center'
    };

    let result;
    switch (type) {
      case 'email':
        result = await NotificationService.sendEmail(recipient || req.user.email, testMessage);
        break;
      case 'whatsapp':
        result = await NotificationService.sendWhatsApp(recipient, testMessage);
        break;
      case 'telegram':
        result = await NotificationService.sendTelegram(recipient, testMessage);
        break;
      case 'sms':
        result = await NotificationService.sendSMS(recipient, testMessage);
        break;
    }

    res.json({
      success: true,
      message: 'Test notification sent',
      result
    });
  } catch (error) {
    logger.error('Test notification error:', error);
    next(error);
  }
});

module.exports = router;


