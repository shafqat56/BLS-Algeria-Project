const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');
const { Settings } = require('../models');
const logger = require('../utils/logger');

const router = express.Router();

// Get notification status/configuration
router.get('/status', authenticateToken, async (req, res, next) => {
  try {
    const settings = await Settings.findOne({ where: { user_id: req.user.id } });
    
    if (!settings) {
      return res.json({
        success: true,
        configured: false,
        message: 'No settings found. Please configure your notification settings.',
        channels: {
          email: { enabled: false, configured: false },
          whatsapp: { enabled: false, configured: false },
          telegram: { enabled: false, configured: false },
          sms: { enabled: false, configured: false }
        }
      });
    }

    // Check if services are configured in environment
    const emailConfigured = !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
    const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
    const telegramConfigured = !!process.env.TELEGRAM_BOT_TOKEN;

    res.json({
      success: true,
      configured: true,
      channels: {
        email: {
          enabled: settings.email_notifications,
          configured: emailConfigured && !!settings.email_address,
          address: settings.email_address ? '***' + settings.email_address.slice(-4) : null
        },
        whatsapp: {
          enabled: settings.whatsapp_notifications,
          configured: twilioConfigured && !!settings.whatsapp_number,
          number: settings.whatsapp_number ? '***' + settings.whatsapp_number.slice(-4) : null,
          serviceConfigured: twilioConfigured
        },
        telegram: {
          enabled: settings.telegram_notifications,
          configured: telegramConfigured && !!settings.telegram_chat_id,
          chatId: settings.telegram_chat_id ? '***' + settings.telegram_chat_id.slice(-4) : null,
          serviceConfigured: telegramConfigured
        },
        sms: {
          enabled: settings.sms_notifications,
          configured: twilioConfigured && !!settings.phone_number,
          number: settings.phone_number ? '***' + settings.phone_number.slice(-4) : null,
          serviceConfigured: twilioConfigured
        }
      }
    });
  } catch (error) {
    logger.error('Get notification status error:', error);
    next(error);
  }
});

module.exports = router;


