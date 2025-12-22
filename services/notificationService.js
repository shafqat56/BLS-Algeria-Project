const nodemailer = require('nodemailer');
const axios = require('axios');
const { Settings } = require('../models');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    // Email transporter - only initialize if email config is provided
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false // For Gmail, sometimes needed
        }
      });
      
      // Verify connection on startup
      this.emailTransporter.verify((error, success) => {
        if (error) {
          logger.warn('Email transporter verification failed:', error.message);
          logger.warn('Please check your EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in .env file');
        } else {
          logger.info('Email transporter ready');
        }
      });
    } else {
      logger.warn('Email configuration missing. Email notifications will not work.');
      logger.warn('Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in .env file');
    }
  }

  async notifySlotFound(userId, data, io = null) {
    try {
      const settings = await Settings.findOne({ where: { user_id: userId } });
      
      if (!settings) {
        logger.warn(`No settings found for user ${userId}`);
        return;
      }

      // Format center name for display
      const centerLabels = {
        'algiers_1': 'Algiers 1',
        'algiers_2': 'Algiers 2',
        'algiers_3': 'Algiers 3',
        'algiers_4': 'Algiers 4',
        'oran_1': 'Oran 1',
        'oran_2': 'Oran 2',
        'oran_3': 'Oran 3'
      };
      const centerDisplayName = centerLabels[data.center] || data.center;

      // Prepare notification data with formatted slots
      const notificationData = {
        title: '🎉 BLS Appointment Slot Available!',
        message: `Found ${data.slots.length} appointment slot(s) at ${centerDisplayName}`,
        slots: data.slots,
        center: centerDisplayName,
        centerCode: data.center,
        profileName: data.profileName,
        slotDate: data.slots[0]?.date,
        slotCount: data.slots.length,
        formattedSlots: this.formatSlotsForNotification(data.slots),
        bookingUrl: process.env.BLS_ALGERIA_URL || 'https://algeria.blsspainvisa.com/'
      };

      const notificationPromises = [];

      // WhatsApp notification
      if (settings.whatsapp_notifications && settings.whatsapp_number) {
        notificationPromises.push(
          this.sendWhatsApp(settings.whatsapp_number, notificationData)
            .catch(err => {
              logger.warn(`WhatsApp notification failed for user ${userId}:`, err.message);
              return { success: false, error: err.message };
            })
        );
      }

      // Telegram notification
      if (settings.telegram_notifications && settings.telegram_chat_id) {
        notificationPromises.push(
          this.sendTelegram(settings.telegram_chat_id, notificationData)
            .catch(err => {
              logger.warn(`Telegram notification failed for user ${userId}:`, err.message);
              return { success: false, error: err.message };
            })
        );
      }

      // SMS notification
      if (settings.sms_notifications && settings.phone_number) {
        notificationPromises.push(
          this.sendSMS(settings.phone_number, notificationData)
            .catch(err => {
              logger.warn(`SMS notification failed for user ${userId}:`, err.message);
              return { success: false, error: err.message };
            })
        );
      }

      // Email notification - REAL slot notification (not test)
      if (settings.email_notifications && settings.email_address) {
        logger.info(`📧 Sending REAL email notification to ${settings.email_address} for ${data.slots.length} slot(s) at ${data.center}`);
        notificationPromises.push(
          this.sendEmail(settings.email_address, notificationData)
            .catch(err => {
              logger.warn(`Email notification failed for user ${userId}:`, err.message);
              return { success: false, error: err.message };
            })
        );
      } else {
        if (!settings.email_notifications) {
          logger.debug(`Email notifications disabled for user ${userId}`);
        } else if (!settings.email_address) {
          logger.debug(`Email address not configured for user ${userId}`);
        }
      }

      // Wait for all notifications to complete
      const results = await Promise.allSettled(notificationPromises);
      const successCount = results.filter(r => 
        r.status === 'fulfilled' && r.value?.success !== false
      ).length;
      
      logger.info(`Notifications sent for user ${userId}: ${successCount}/${notificationPromises.length} successful`);
      
      // Log failed notifications for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected' || (result.status === 'fulfilled' && result.value?.success === false)) {
          const channel = ['WhatsApp', 'Telegram', 'SMS', 'Email'][index] || 'Unknown';
          logger.warn(`Failed to send ${channel} notification to user ${userId}`);
        }
      });

      return {
        success: true,
        sent: successCount,
        total: notificationPromises.length,
        results: results.map((r, i) => ({
          channel: ['whatsapp', 'telegram', 'sms', 'email'][i],
          success: r.status === 'fulfilled' && r.value?.success !== false,
          error: r.status === 'rejected' ? r.reason?.message : (r.value?.error || null)
        }))
      };
    } catch (error) {
      logger.error('Error in notification service:', error);
      // Don't throw - allow monitoring to continue even if notifications fail
      return { success: false, error: error.message };
    }
  }

  /**
   * Format slots array for notification messages
   */
  formatSlotsForNotification(slots) {
    if (!slots || slots.length === 0) return 'No slots available';
    
    return slots.map((slot, index) => {
      const date = slot.date ? new Date(slot.date) : null;
      const dateStr = date ? date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }) : 'Date TBD';
      const timeStr = slot.time || 'Time TBD';
      return `${index + 1}. ${dateStr} at ${timeStr}`;
    }).join('\n');
  }

  async sendEmail(to, data) {
    try {
      if (!this.emailTransporter) {
        logger.warn('Email transporter not configured. Skipping email notification.');
        return { success: false, error: 'Email not configured' };
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to,
        subject: data.title || 'BLS Appointment Notification',
        html: this.formatEmailTemplate(data)
      };

      const info = await this.emailTransporter.sendMail(mailOptions);
      // Check if this is a test email or real notification
      const isTestEmail = data.title && data.title.includes('Test Notification');
      const emailType = isTestEmail ? 'TEST' : 'REAL SLOT NOTIFICATION';
      logger.info(`📧 ${emailType} email sent to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`Error sending email to ${to}:`, error);
      
      // Provide helpful error messages
      if (error.code === 'EAUTH') {
        throw new Error('Email authentication failed. Check your EMAIL_USER and EMAIL_PASS. For Gmail, use an App Password.');
      } else if (error.code === 'ECONNECTION') {
        throw new Error('Could not connect to email server. Check EMAIL_HOST and EMAIL_PORT.');
      }
      
      throw error;
    }
  }

  formatEmailTemplate(data) {
    const slots = data.slots || [];
    const slotList = slots.length > 0 
      ? slots.map((slot, index) => {
          const date = slot.date ? new Date(slot.date) : null;
          const dateStr = date ? date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }) : 'Date TBD';
          const timeStr = slot.time || 'Time TBD';
          return `
            <div class="slot-item">
              <strong>Slot ${index + 1}:</strong><br>
              📅 Date: ${dateStr}<br>
              ⏰ Time: ${timeStr}
            </div>
          `;
        }).join('')
      : '<p>No slot details available.</p>';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4;
          }
          .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #1a365d 0%, #2d6ef5 100%); 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 24px; 
            font-weight: 600;
          }
          .content { 
            padding: 30px 20px; 
            background: white; 
          }
          .alert-box {
            background: #e8f4f8;
            border-left: 4px solid #2d6ef5;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .slot-info { 
            background: #f8f9fa; 
            padding: 20px; 
            margin: 20px 0; 
            border-left: 4px solid #2d6ef5; 
            border-radius: 4px;
          }
          .slot-item {
            background: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
            border: 1px solid #e0e0e0;
          }
          .info-row {
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .info-label {
            font-weight: 600;
            color: #555;
            display: inline-block;
            width: 120px;
          }
          .button { 
            display: inline-block; 
            padding: 14px 28px; 
            background: #2d6ef5; 
            color: white; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
            font-weight: 600;
            text-align: center;
            transition: background 0.3s;
          }
          .button:hover {
            background: #1a4fc7;
          }
          .footer {
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
            background: #f8f9fa;
            border-top: 1px solid #e0e0e0;
          }
          .slot-count {
            font-size: 18px;
            font-weight: 600;
            color: #2d6ef5;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${data.title || '🎉 BLS Appointment Slot Available!'}</h1>
          </div>
          <div class="content">
            <div class="alert-box">
              <p style="margin: 0; font-size: 16px;"><strong>${data.message}</strong></p>
            </div>
            
            <div class="slot-info">
              <div class="slot-count">📋 Available Slots (${data.slotCount || slots.length})</div>
              ${slotList}
            </div>
            
            <div class="slot-info">
              <div class="info-row">
                <span class="info-label">📍 Center:</span>
                <span>${data.center || 'N/A'}</span>
              </div>
              ${data.profileName ? `
              <div class="info-row">
                <span class="info-label">👤 Profile:</span>
                <span>${data.profileName}</span>
              </div>
              ` : ''}
              <div class="info-row">
                <span class="info-label">🔗 Website:</span>
                <span><a href="${data.bookingUrl}" style="color: #2d6ef5;">BLS Algeria</a></span>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.bookingUrl}" class="button">Book Appointment Now →</a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              <strong>⚠️ Important:</strong> Appointment slots are limited and may be booked quickly. 
              Please visit the BLS website as soon as possible to secure your appointment.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated notification from BLS Appointment Monitor</p>
            <p>You received this because you have email notifications enabled in your settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendWhatsApp(to, data) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

      if (!accountSid || !authToken) {
        logger.warn('Twilio credentials not configured. Skipping WhatsApp notification.');
        return { success: false, error: 'Twilio not configured' };
      }

      if (!fromNumber) {
        logger.warn('TWILIO_WHATSAPP_FROM not configured. Skipping WhatsApp notification.');
        return { success: false, error: 'WhatsApp from number not configured' };
      }

      // Format WhatsApp message with all slot details
      let message = `${data.title}\n\n`;
      message += `${data.message}\n\n`;
      message += `📍 Center: ${data.center}\n`;
      if (data.profileName) {
        message += `👤 Profile: ${data.profileName}\n`;
      }
      message += `\n📋 Available Slots:\n${data.formattedSlots}\n\n`;
      message += `🔗 Book now: ${data.bookingUrl}\n\n`;
      message += `⚠️ Slots are limited - book quickly!`;

      // WhatsApp messages have a 1600 character limit, truncate if needed
      if (message.length > 1600) {
        message = message.substring(0, 1597) + '...';
      }

      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({
          From: fromNumber,
          To: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
          Body: message
        }),
        {
          auth: {
            username: accountSid,
            password: authToken
          }
        }
      );

      logger.info(`WhatsApp sent to ${to}: ${response.data.sid}`);
      return { success: true, sid: response.data.sid };
    } catch (error) {
      logger.error(`Error sending WhatsApp to ${to}:`, error);
      
      // Provide helpful error messages
      if (error.response?.data?.message) {
        throw new Error(`Twilio error: ${error.response.data.message}`);
      }
      
      throw error;
    }
  }

  async sendTelegram(chatId, data) {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      if (!botToken) {
        logger.warn('Telegram bot token not configured. Skipping Telegram notification.');
        return { success: false, error: 'Telegram not configured' };
      }

      // Format Telegram message with Markdown
      let message = `*${data.title}*\n\n`;
      message += `${data.message}\n\n`;
      message += `📍 *Center:* ${data.center}\n`;
      if (data.profileName) {
        message += `👤 *Profile:* ${data.profileName}\n`;
      }
      message += `\n📋 *Available Slots:*\n`;
      message += data.formattedSlots.split('\n').map(line => `• ${line}`).join('\n');
      message += `\n\n🔗 [Book Appointment](${data.bookingUrl})\n\n`;
      message += `⚠️ *Slots are limited - book quickly!*`;

      // Telegram messages have a 4096 character limit
      if (message.length > 4096) {
        message = message.substring(0, 4093) + '...';
      }

      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: false
        }
      );

      logger.info(`Telegram sent to chat ${chatId}: message ID ${response.data.result.message_id}`);
      return { success: true, messageId: response.data.result.message_id };
    } catch (error) {
      logger.error(`Error sending Telegram to ${chatId}:`, error);
      
      // Provide helpful error messages
      if (error.response?.data?.description) {
        const errorMsg = error.response.data.description;
        if (errorMsg.includes('chat not found')) {
          throw new Error('Telegram chat not found. Make sure you have started a conversation with the bot.');
        } else if (errorMsg.includes('bot token')) {
          throw new Error('Invalid Telegram bot token.');
        }
        throw new Error(`Telegram error: ${errorMsg}`);
      }
      
      throw error;
    }
  }

  /**
   * Send error notification to user
   */
  async notifyError(userId, errorData) {
    try {
      const settings = await Settings.findOne({ where: { user_id: userId } });
      
      if (!settings) {
        logger.warn(`No settings found for user ${userId}`);
        return;
      }

      const errorNotificationData = {
        title: '⚠️ Monitoring Error',
        message: `Monitor encountered an error: ${errorData.error}`,
        error: errorData.error,
        errorCount: errorData.errorCount,
        monitorId: errorData.monitorId,
        center: errorData.center,
        profileName: errorData.profileName
      };

      const notificationPromises = [];

      // Email error notification
      if (settings.email_notifications && settings.email_address) {
        notificationPromises.push(
          this.sendEmail(settings.email_address, {
            ...errorNotificationData,
            title: '⚠️ BLS Monitor Error',
            message: `Your monitor for ${errorData.center} encountered an error after ${errorData.errorCount} attempts.`
          }).catch(err => logger.warn('Error email notification failed:', err.message))
        );
      }

      // Send to other channels if enabled (optional - errors might be less critical)
      // Only send if error count is high (>= 5)
      if (errorData.errorCount >= 5) {
        if (settings.whatsapp_notifications && settings.whatsapp_number) {
          notificationPromises.push(
            this.sendWhatsApp(settings.whatsapp_number, errorNotificationData)
              .catch(err => logger.warn('Error WhatsApp notification failed:', err.message))
          );
        }

        if (settings.telegram_notifications && settings.telegram_chat_id) {
          notificationPromises.push(
            this.sendTelegram(settings.telegram_chat_id, errorNotificationData)
              .catch(err => logger.warn('Error Telegram notification failed:', err.message))
          );
        }
      }

      await Promise.allSettled(notificationPromises);
      logger.info(`Error notifications sent for user ${userId}`);
    } catch (error) {
      logger.error('Error in error notification service:', error);
    }
  }

  async sendSMS(to, data) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken) {
        logger.warn('Twilio credentials not configured. Skipping SMS notification.');
        return { success: false, error: 'Twilio not configured' };
      }

      if (!fromNumber) {
        logger.warn('TWILIO_PHONE_NUMBER not configured. Skipping SMS notification.');
        return { success: false, error: 'SMS from number not configured' };
      }

      // Format SMS message (SMS has 160 character limit per segment)
      // Keep it concise but informative
      let message = `${data.title}\n\n`;
      message += `${data.message}\n\n`;
      message += `Center: ${data.center}\n`;
      
      // Include first slot date if available
      if (data.slotDate) {
        const date = new Date(data.slotDate);
        message += `Date: ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}\n`;
      }
      
      // If multiple slots, mention count
      if (data.slotCount > 1) {
        message += `${data.slotCount} slots available\n`;
      }
      
      message += `\nBook: ${data.bookingUrl}`;

      // SMS messages are automatically split into 160-character segments by Twilio
      // But we'll keep it concise to avoid multiple messages
      if (message.length > 320) {
        message = `${data.title}\n\n${data.message}\n\nCenter: ${data.center}\n\nBook: ${data.bookingUrl}`;
      }

      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({
          From: fromNumber,
          To: to,
          Body: message
        }),
        {
          auth: {
            username: accountSid,
            password: authToken
          }
        }
      );

      logger.info(`SMS sent to ${to}: ${response.data.sid}`);
      return { success: true, sid: response.data.sid };
    } catch (error) {
      logger.error(`Error sending SMS to ${to}:`, error);
      
      // Provide helpful error messages
      if (error.response?.data?.message) {
        throw new Error(`Twilio error: ${error.response.data.message}`);
      }
      
      throw error;
    }
  }
}

module.exports = new NotificationService();


