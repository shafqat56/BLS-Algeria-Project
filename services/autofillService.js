const puppeteer = require('puppeteer');
const logger = require('../utils/logger');
const CaptchaService = require('./captchaService');

class AutofillService {
  /**
   * Fill BLS website form with profile data
   * @param {Object} profile - Profile data from database
   * @param {Object} slot - Selected slot (date, time)
   * @param {string} mode - 'semi' or 'full' autofill mode
   * @returns {Object} Result with success status and booking URL
   */
  async fillForm(profile, slot, mode = 'semi') {
    let browser = null;
    let page = null;

    try {
      logger.info(`Starting autofill for profile ${profile.id} in ${mode} mode`);

      // Launch browser
      browser = await puppeteer.launch({
        headless: mode === 'full' ? "new" : false, // Use new headless mode for full, show browser for semi mode
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled'
        ]
      });

      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Navigate to BLS website
      const baseUrl = process.env.BLS_ALGERIA_URL || 'https://algeria.blsspainvisa.com/';
      const center = profile.bls_center.toLowerCase();
      const isAlgiers = center.startsWith('algiers');
      const centerUrl = isAlgiers 
        ? 'https://algeria.blsspainvisa.com/algiers'
        : 'https://algeria.blsspainvisa.com/oran';

      logger.info(`Navigating to ${centerUrl}`);
      await page.goto(centerUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Navigate to booking page
      await this.navigateToBookingPage(page);

      // Handle CAPTCHA if present
      const { Settings } = require('../models');
      const settings = await Settings.findOne({ where: { user_id: profile.user_id } });
      
      if (settings && settings.captcha_enabled) {
        const captchaPresent = await page.$('#captcha, .g-recaptcha, [data-sitekey], .h-captcha').catch(() => null);
        if (captchaPresent) {
          logger.info('CAPTCHA detected, attempting to solve...');
          await CaptchaService.solveCaptcha(page);
          await page.waitForTimeout(2000);
        }
      }

      // Select slot if provided
      if (slot && slot.date) {
        await this.selectSlot(page, slot);
      }

      // Fill form fields
      await this.fillFormFields(page, profile);

      // For semi mode, return URL for user to complete
      if (mode === 'semi') {
        const currentUrl = page.url();
        logger.info(`Form filled in semi mode. User can complete at: ${currentUrl}`);
        
        // Keep browser open for user interaction
        return {
          success: true,
          mode: 'semi',
          url: currentUrl,
          message: 'Form filled. Please complete the booking manually.',
          browser: browser // Return browser instance to keep it open
        };
      }

      // For full mode, attempt to submit
      if (mode === 'full') {
        const submitted = await this.submitForm(page);
        
        if (submitted) {
          logger.info('Form submitted successfully in full auto mode');
          return {
            success: true,
            mode: 'full',
            message: 'Booking attempt completed. Please verify on BLS website.',
            url: page.url()
          };
        } else {
          return {
            success: false,
            mode: 'full',
            message: 'Could not automatically submit form. Please complete manually.',
            url: page.url()
          };
        }
      }

      await browser.close();
      return { success: true };

    } catch (error) {
      logger.error('Error in autofill service:', error);
      
      if (browser) {
        await browser.close().catch(() => {});
      }

      return {
        success: false,
        error: error.message,
        message: 'Autofill failed. Please fill the form manually.'
      };
    }
  }

  /**
   * Navigate to booking page
   */
  async navigateToBookingPage(page) {
    try {
      const appointmentSelectors = [
        'a[href*="appointment"]',
        'a[href*="book"]',
        'a[href*="booking"]',
        'a:has-text("Book Appointment")',
        'a:has-text("Book")',
        'button:has-text("Book")',
        '.book-appointment',
        '.appointment-link'
      ];

      for (const selector of appointmentSelectors) {
        try {
          const link = await page.$(selector);
          if (link) {
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
              link.click()
            ]);
            await page.waitForTimeout(2000);
            logger.info('Navigated to booking page');
            return;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      logger.warn('Could not navigate to booking page:', error.message);
    }
  }

  /**
   * Select appointment slot (date and time)
   */
  async selectSlot(page, slot) {
    try {
      const date = new Date(slot.date);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const dateFormats = [
        dateStr,
        date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }), // MM/DD/YYYY
        date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) // DD/MM/YYYY
      ];

      // Try to find and click the date
      for (const dateFormat of dateFormats) {
        const dateSelectors = [
          `[data-date="${dateFormat}"]`,
          `[data-date="${dateStr}"]`,
          `button[aria-label*="${dateFormat}"]`,
          `td:has-text("${date.getDate()}")`,
          `.day:has-text("${date.getDate()}")`
        ];

        for (const selector of dateSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              const isDisabled = await element.evaluate(el => 
                el.classList.contains('disabled') || 
                el.classList.contains('unavailable') ||
                el.hasAttribute('disabled')
              );
              
              if (!isDisabled) {
                await element.click();
                await page.waitForTimeout(1000);
                logger.info(`Selected date: ${dateFormat}`);
                
                // If time is provided, select it
                if (slot.time) {
                  await this.selectTime(page, slot.time);
                }
                return;
              }
            }
          } catch (e) {
            continue;
          }
        }
      }
    } catch (error) {
      logger.warn('Could not select slot:', error.message);
    }
  }

  /**
   * Select time slot
   */
  async selectTime(page, time) {
    try {
      const timeSelectors = [
        `[data-time="${time}"]`,
        `button:has-text("${time}")`,
        `.time-slot:has-text("${time}")`,
        `li:has-text("${time}")`
      ];

      for (const selector of timeSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.click();
            await page.waitForTimeout(1000);
            logger.info(`Selected time: ${time}`);
            return;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      logger.warn('Could not select time:', error.message);
    }
  }

  /**
   * Fill form fields with profile data
   */
  async fillFormFields(page, profile) {
    try {
      logger.info('Filling form fields with profile data');

      // Common form field selectors
      const fieldMappings = {
        full_name: [
          'input[name*="name"]',
          'input[id*="name"]',
          '#full_name',
          '#name',
          'input[placeholder*="name" i]',
          'input[placeholder*="Name" i]'
        ],
        passport_number: [
          'input[name*="passport"]',
          'input[id*="passport"]',
          '#passport_number',
          '#passport',
          'input[placeholder*="passport" i]'
        ],
        email: [
          'input[type="email"]',
          'input[name*="email"]',
          'input[id*="email"]',
          '#email'
        ],
        phone: [
          'input[type="tel"]',
          'input[name*="phone"]',
          'input[name*="mobile"]',
          'input[id*="phone"]',
          '#phone',
          '#mobile'
        ],
        date_of_birth: [
          'input[type="date"][name*="birth"]',
          'input[name*="dob"]',
          'input[id*="birth"]',
          '#date_of_birth',
          '#dob'
        ],
        nationality: [
          'select[name*="nationality"]',
          'select[id*="nationality"]',
          '#nationality',
          'input[name*="nationality"]'
        ],
        visa_category: [
          'select[name*="visa"]',
          'select[name*="category"]',
          '#visa_category',
          '#category'
        ]
      };

      // Fill each field
      for (const [fieldName, selectors] of Object.entries(fieldMappings)) {
        const value = profile[fieldName];
        if (!value) continue;

        let filled = false;
        for (const selector of selectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              const tagName = await element.evaluate(el => el.tagName.toLowerCase());
              
              if (tagName === 'select') {
                // Handle dropdown
                const options = await page.$$eval(`${selector} option`, options => 
                  options.map(opt => ({ value: opt.value, text: opt.textContent.trim().toLowerCase() }))
                );
                
                const matchingOption = options.find(opt => 
                  opt.text.includes(value.toLowerCase()) ||
                  opt.value.toLowerCase() === value.toLowerCase()
                );
                
                if (matchingOption) {
                  await page.select(selector, matchingOption.value);
                  logger.info(`Filled ${fieldName} (select): ${matchingOption.value}`);
                  filled = true;
                  break;
                }
              } else {
                // Handle input field
                await element.click({ clickCount: 3 }); // Select all
                await element.type(String(value), { delay: 50 }); // Type with delay
                logger.info(`Filled ${fieldName} (input): ${value}`);
                filled = true;
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }

        if (filled) {
          await page.waitForTimeout(300); // Small delay between fields
        }
      }

      logger.info('Form fields filled successfully');
    } catch (error) {
      logger.error('Error filling form fields:', error);
      throw error;
    }
  }

  /**
   * Submit the form (full auto mode)
   */
  async submitForm(page) {
    try {
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Submit")',
        'button:has-text("Book")',
        'button:has-text("Confirm")',
        '#submit',
        '.submit-button',
        'form button[type="submit"]'
      ];

      for (const selector of submitSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            const isDisabled = await button.evaluate(el => el.disabled);
            if (!isDisabled) {
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
                button.click()
              ]);
              await page.waitForTimeout(2000);
              logger.info('Form submitted');
              return true;
            }
          }
        } catch (e) {
          continue;
        }
      }

      logger.warn('Could not find submit button');
      return false;
    } catch (error) {
      logger.error('Error submitting form:', error);
      return false;
    }
  }
}

module.exports = new AutofillService();

