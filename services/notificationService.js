const nodemailer = require('nodemailer');
const axios = require('axios');
const { Settings } = require('../models');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    // Email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async notifySlotFound(userId, data, io = null) {
    try {
      const settings = await Settings.findOne({ where: { user_id: userId } });
      
      if (!settings) {
        logger.warn(`No settings found for user ${userId}`);
        return;
      }

      const notificationPromises = [];

      // Email notification
      if (settings.email_notifications && settings.email_address) {
        notificationPromises.push(
          this.sendEmail(settings.email_address, {
            title: 'BLS Appointment Slot Available!',
            message: `Found ${data.slots.length} appointment slot(s) at ${data.center}`,
            slots: data.slots,
            center: data.center,
            profileName: data.profileName,
            slotDate: data.slots[0]?.date
          })
        );
      }

      // WhatsApp notification
      if (settings.whatsapp_notifications && settings.whatsapp_number) {
        notificationPromises.push(
          this.sendWhatsApp(settings.whatsapp_number, {
            title: 'BLS Appointment Slot Available!',
            message: `Found ${data.slots.length} appointment slot(s) at ${data.center}`,
            slots: data.slots,
            center: data.center,
            slotDate: data.slots[0]?.date
          })
        );
      }

      // Telegram notification
      if (settings.telegram_notifications && settings.telegram_chat_id) {
        notificationPromises.push(
          this.sendTelegram(settings.telegram_chat_id, {
            title: 'BLS Appointment Slot Available!',
            message: `Found ${data.slots.length} appointment slot(s) at ${data.center}`,
            slots: data.slots,
            center: data.center,
            slotDate: data.slots[0]?.date
          })
        );
      }

      // SMS notification
      if (settings.sms_notifications && settings.phone_number) {
        notificationPromises.push(
          this.sendSMS(settings.phone_number, {
            title: 'BLS Appointment Slot Available!',
            message: `Found ${data.slots.length} appointment slot(s) at ${data.center}`,
            center: data.center,
            slotDate: data.slots[0]?.date
          })
        );
      }

      await Promise.allSettled(notificationPromises);

      logger.info(`Notifications sent for user ${userId}`);
    } catch (error) {
      logger.error('Error sending notifications:', error);
    }
  }

  async sendEmail(to, data) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to,
        subject: data.title || 'BLS Appointment Notification',
        html: this.formatEmailTemplate(data)
      };

      const info = await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Email sent to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`Error sending email to ${to}:`, error);
      throw error;
    }
  }

  formatEmailTemplate(data) {
    const slotDate = data.slotDate ? new Date(data.slotDate).toLocaleDateString() : 'N/A';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a365d; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .slot-info { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #2d6ef5; }
          .button { display: inline-block; padding: 12px 24px; background: #2d6ef5; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${data.title || 'BLS Appointment Notification'}</h1>
          </div>
          <div class="content">
            <p>${data.message}</p>
            <div class="slot-info">
              <strong>Center:</strong> ${data.center}<br>
              <strong>Date:</strong> ${slotDate}<br>
              ${data.profileName ? `<strong>Profile:</strong> ${data.profileName}<br>` : ''}
            </div>
            <p>Please visit the BLS website to book your appointment.</p>
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
      const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

      if (!accountSid || !authToken) {
        throw new Error('Twilio credentials not configured');
      }

      const message = `${data.title}\n\n${data.message}\n\nCenter: ${data.center}\nDate: ${new Date(data.slotDate).toLocaleDateString()}\n\nVisit BLS website to book.`;

      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({
          From: fromNumber,
          To: `whatsapp:${to}`,
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
      throw error;
    }
  }

  async sendTelegram(chatId, data) {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      if (!botToken) {
        throw new Error('Telegram bot token not configured');
      }

      const message = `*${data.title}*\n\n${data.message}\n\n*Center:* ${data.center}\n*Date:* ${new Date(data.slotDate).toLocaleDateString()}\n\nVisit BLS website to book.`;

      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        }
      );

      logger.info(`Telegram sent to ${chatId}`);
      return { success: true, messageId: response.data.result.message_id };
    } catch (error) {
      logger.error(`Error sending Telegram to ${chatId}:`, error);
      throw error;
    }
  }

  async sendSMS(to, data) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken) {
        throw new Error('Twilio credentials not configured');
      }

      const message = `${data.title}\n\n${data.message}\n\nCenter: ${data.center}\nDate: ${new Date(data.slotDate).toLocaleDateString()}`;

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
      throw error;
    }
  }
}

module.exports = new NotificationService();


