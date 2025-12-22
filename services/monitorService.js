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

      // Start periodic checking - do initial check immediately, then schedule
      await this.checkAvailability(monitorId, io);
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
    // Clear timeout
    if (this.checkIntervals.has(monitorId)) {
      clearTimeout(this.checkIntervals.get(monitorId));
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
      clearTimeout(this.checkIntervals.get(monitorId));
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
          headless: "new", // Use new headless mode to avoid deprecation warning
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

      // Navigate to BLS Algeria main page
      const baseUrl = process.env.BLS_ALGERIA_URL || 'https://algeria.blsspainvisa.com/';
      logger.info(`Navigating to BLS Algeria website: ${baseUrl}`);
      await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for page to fully load
      await page.waitForTimeout(3000);
      
      // Handle modal pop-up if present (Visa Applicants Information)
      logger.info('Checking for modal pop-up...');
      try {
        const modalCloseSelectors = [
          '.modal-close',
          '.close-modal',
          '[class*="modal"] [class*="close"]',
          'button[aria-label*="close" i]',
          'button[aria-label*="Close" i]',
          '.modal button:last-child',
          '[class*="popup"] [class*="close"]',
          'button.close',
          '.close-button',
          // Try to find X button in modal
          'div[class*="modal"] button:has-text("×")',
          'div[class*="modal"] button:has-text("X")',
          // Generic close buttons
          'button:has-text("×")',
          '[role="dialog"] button[aria-label*="close" i]'
        ];
        
        let modalClosed = false;
        for (const selector of modalCloseSelectors) {
          try {
            const closeButton = await page.$(selector);
            if (closeButton) {
              const isVisible = await closeButton.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
              });
              
              if (isVisible) {
                logger.info(`Closing modal with selector: ${selector}`);
                await closeButton.click();
                await page.waitForTimeout(1000);
                modalClosed = true;
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }
        
        // Also try pressing Escape key as fallback
        if (!modalClosed) {
          try {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
            logger.info('Pressed Escape to close modal');
          } catch (e) {
            // Ignore
          }
        }
      } catch (modalError) {
        logger.warn('Error handling modal (may not exist):', modalError.message);
      }
      
      // Handle cookie consent banner
      logger.info('Checking for cookie consent banner...');
      try {
        const cookieSelectors = [
          'button:has-text("Accept")',
          'button:has-text("Got it")',
          'button:has-text("I agree")',
          'a:has-text("click here to proceed")',
          '[class*="cookie"] button',
          '[id*="cookie"] button',
          '.cookie-consent button',
          '#cookieConsent button'
        ];
        
        for (const selector of cookieSelectors) {
          try {
            const cookieButton = await page.$(selector);
            if (cookieButton) {
              const isVisible = await cookieButton.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden';
              });
              
              if (isVisible) {
                logger.info(`Handling cookie banner with selector: ${selector}`);
                await cookieButton.click();
                await page.waitForTimeout(1000);
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }
      } catch (cookieError) {
        logger.warn('Error handling cookie banner (may not exist):', cookieError.message);
      }
      
      // Login to BLS website if credentials are available
      if (monitor.profile && monitor.profile.bls_email && monitor.profile.bls_password) {
        logger.info('BLS credentials found, attempting to login...');
        try {
          // Look for login form
          const loginForm = await page.$('#loginForm').catch(() => null);
          const emailInput = await page.$('#Email').catch(() => null);
          const passwordInput = await page.$('#Password').catch(() => null);
          const loginButton = await page.$('#btnLogin').catch(() => null);
          
          if (emailInput && passwordInput && loginButton) {
            logger.info('Login form found, filling credentials...');
            await emailInput.type(monitor.profile.bls_email, { delay: 100 });
            await passwordInput.type(monitor.profile.bls_password, { delay: 100 });
            await page.waitForTimeout(1000);
            
            // Click login button and wait for navigation
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
              loginButton.click()
            ]);
            await page.waitForTimeout(3000);
            
            // Check if login was successful (look for dashboard or booking form)
            const currentUrl = page.url();
            const hasBookingForm = await page.$('#bookingForm').catch(() => null);
            const hasDashboard = await page.$('#locationSelect, #visaTypeSelect').catch(() => null);
            
            if (hasBookingForm || hasDashboard) {
              logger.info('Login successful, navigated to booking page');
            } else {
              logger.warn('Login may have failed or redirected to unexpected page');
            }
          } else {
            logger.info('Login form not found on current page, may already be logged in or need to navigate to login page');
            // Try to find login link and navigate to it
            const loginLink = await page.$('a[href*="login"], a:has-text("Login"), a:has-text("Sign In")').catch(() => null);
            if (loginLink) {
              logger.info('Found login link, navigating to login page...');
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
                loginLink.click()
              ]);
              await page.waitForTimeout(2000);
              
              // Try login again
              const emailInput2 = await page.$('#Email').catch(() => null);
              const passwordInput2 = await page.$('#Password').catch(() => null);
              const loginButton2 = await page.$('#btnLogin').catch(() => null);
              
              if (emailInput2 && passwordInput2 && loginButton2) {
                await emailInput2.type(monitor.profile.bls_email, { delay: 100 });
                await passwordInput2.type(monitor.profile.bls_password, { delay: 100 });
                await page.waitForTimeout(1000);
                await Promise.all([
                  page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
                  loginButton2.click()
                ]);
                await page.waitForTimeout(3000);
                logger.info('Login attempt completed');
              }
            }
          }
        } catch (loginError) {
          logger.warn(`Error during login: ${loginError.message}, continuing without login...`);
        }
      } else {
        logger.info('No BLS credentials found in profile, skipping login');
      }
      
      // Select the appropriate center (Algiers or Oran)
      const center = monitor.bls_center.toLowerCase();
      const isAlgiers = center.startsWith('algiers');
      const isOran = center.startsWith('oran');
      
      logger.info(`Selecting center: ${monitor.bls_center} (Algiers: ${isAlgiers}, Oran: ${isOran})`);
      
      try {
        // Look for center selection links/buttons
        // The website shows "Algiers →" and "Oran →" links
        let centerLink = null;
        
        if (isAlgiers) {
          // Try multiple selectors for Algiers link
          const algiersSelectors = [
            'a[href*="algiers"]',
            'a:has-text("Algiers")',
            'a:has-text("ALGIERS")',
            '[href*="algiers"]',
            'a[href="/algiers"]',
            '.algiers-link',
            '[data-center="algiers"]'
          ];
          
          for (const selector of algiersSelectors) {
            try {
              centerLink = await page.$(selector);
              if (centerLink) {
                logger.info(`Found Algiers link with selector: ${selector}`);
                break;
              }
            } catch (e) {
              continue;
            }
          }
        } else if (isOran) {
          // Try multiple selectors for Oran link
          const oranSelectors = [
            'a[href*="oran"]',
            'a:has-text("Oran")',
            'a:has-text("ORAN")',
            '[href*="oran"]',
            'a[href="/oran"]',
            '.oran-link',
            '[data-center="oran"]'
          ];
          
          for (const selector of oranSelectors) {
            try {
              centerLink = await page.$(selector);
              if (centerLink) {
                logger.info(`Found Oran link with selector: ${selector}`);
                break;
              }
            } catch (e) {
              continue;
            }
          }
        }
        
        if (centerLink) {
          logger.info('Clicking center link...');
          try {
            // Wait for navigation with a longer timeout
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
              centerLink.click()
            ]);
            await page.waitForTimeout(5000); // Wait longer for page to load
            const currentUrl = page.url();
            logger.info(`Navigated to center page: ${currentUrl}`);
            
            // If still on homepage, try direct URL navigation
            if (currentUrl === 'https://algeria.blsspainvisa.com/' || currentUrl.includes('algeria.blsspainvisa.com') && !currentUrl.includes('/algiers') && !currentUrl.includes('/oran')) {
              logger.warn('Still on homepage after clicking link, trying direct navigation...');
              const centerUrl = isAlgiers 
                ? 'https://algeria.blsspainvisa.com/algiers'
                : 'https://algeria.blsspainvisa.com/oran';
              await page.goto(centerUrl, { waitUntil: 'networkidle2', timeout: 60000 });
              await page.waitForTimeout(5000);
              logger.info(`Direct navigation to: ${page.url()}`);
            }
          } catch (navError) {
            logger.warn('Navigation error, trying direct URL:', navError.message);
            // Fallback to direct URL navigation
            const centerUrl = isAlgiers 
              ? 'https://algeria.blsspainvisa.com/algiers'
              : 'https://algeria.blsspainvisa.com/oran';
            await page.goto(centerUrl, { waitUntil: 'networkidle2', timeout: 60000 });
            await page.waitForTimeout(5000);
          }
        } else {
          // Try direct URL navigation
          const centerUrl = isAlgiers 
            ? 'https://algeria.blsspainvisa.com/algiers'
            : 'https://algeria.blsspainvisa.com/oran';
          logger.info(`Center link not found, navigating directly to: ${centerUrl}`);
          await page.goto(centerUrl, { waitUntil: 'networkidle2', timeout: 60000 });
          await page.waitForTimeout(5000);
        }
      } catch (error) {
        logger.warn('Error selecting center, trying direct URL:', error.message);
        // Fallback to direct URL
        const centerUrl = isAlgiers 
          ? 'https://algeria.blsspainvisa.com/algiers'
          : 'https://algeria.blsspainvisa.com/oran';
        await page.goto(centerUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForTimeout(5000);
        logger.info(`Fallback navigation to: ${page.url()}`);
      }
      
      // Navigate to appointment booking page
      logger.info('Looking for appointment booking link...');
      try {
        // Common selectors for appointment booking links (including BLS homepage card)
        // IMPORTANT: Exclude "Reprint" and "Cancel" links - only want NEW booking
        const appointmentSelectors = [
          // BLS homepage card (most likely) - try text-based selectors first
          'a:has-text("Book an Appointment")',
          'a:has-text("Book a Appointn")', // Typo variant seen in screenshot
          'div:has-text("Book an Appointment") a',
          'div:has-text("Book a Appointn") a',
          // Try finding by href patterns - EXCLUDE reprint/cancel
          'a[href*="appointment"]:not([href*="reprint"]):not([href*="Reprint"]):not([href*="cancel"]):not([href*="Cancel"])',
          'a[href*="book"]:not([href*="reprint"]):not([href*="Reprint"]):not([href*="cancel"]):not([href*="Cancel"])',
          'a[href*="booking"]:not([href*="reprint"]):not([href*="Reprint"]):not([href*="cancel"]):not([href*="Cancel"])',
          // Try class-based selectors
          '[class*="book"] a:not([href*="reprint"]):not([href*="Reprint"])',
          '[class*="appointment"] a:not([href*="reprint"]):not([href*="Reprint"])',
          '.book-appointment',
          '.appointment-link',
          // Generic appointment links - exclude reprint
          'a:has-text("Book Appointment"):not(:has-text("Reprint")):not(:has-text("Cancel"))',
          'a:has-text("Book"):not(:has-text("Reprint")):not(:has-text("Cancel"))',
          '[href*="schedule"]',
          '[href*="slot"]'
        ];
        
        let appointmentLink = null;
        
        // Social media domains to exclude
        const socialMediaDomains = ['facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'whatsapp', 'telegram'];
        
        for (const selector of appointmentSelectors) {
          try {
            const links = await page.$$(selector);
            // Filter out reprint/cancel links and social media links by checking href and text
            for (const link of links) {
              const href = await link.evaluate(el => el.getAttribute('href') || '');
              const text = await link.evaluate(el => el.textContent?.toLowerCase() || '');
              
              // Skip if it's a social media link
              const isSocialMedia = socialMediaDomains.some(domain => href.toLowerCase().includes(domain));
              if (isSocialMedia) {
                continue;
              }
              
              // Skip if it's a reprint or cancel link
              if (href.includes('reprint') || href.includes('Reprint') || 
                  href.includes('cancel') || href.includes('Cancel') ||
                  text.includes('reprint') || text.includes('cancel')) {
                continue;
              }
              
              // Skip if href doesn't contain appointment-related keywords (unless text does)
              const hasAppointmentInHref = href.includes('appointment') || href.includes('book') || href.includes('booking');
              const hasAppointmentInText = text.includes('book') && (text.includes('appointment') || text.includes('appointn'));
              
              // Must have appointment-related content in either href or text
              if (!hasAppointmentInHref && !hasAppointmentInText) {
                continue;
              }
              
              // This looks like a booking link
              appointmentLink = link;
              logger.info(`Found appointment link with selector: ${selector}, href: ${href}, text: ${text.substring(0, 50)}`);
              break;
            }
            if (appointmentLink) break;
          } catch (e) {
            continue;
          }
        }
        
        // If still no link found, try to find by text content more broadly
        if (!appointmentLink) {
          try {
            const allLinks = await page.$$('a');
            for (const link of allLinks) {
              const text = await link.evaluate(el => el.textContent?.toLowerCase() || '');
              const href = await link.evaluate(el => el.getAttribute('href') || '');
              
              // Skip social media links
              const isSocialMedia = socialMediaDomains.some(domain => href.toLowerCase().includes(domain));
              if (isSocialMedia) {
                continue;
              }
              
              // Look for "book appointment" but not "reprint" or "cancel"
              if ((text.includes('book') && (text.includes('appointment') || text.includes('appointn'))) ||
                  (href.includes('appointment') && !href.includes('reprint') && !href.includes('Reprint'))) {
                if (!text.includes('reprint') && !text.includes('cancel') && 
                    !href.includes('reprint') && !href.includes('Reprint') &&
                    !href.includes('cancel') && !href.includes('Cancel')) {
                  appointmentLink = link;
                  logger.info(`Found appointment link by text search: ${text.substring(0, 50)}, href: ${href}`);
                  break;
                }
              }
            }
          } catch (e) {
            logger.warn('Error in text-based link search:', e.message);
          }
        }
        
        if (appointmentLink) {
          logger.info('Clicking appointment booking link...');
          try {
            // Scroll element into view and wait for it to be visible
            await appointmentLink.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
            await page.waitForTimeout(1000);
            
            // Get href to check if it's an accordion/hash link
            const href = await appointmentLink.evaluate(el => el.getAttribute('href'));
            if (href) {
              logger.info(`Found appointment link href: ${href}`);
              
              // Check if it's a hash link (accordion toggle)
              if (href.startsWith('#')) {
                logger.info('Detected accordion/hash link, clicking to expand section...');
                try {
                  await appointmentLink.click();
                  await page.waitForTimeout(2000); // Wait for accordion to expand
                  
                  // After accordion expands, check for login form first (slots are behind login)
                  logger.info('Checking for login form after accordion expansion...');
                  const loginFormAfterAccordion = await page.$('#loginForm').catch(() => null);
                  const emailInputAfterAccordion = await page.$('#Email').catch(() => null);
                  const passwordInputAfterAccordion = await page.$('#Password').catch(() => null);
                  const loginButtonAfterAccordion = await page.$('#btnLogin').catch(() => null);
                  
                  if (emailInputAfterAccordion && passwordInputAfterAccordion && loginButtonAfterAccordion && monitor.profile && monitor.profile.bls_email && monitor.profile.bls_password) {
                    logger.info('Login form found in expanded accordion, attempting login...');
                    try {
                      await emailInputAfterAccordion.type(monitor.profile.bls_email, { delay: 100 });
                      await passwordInputAfterAccordion.type(monitor.profile.bls_password, { delay: 100 });
                      await page.waitForTimeout(1000);
                      
                      await Promise.all([
                        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
                        loginButtonAfterAccordion.click()
                      ]);
                      await page.waitForTimeout(3000);
                      logger.info('Login completed after accordion expansion');
                    } catch (loginErr) {
                      logger.warn(`Login error after accordion: ${loginErr.message}, continuing...`);
                    }
                  } else if (loginFormAfterAccordion || emailInputAfterAccordion) {
                    logger.info('Login form found but credentials missing or form incomplete, skipping login');
                  } else {
                    // Try to find the actual booking link inside the expanded accordion
                    const expandedSection = await page.$(href).catch(() => null); // href is like #flush-collapseOne18
                    if (expandedSection) {
                      logger.info('Accordion expanded, looking for booking link inside...');
                      
                      // Look for actual booking links inside the expanded section with timeout protection
                      let bookingLinks = [];
                      try {
                        bookingLinks = await Promise.race([
                          expandedSection.$$eval('a', links => 
                            links
                              .map(link => ({
                                href: link.getAttribute('href') || '',
                                text: link.textContent?.toLowerCase() || ''
                              }))
                              .filter(link => 
                                (link.href.includes('appointment') || link.href.includes('book') || link.href.includes('booking')) &&
                                !link.href.includes('reprint') && !link.href.includes('Reprint') &&
                                !link.href.includes('cancel') && !link.href.includes('Cancel') &&
                                !link.href.startsWith('#') // Skip other accordion links
                              )
                          ),
                          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                        ]).catch(err => {
                          logger.warn(`Error or timeout evaluating booking links: ${err.message}`);
                          return [];
                        });
                      } catch (evalError) {
                        logger.warn(`Error evaluating booking links: ${evalError.message}`);
                        bookingLinks = [];
                      }
                      
                      if (bookingLinks.length > 0) {
                        logger.info(`Found ${bookingLinks.length} booking link(s) inside accordion`);
                        const bookingLink = bookingLinks[0];
                        
                        // Navigate to the actual booking page
                        const fullUrl = bookingLink.href.startsWith('http') 
                          ? bookingLink.href 
                          : new URL(bookingLink.href, page.url()).href;
                        logger.info(`Navigating to actual booking page: ${fullUrl}`);
                        await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 60000 }).catch(err => {
                          logger.warn(`Navigation error: ${err.message}`);
                        });
                        await page.waitForTimeout(3000);
                        logger.info(`Navigated to booking page: ${page.url()}`);
                      } else {
                        logger.info('No booking link found inside accordion, checking for login/booking form on current page');
                        // Wait a bit more for content to load
                        await page.waitForTimeout(2000);
                      }
                    } else {
                      logger.warn('Accordion section not found after click, continuing with current page');
                    }
                  }
                } catch (accordionError) {
                  logger.warn(`Error handling accordion click: ${accordionError.message}, continuing...`);
                }
              } else {
                // Regular link - navigate directly
                const fullUrl = href.startsWith('http') ? href : new URL(href, page.url()).href;
                await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 60000 });
                await page.waitForTimeout(3000);
                logger.info(`Navigated to booking page: ${page.url()}`);
              }
            } else {
              // No href, try regular click
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
                appointmentLink.click()
              ]);
              await page.waitForTimeout(3000);
              logger.info(`Navigated to booking page: ${page.url()}`);
            }
          } catch (clickError) {
            logger.warn(`Error clicking appointment link: ${clickError.message}, continuing with current page`);
            // Continue with current page - slot extraction will try to find calendar anyway
          }
        } else {
          logger.warn('Appointment booking link not found, continuing with current page');
        }
      } catch (error) {
        logger.warn('Error navigating to booking page:', error.message);
      }

      // Check if we hit an "Access Denied" page (geographic restriction)
      try {
        const pageTitle = await page.title().catch(() => '');
        const pageText = await page.evaluate(() => document.body.textContent || '').catch(() => '');
        
        if (pageTitle.toLowerCase().includes('access denied') || 
            pageText.toLowerCase().includes('access denied') ||
            pageText.toLowerCase().includes('not accessible') ||
            pageText.toLowerCase().includes('outside the permitted country')) {
          logger.error('⚠️ Access Denied: The BLS website is blocking access due to geographic restrictions.');
          logger.error('⚠️ This usually means:');
          logger.error('   1. The server is not located in Algeria');
          logger.error('   2. A VPN/proxy is being detected and blocked');
          logger.error('   3. The website requires access from within Algeria');
          logger.error('⚠️ Solution: Deploy the monitor on a server located in Algeria, or configure a VPN/proxy that is not detected.');
          
          throw new Error('Access Denied: Geographic restriction detected. Server must be in Algeria or use undetected VPN.');
        }
      } catch (accessCheckError) {
        if (accessCheckError.message.includes('Access Denied')) {
          throw accessCheckError; // Re-throw access denied errors
        }
        // Ignore other errors in access check
      }
      
      // Wait a bit to simulate human behavior
      await page.waitForTimeout(2000);

      // Check for CAPTCHA - get user settings
      const { Settings } = require('../models');
      const settings = await Settings.findOne({ where: { user_id: monitor.user_id } });
      
      const captchaPresent = await page.$('#captcha, .g-recaptcha, [data-sitekey], .h-captcha').catch(() => null);
      if (captchaPresent && settings && settings.captcha_enabled) {
        logger.info('CAPTCHA detected, attempting to solve...');
        const captchaSolved = await CaptchaService.solveCaptcha(page);
        if (!captchaSolved) {
          logger.warn('Failed to solve CAPTCHA, but continuing...');
          // Don't throw error - continue and see if we can still extract slots
        } else {
          logger.info('CAPTCHA solved successfully');
          await page.waitForTimeout(2000); // Wait for page to process CAPTCHA
        }
      }

      // Fill booking form if it exists (#bookingForm structure)
      try {
        const bookingForm = await page.$('#bookingForm').catch(() => null);
        if (bookingForm) {
          logger.info('Booking form found, filling form fields...');
          
          // Select Visa Center (#locationSelect)
          const locationSelect = await page.$('#locationSelect').catch(() => null);
          if (locationSelect) {
            const center = monitor.bls_center.toLowerCase();
            const centerMapping = {
              'algiers_1': 'Algiers1',
              'algiers_2': 'Algiers2',
              'algiers_3': 'Algiers3',
              'algiers_4': 'Algiers4',
              'oran_1': 'Oran1',
              'oran_2': 'Oran2',
              'oran_3': 'Oran3'
            };
            
            const centerValue = centerMapping[monitor.bls_center] || monitor.bls_center;
            const options = await page.$$eval('#locationSelect option', options => 
              options.map(opt => ({ value: opt.value, text: opt.textContent.trim() }))
            );
            
            const matchingOption = options.find(opt => 
              opt.value === centerValue || 
              opt.value.toLowerCase().includes(center) ||
              opt.text.toLowerCase().includes(center)
            );
            
            if (matchingOption) {
              await page.select('#locationSelect', matchingOption.value);
              logger.info(`Selected visa center: ${matchingOption.text} (${matchingOption.value})`);
              await page.waitForTimeout(1000);
            }
          }
          
          // Select Visa Type (#visaTypeSelect)
          const visaTypeSelect = await page.$('#visaTypeSelect').catch(() => null);
          if (visaTypeSelect) {
            const visaCategory = monitor.profile?.visa_category || monitor.visa_category || 'tourist';
            const visaMapping = {
              'tourist': 'Tourist',
              'student': 'Student',
              'work': 'Work',
              'business': 'Business',
              'transit': 'Transit',
              'family': 'Family',
              'medical': 'Medical',
              'cultural': 'Cultural',
              'sports': 'Sports',
              'official': 'Official',
              'diplomatic': 'Diplomatic'
            };
            
            const visaValue = visaMapping[visaCategory.toLowerCase()] || visaCategory;
            const visaOptions = await page.$$eval('#visaTypeSelect option', options => 
              options.map(opt => ({ value: opt.value, text: opt.textContent.trim() }))
            );
            
            const matchingVisa = visaOptions.find(opt => 
              opt.value === visaValue ||
              opt.value.toLowerCase() === visaCategory.toLowerCase() ||
              opt.text.toLowerCase().includes(visaCategory.toLowerCase())
            );
            
            if (matchingVisa) {
              await page.select('#visaTypeSelect', matchingVisa.value);
              logger.info(`Selected visa type: ${matchingVisa.text} (${matchingVisa.value})`);
              await page.waitForTimeout(1000);
            }
          }
          
          // Select Appointment Type (#appointmentType)
          const appointmentTypeSelect = await page.$('#appointmentType').catch(() => null);
          if (appointmentTypeSelect) {
            const appointmentType = monitor.profile?.appointment_type || 'Individual';
            const apptOptions = await page.$$eval('#appointmentType option', options => 
              options.map(opt => ({ value: opt.value, text: opt.textContent.trim() }))
            );
            
            const matchingAppt = apptOptions.find(opt => 
              opt.value.toLowerCase() === appointmentType.toLowerCase() ||
              opt.text.toLowerCase().includes(appointmentType.toLowerCase())
            );
            
            if (matchingAppt) {
              await page.select('#appointmentType', matchingAppt.value);
              logger.info(`Selected appointment type: ${matchingAppt.text} (${matchingAppt.value})`);
              await page.waitForTimeout(1000);
            }
          }
          
          // Set date picker (#datepicker) - use today's date or a future date
          const datepicker = await page.$('#datepicker').catch(() => null);
          if (datepicker) {
            // Set date to today or a future date (some systems require a date to check availability)
            const today = new Date();
            const futureDate = new Date(today);
            futureDate.setDate(futureDate.getDate() + 7); // 7 days from now
            
            const dateString = futureDate.toISOString().split('T')[0]; // YYYY-MM-DD format
            await datepicker.click();
            await datepicker.type(dateString, { delay: 50 });
            await page.waitForTimeout(500);
            logger.info(`Set date picker to: ${dateString}`);
          }
          
          // Click Check Slots button (#checkSlots)
          const checkSlotsButton = await page.$('#checkSlots').catch(() => null);
          if (checkSlotsButton) {
            logger.info('Clicking Check Availability button...');
            await Promise.all([
              page.waitForSelector('#availableSlots', { timeout: 10000 }).catch(() => {}),
              checkSlotsButton.click()
            ]);
            await page.waitForTimeout(3000); // Wait for slots to load
            logger.info('Check slots button clicked, waiting for slots to load...');
          }
        } else {
          logger.info('Booking form (#bookingForm) not found, trying alternative selectors...');
          
          // Fallback to existing center/visa selection logic
          const center = monitor.bls_center.toLowerCase();
          const centerSelectors = [
            '#locationSelect',
            'select[name*="center"]',
            'select[id*="center"]',
            '#center',
            '#center_id',
            '#appointment_center'
          ];
          
          for (const selector of centerSelectors) {
            try {
              const centerElement = await page.$(selector);
              if (centerElement) {
                const options = await page.$$eval(`${selector} option`, options => 
                  options.map(opt => ({ value: opt.value, text: opt.textContent.trim() }))
                );
                
                const matchingOption = options.find(opt => 
                  opt.value.toLowerCase().includes(center) ||
                  opt.text.toLowerCase().includes(center)
                );
                
                if (matchingOption) {
                  await page.select(selector, matchingOption.value);
                  logger.info(`Selected center: ${matchingOption.text}`);
                  await page.waitForTimeout(2000);
                  break;
                }
              }
            } catch (e) {
              continue;
            }
          }
          
          // Select visa category
          const visaCategory = monitor.profile?.visa_category || monitor.visa_category;
          if (visaCategory) {
            const categorySelectors = [
              '#visaTypeSelect',
              '#visa_category',
              'select[name*="category"]',
              'select[name*="visa"]'
            ];
            
            for (const selector of categorySelectors) {
              try {
                const categorySelect = await page.$(selector);
                if (categorySelect) {
                  const options = await page.$$eval(`${selector} option`, options => 
                    options.map(opt => ({ value: opt.value, text: opt.textContent.trim().toLowerCase() }))
                  );
                  
                  const matchingOption = options.find(opt => 
                    opt.value.toLowerCase() === visaCategory.toLowerCase() ||
                    opt.text.includes(visaCategory.toLowerCase())
                  );
                  
                  if (matchingOption) {
                    await page.select(selector, matchingOption.value);
                    logger.info(`Selected visa category: ${matchingOption.value}`);
                    await page.waitForTimeout(2000);
                    break;
                  }
                }
              } catch (e) {
                continue;
              }
            }
          }
        }
      } catch (error) {
        logger.warn('Error filling booking form:', error.message);
      }
      
      // Log current page URL before extracting slots
      const currentPageUrl = page.url();
      logger.info(`Current page URL before slot extraction: ${currentPageUrl}`);
      
      // Extract appointment slots using comprehensive helper function
      let slots = [];
      try {
        logger.info('Starting slot extraction...');
        slots = await Promise.race([
          extractSlotsHelper(page, monitor.bls_center),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Slot extraction timeout after 60 seconds')), 60000))
        ]).catch(err => {
          logger.error(`Slot extraction error: ${err.message}`);
          return [];
        });
        logger.info(`Slot extraction completed: ${slots.length} slots found`);
      } catch (slotError) {
        logger.error(`Critical error during slot extraction: ${slotError.message}`);
        slots = [];
      }

      // Update monitor stats
      const updateData = {
        last_check: new Date(),
        total_checks: monitor.total_checks + 1
      };
      
      logger.info(`Monitor check completed for ${monitor.bls_center}: ${slots.length} slots found, last_check updated to ${updateData.last_check.toISOString()}`);

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

        // Send notifications for REAL slots found
        logger.info(`🎉 REAL SLOTS FOUND! Sending notifications to user ${monitor.user_id} for ${slots.length} slot(s) at ${monitor.bls_center}`);
        await NotificationService.notifySlotFound(monitor.user_id, {
          slots,
          center: monitor.bls_center,
          profileName: monitor.profile.profile_name
        }, io);
        logger.info(`✅ Real slot notifications sent successfully for monitor ${monitorId}`);

        // Handle autofill if enabled
        if (monitor.autofill_mode !== 'manual') {
          try {
            const AutofillService = require('./autofillService');
            const selectedSlot = slots[0]; // Use first available slot
            
            logger.info(`Autofill mode: ${monitor.autofill_mode}, attempting to fill form...`);
            
            // For semi and full modes, attempt autofill
            const autofillResult = await AutofillService.fillForm(
              monitor.profile,
              selectedSlot,
              monitor.autofill_mode
            );

            if (autofillResult.success) {
              logger.info(`Autofill completed: ${autofillResult.message}`);
              
              // Send autofill notification
              if (io) {
                io.to(`user-${monitor.user_id}`).emit('autofillComplete', {
                  monitorId: monitorId,
                  mode: monitor.autofill_mode,
                  url: autofillResult.url,
                  message: autofillResult.message
                });
              }
            }
          } catch (autofillError) {
            logger.error('Autofill error:', autofillError);
            // Don't fail monitoring if autofill fails
          }
        }

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

      // Schedule next check
      await this.scheduleNextCheck(monitorId, io);

      // Close page
      await page.close().catch(err => logger.warn(`Error closing page: ${err.message}`));

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
        
        const errorCount = (monitor.error_count || 0) + 1;
        
        // Always update last_check and schedule next check, even on error
        const updateData = {
          last_check: new Date(),
          total_checks: (monitor.total_checks || 0) + 1,
          error_count: errorCount,
          last_error: error.message.substring(0, 500),
          status: errorCount >= 5 ? 'error' : 'active' // Only set to error after 5 consecutive failures
        };
        
        await Monitor.update(updateData, { where: { id: monitorId } });
        
        // Schedule next check even if there was an error (unless too many errors)
        if (errorCount < 5) {
          await this.scheduleNextCheck(monitorId, io);
        } else {
          logger.warn(`Monitor ${monitorId} has ${errorCount} consecutive errors, pausing automatic checks`);
        }

        // Send error notification if error count reaches threshold
        if (errorCount >= 3) {
          try {
            await NotificationService.notifyError(monitor.user_id, {
              monitorId: monitorId,
              error: error.message,
              errorCount: errorCount,
              center: monitor.bls_center,
              profileName: monitor.profile?.profile_name
            });
          } catch (notifError) {
            logger.error('Error sending error notification:', notifError);
          }
        }

        if (io) {
          io.to(`user-${monitor.user_id}`).emit('statusUpdate', {
            id: monitorId,
            message: `Error: ${error.message}`,
            timestamp: new Date(),
            error: true
          });

          io.to(`user-${monitor.user_id}`).emit('monitorError', {
            id: monitorId,
            error: error.message,
            errorCount: errorCount
          });
        }
      }

      // Always close page if it exists, even on error
      try {
        const pages = await this.browsers.get(monitorId)?.pages();
        if (pages && pages.length > 0) {
          // Close the last page (should be the one we created)
          const lastPage = pages[pages.length - 1];
          if (lastPage && !lastPage.isClosed()) {
            await lastPage.close().catch(err => logger.warn(`Error closing page: ${err.message}`));
          }
        }
      } catch (closeError) {
        logger.warn(`Error closing page: ${closeError.message}`);
      }
    }
  }

  // extractSlots method moved to extractSlotsHelper.js for better organization
  // The helper function includes multiple extraction strategies and is more robust
}

// Export singleton instance
module.exports = new MonitorService();


