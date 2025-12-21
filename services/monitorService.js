const puppeteer = require('puppeteer');
const { Monitor, Profile, Slot } = require('../models');
const NotificationService = require('./notificationService');
const CaptchaService = require('./captchaService');
const { extractSlots: extractSlotsHelper } = require('./extractSlotsHelper');
const logger = require('../utils/logger');
const cron = require('node-cron');

class MonitorService {
  constructor() {
    this.activeMonitors = new Map();
    this.browsers = new Map();
    this.checkIntervals = new Map();
  }

  async initialize(io) {
    this.io = io;
    
    // Load and restart active monitors from database
    const activeMonitors = await Monitor.findAll({
      where: { status: 'active' },
      include: [{ model: Profile, as: 'profile' }]
    });

    for (const monitor of activeMonitors) {
      await this.startMonitor(monitor.id, io);
    }

    logger.info(`Initialized ${activeMonitors.length} active monitors`);
  }

  async startMonitor(monitorId, io) {
    try {
      const monitor = await Monitor.findByPk(monitorId, {
        include: [{ model: Profile, as: 'profile' }]
      });

      if (!monitor || monitor.status !== 'active') {
        return;
      }

      // Stop if already running
      if (this.activeMonitors.has(monitorId)) {
        await this.stopMonitor(monitorId);
      }

      this.activeMonitors.set(monitorId, {
        monitor,
        status: 'checking',
        lastCheck: null,
        nextCheck: monitor.next_check || new Date(Date.now() + monitor.check_interval * 60 * 1000)
      });

      // Start periodic checking
      await this.scheduleNextCheck(monitorId, io);

      logger.info(`Monitor started: ${monitorId}`);
    } catch (error) {
      logger.error(`Error starting monitor ${monitorId}:`, error);
      await Monitor.update(
        { status: 'error', last_error: error.message },
        { where: { id: monitorId } }
      );
    }
  }

  async stopMonitor(monitorId) {
    // Clear interval
    if (this.checkIntervals.has(monitorId)) {
      clearInterval(this.checkIntervals.get(monitorId));
      this.checkIntervals.delete(monitorId);
    }

    // Close browser if exists
    if (this.browsers.has(monitorId)) {
      const browser = this.browsers.get(monitorId);
      await browser.close().catch(err => logger.error('Error closing browser:', err));
      this.browsers.delete(monitorId);
    }

    this.activeMonitors.delete(monitorId);

    await Monitor.update(
      { status: 'stopped' },
      { where: { id: monitorId } }
    );

    logger.info(`Monitor stopped: ${monitorId}`);
  }

  pauseMonitor(monitorId) {
    if (this.checkIntervals.has(monitorId)) {
      clearInterval(this.checkIntervals.get(monitorId));
      this.checkIntervals.delete(monitorId);
    }
    this.activeMonitors.delete(monitorId);
  }

  async resumeMonitor(monitorId, io) {
    await this.startMonitor(monitorId, io);
  }

  async scheduleNextCheck(monitorId, io) {
    const monitorData = this.activeMonitors.get(monitorId);
    if (!monitorData) return;

    const { monitor } = monitorData;
    const intervalMs = monitor.check_interval * 60 * 1000;

    // Schedule next check
    const timeoutId = setTimeout(async () => {
      await this.checkAvailability(monitorId, io);
      await this.scheduleNextCheck(monitorId, io);
    }, intervalMs);

    this.checkIntervals.set(monitorId, timeoutId);

    // Update next check time
    const nextCheck = new Date(Date.now() + intervalMs);
    await Monitor.update(
      { next_check: nextCheck },
      { where: { id: monitorId } }
    );
  }

  async checkAvailability(monitorId, io) {
    try {
      const monitorData = this.activeMonitors.get(monitorId);
      if (!monitorData) return;

      const { monitor } = monitorData;

      // Update status
      monitorData.status = 'checking';
      monitorData.lastCheck = new Date();

      // Emit status update via socket
      if (io) {
        io.to(`user-${monitor.user_id}`).emit('statusUpdate', {
          id: monitorId,
          message: 'Checking availability...',
          timestamp: new Date()
        });
      }

      // Launch browser if not exists
      if (!this.browsers.has(monitorId)) {
        const browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled'
          ]
        });
        this.browsers.set(monitorId, browser);
      }

      const browser = this.browsers.get(monitorId);
      const page = await browser.newPage();

      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Navigate to BLS Algeria website
      // NOTE: Replace with actual BLS Algeria appointment URL
      const blsUrl = process.env.BLS_ALGERIA_URL || 'https://www.bls-algeria.com';
      await page.goto(blsUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait a bit to simulate human behavior
      await page.waitForTimeout(2000);

      // Check for CAPTCHA - get user settings
      const { Settings } = require('../models');
      const settings = await Settings.findOne({ where: { user_id: monitor.user_id } });
      
      const captchaPresent = await page.$('#captcha, .g-recaptcha, [data-sitekey]').catch(() => null);
      if (captchaPresent && settings && settings.captcha_enabled) {
        const captchaSolved = await CaptchaService.solveCaptcha(page);
        if (!captchaSolved) {
          throw new Error('Failed to solve CAPTCHA');
        }
      }

      // Map center code to actual center name/ID if needed
      const centerMap = {
        'algiers_1': 'ALG1',
        'algiers_2': 'ALG2',
        'algiers_3': 'ALG3',
        'algiers_4': 'ALG4',
        'oran_1': 'ORAN1',
        'oran_2': 'ORAN2',
        'oran_3': 'ORAN3'
      };
      const centerCode = centerMap[monitor.bls_center] || monitor.bls_center;
      
      // Select center/category if dropdown exists (for ALG1, ALG2, etc.)
      try {
        // Look for center/category selection dropdowns
        const centerSelect = await page.$('select[name*="center"], select[id*="center"], #center, #category, select[name*="category"]');
        if (centerSelect) {
          // Try to select the appropriate center/category
          await page.select('select[name*="center"], select[id*="center"], #center, #category, select[name*="category"]', centerCode).catch(() => {});
          await page.waitForTimeout(1000);
        }
      } catch (error) {
        logger.warn('Could not select center/category:', error.message);
      }
      
      // Extract appointment slots using comprehensive helper function
      const slots = await extractSlotsHelper(page, monitor.bls_center);

      // Update monitor stats
      const updateData = {
        last_check: new Date(),
        total_checks: monitor.total_checks + 1
      };

      if (slots.length > 0) {
        updateData.slots_found = monitor.slots_found + slots.length;
        updateData.last_slot_found = new Date();
        updateData.error_count = 0;

        // Save found slots
        for (const slot of slots) {
          await Slot.findOrCreate({
            where: {
              monitor_id: monitorId,
              slot_date: slot.date,
              slot_time: slot.time,
              center: slot.center
            },
            defaults: {
              monitor_id: monitorId,
              slot_date: slot.date,
              slot_time: slot.time,
              center: slot.center,
              status: 'available'
            }
          });
        }

        // Send notifications
        await NotificationService.notifySlotFound(monitor.user_id, {
          slots,
          center: monitor.bls_center,
          profileName: monitor.profile.profile_name
        }, io);

        // Emit socket event
        if (io) {
          io.to(`user-${monitor.user_id}`).emit('slotAvailable', {
            id: monitorId,
            slots,
            date: slots[0].date,
            center: monitor.bls_center
          });
        }

        logger.info(`Slots found for monitor ${monitorId}: ${slots.length}`);
      } else {
        updateData.error_count = 0;
      }

      await Monitor.update(updateData, { where: { id: monitorId } });

      // Close page
      await page.close();

      monitorData.status = 'active';

      if (io) {
        io.to(`user-${monitor.user_id}`).emit('statusUpdate', {
          id: monitorId,
          message: `Checked - ${slots.length > 0 ? slots.length + ' slot(s) found' : 'No slots available'}`,
          timestamp: new Date()
        });
      }

    } catch (error) {
      logger.error(`Error checking availability for monitor ${monitorId}:`, error);

      const monitorData = this.activeMonitors.get(monitorId);
      if (monitorData) {
        const { monitor } = monitorData;
        
        await Monitor.update(
          {
            status: 'error',
            error_count: monitor.error_count + 1,
            last_error: error.message.substring(0, 500)
          },
          { where: { id: monitorId } }
        );

        if (io) {
          io.to(`user-${monitor.user_id}`).emit('statusUpdate', {
            id: monitorId,
            message: `Error: ${error.message}`,
            timestamp: new Date()
          });
        }
      }

      // Close page if it exists
      const pages = await this.browsers.get(monitorId)?.pages();
      if (pages && pages.length > 0) {
        await pages[pages.length - 1].close().catch(() => {});
      }
    }
  }

  // extractSlots method moved to extractSlotsHelper.js for better organization
  // The helper function includes multiple extraction strategies and is more robust
}

// Export singleton instance
module.exports = new MonitorService();


