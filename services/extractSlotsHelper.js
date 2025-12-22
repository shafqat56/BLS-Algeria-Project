/**
 * Helper functions for extracting appointment slots from BLS Algeria website
 * This file contains common selector patterns and utilities
 */

const logger = require('../utils/logger');

/**
 * Common selectors for appointment booking systems
 * Updated for BLS Algeria website (https://algeria.blsspainvisa.com/)
 */
const SELECTORS = {
  // Calendar/Date picker patterns (BLS specific)
  calendar: [
    '.calendar',
    '.date-picker',
    '.appointment-calendar',
    '#calendar',
    '[class*="calendar"]',
    '[id*="calendar"]',
    '.ui-datepicker', // jQuery UI datepicker
    '.datepicker',
    '.flatpickr-calendar',
    '[class*="datepicker"]',
    'table.calendar',
    '.booking-calendar',
    // BLS Algeria specific patterns
    '.appointment-date',
    '.slot-calendar',
    '[class*="appointment"]',
    'table[class*="date"]',
    '.date-selector',
    '#appointment-calendar',
    // Generic table-based calendars
    'table tbody tr td',
    '.calendar-table',
    '[role="grid"]', // ARIA calendar
    '[role="gridcell"]'
  ],
  
  // Available date patterns (BLS specific)
  availableDate: [
    '.available-date',
    '.slot-available',
    '[data-available="true"]',
    '[class*="available"]',
    '.date-available',
    '.appointment-available',
    'td.available',
    '.day.available',
    '[data-date]:not(.disabled):not(.unavailable)',
    'td:not(.disabled):not(.unavailable)',
    '.ui-state-default:not(.ui-state-disabled)', // jQuery UI
    'td.ui-state-default:not(.ui-state-disabled)',
    'a.ui-state-default:not(.ui-state-disabled)',
    '.flatpickr-day:not(.flatpickr-disabled)',
    '[class*="day"]:not([class*="disabled"]):not([class*="unavailable"])',
    'button[data-date]:not([disabled])',
    'a[data-date]:not([class*="disabled"])'
  ],
  
  // Disabled/unavailable patterns (to exclude)
  unavailableDate: [
    '.disabled',
    '.unavailable',
    '.booked',
    '.past',
    '[data-available="false"]',
    '[class*="disabled"]',
    '[class*="unavailable"]',
    '.ui-state-disabled',
    '.flatpickr-disabled',
    '[aria-disabled="true"]'
  ],
  
  // Time slot patterns (BLS specific)
  // Primary selector: #availableSlots .slot with data-time attribute
  timeSlot: [
    '#availableSlots .slot', // Primary selector from BLS structure
    '#availableSlots button.slot',
    '#availableSlots [data-time]',
    '.time-slot',
    '.appointment-time',
    '[data-time]',
    '.slot-time',
    '.available-time',
    'button[data-time]',
    '[class*="time-slot"]',
    '.time-button',
    'button.time',
    'a.time',
    '.slot',
    '[class*="slot"]:not([class*="unavailable"])',
    'li[data-time]',
    'div[data-time]'
  ],
  
  // Center/Visa category selection
  centerSelect: [
    '#center',
    '#center_id',
    '#appointment_center',
    'select[name*="center"]',
    '[name="center"]'
  ],
  
  visaCategorySelect: [
    '#visa_category',
    '#category',
    '#appointment_type',
    'select[name*="category"]',
    'select[name*="visa"]'
  ],
  
  // Loading indicators
  loading: [
    '.loading',
    '.spinner',
    '[class*="loading"]',
    '#loading',
    '.loader',
    '[class*="spinner"]'
  ],
  
  // BLS specific: No slots available message
  noSlotsMessage: [
    '#availableSlots p', // Check for <p> inside #availableSlots (from structure)
    '#availableSlots:has-text("No appointments available")',
    '.no-slots',
    '.no-appointments',
    '[class*="no-slot"]',
    '[class*="no-appointment"]',
    '.message:has-text("no")',
    '.alert:has-text("no available")'
  ]
};

/**
 * Extract slots from BLS Algeria website
 * @param {Page} page - Puppeteer page object
 * @param {string} center - BLS center code (e.g., 'algiers_1', 'algiers_2', etc.)
 * @returns {Array} Array of slot objects with date, time, and center
 */
async function extractSlots(page, center) {
  const slots = [];
  
  try {
    // Wait for page to be interactive and any AJAX to complete
    await page.waitForTimeout(3000);
    
    // Wait for any loading indicators to disappear
    for (const loadingSelector of SELECTORS.loading) {
      try {
        await page.waitForSelector(loadingSelector, { hidden: true, timeout: 5000 }).catch(() => {});
      } catch (e) {
        // Loading indicator not found or already hidden, continue
      }
    }
    
    // Log page title and URL for debugging
    const pageTitle = await page.title().catch(() => 'Unknown');
    const pageUrl = page.url();
    logger.info(`Extracting slots from page: ${pageTitle} (${pageUrl})`);
    
    // Check for "no slots available" message first
    const noSlotsFound = await checkNoSlotsMessage(page);
    if (noSlotsFound) {
      logger.info('No slots available message detected');
      return [];
    }
    
    // Debug: Log page HTML structure to understand what's available
    try {
      const pageContent = await page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          hasCalendar: !!document.querySelector('[class*="calendar"], [id*="calendar"], table, .datepicker, .ui-datepicker'),
          hasAppointmentLinks: !!document.querySelector('a[href*="appointment"], a[href*="book"], button[class*="appointment"]'),
          bodyText: document.body.innerText.substring(0, 500) // First 500 chars
        };
      });
      logger.info(`Page structure check:`, JSON.stringify(pageContent, null, 2));
    } catch (debugError) {
      logger.warn('Could not analyze page structure:', debugError.message);
    }
    
    // Method 1: Look for calendar with available dates (most common for BLS)
    const calendarSlots = await extractFromCalendar(page, center);
    if (calendarSlots.length > 0) {
      logger.info(`Found ${calendarSlots.length} slots via calendar method`);
      slots.push(...calendarSlots);
    } else {
      logger.info('No calendar found on page');
    }
    
    // Method 2: Look for time slot buttons/elements
    const timeSlotResults = await extractFromTimeSlots(page, center);
    if (timeSlotResults.length > 0) {
      logger.info(`Found ${timeSlotResults.length} slots via time slot method`);
      slots.push(...timeSlotResults);
    }
    
    // Method 3: Look for available appointment dates in tables/lists
    const listSlots = await extractFromList(page, center);
    if (listSlots.length > 0) {
      logger.info(`Found ${listSlots.length} slots via list method`);
      slots.push(...listSlots);
    }
    
    // Method 4: Try to extract from any clickable date elements
    const clickableSlots = await extractFromClickableDates(page, center);
    if (clickableSlots.length > 0) {
      logger.info(`Found ${clickableSlots.length} slots via clickable dates method`);
      slots.push(...clickableSlots);
    }
    
    // Remove duplicates based on date and time
    const uniqueSlots = removeDuplicates(slots);
    
    logger.info(`Total unique slots found: ${uniqueSlots.length}`);
    
    // If no slots found, take a screenshot for debugging
    if (uniqueSlots.length === 0) {
      try {
        const screenshotPath = `logs/debug-no-slots-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        logger.info(`No slots found - debug screenshot saved to ${screenshotPath}`);
      } catch (screenshotError) {
        logger.error('Failed to take screenshot:', screenshotError);
      }
    }
    
    return uniqueSlots;
    
  } catch (error) {
    logger.error('Error in extractSlots:', error);
    
    // Take a screenshot for debugging
    try {
      const screenshotPath = `logs/debug-slot-extraction-error-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      logger.info(`Error screenshot saved to ${screenshotPath}`);
    } catch (screenshotError) {
      logger.error('Failed to take screenshot:', screenshotError);
    }
    
    return [];
  }
}

/**
 * Check if page shows "no slots available" message
 */
async function checkNoSlotsMessage(page) {
  try {
    for (const selector of SELECTORS.noSlotsMessage) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await element.evaluate(el => el.textContent.toLowerCase());
          if (text.includes('no') && (text.includes('slot') || text.includes('appointment') || text.includes('available'))) {
            return true;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    // Also check page text content
    const pageText = await page.evaluate(() => document.body.textContent.toLowerCase());
    if (pageText.includes('no appointment') || pageText.includes('no slot') || 
        pageText.includes('no available') || pageText.includes('fully booked')) {
      return true;
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Extract slots from calendar/date picker
 */
async function extractFromCalendar(page, center) {
  const slots = [];
  
  try {
    // Try to find calendar element
    let calendarFound = false;
    for (const selector of SELECTORS.calendar) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        calendarFound = true;
        logger.info(`Calendar found with selector: ${selector}`);
        break;
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!calendarFound) {
      // Try to find any date-related elements
      const dateElements = await page.$$('[data-date], [class*="date"], [id*="date"]').catch(() => []);
      if (dateElements.length > 0) {
        logger.info(`Found ${dateElements.length} potential date elements`);
        calendarFound = true;
      }
    }
    
    if (!calendarFound) {
      logger.info('No calendar found on page');
      return slots; // No calendar found
    }
    
    // Look for available dates with multiple strategies
    for (const selector of SELECTORS.availableDate) {
      try {
        // Wait a bit for calendar to render
        await page.waitForTimeout(1000);
        
        const availableDates = await page.$$eval(selector, (elements) => {
          return elements
            .filter(el => {
              // Exclude disabled/unavailable dates
              const classes = el.className || '';
              const hasDisabled = classes.includes('disabled') || 
                                 classes.includes('unavailable') || 
                                 classes.includes('past') ||
                                 classes.includes('booked') ||
                                 classes.includes('ui-state-disabled') ||
                                 el.hasAttribute('disabled') ||
                                 el.getAttribute('aria-disabled') === 'true';
              
              // Check if element is visible
              const style = window.getComputedStyle(el);
              const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
              
              return !hasDisabled && isVisible;
            })
            .map(el => {
              // Try multiple ways to get the date
              const date = el.getAttribute('data-date') || 
                          el.getAttribute('data-value') ||
                          el.getAttribute('title') ||
                          el.getAttribute('aria-label') ||
                          el.getAttribute('data-day') ||
                          el.textContent.trim();
              
              const time = el.getAttribute('data-time') || null;
              const fullText = el.textContent.trim();
              
              // Get parent date if this is a time slot
              const parentDate = el.closest('[data-date]')?.getAttribute('data-date');
              
              return { 
                date: date || parentDate, 
                time, 
                text: fullText,
                elementTag: el.tagName.toLowerCase()
              };
            })
            .filter(item => item.date && item.date.trim() !== '');
        }).catch(() => []);
        
        if (availableDates.length > 0) {
          logger.info(`Found ${availableDates.length} available dates with selector: ${selector}`);
          
          for (const item of availableDates) {
            if (item.date) {
              try {
                const dateObj = parseDate(item.date);
                if (dateObj && isValidFutureDate(dateObj)) {
                  slots.push({
                    date: dateObj,
                    time: item.time || null,
                    center: center,
                    source: 'calendar',
                    rawText: item.text
                  });
                }
              } catch (dateError) {
                logger.warn(`Failed to parse date: ${item.date}`, dateError);
              }
            }
          }
          
          if (slots.length > 0) {
            break; // Found dates, no need to try other selectors
          }
        }
      } catch (error) {
        logger.debug(`Selector ${selector} failed: ${error.message}`);
        // Try next selector
        continue;
      }
    }
    
    // If no slots found with standard selectors, try extracting from table cells
    if (slots.length === 0) {
      try {
        const tableSlots = await page.$$eval('table td, table th', (cells) => {
          return cells
            .filter(cell => {
              const classes = cell.className || '';
              const text = cell.textContent.trim();
              const hasDate = /\d{1,2}/.test(text) && text.length < 10;
              const isDisabled = classes.includes('disabled') || 
                                classes.includes('unavailable') ||
                                cell.hasAttribute('disabled');
              return hasDate && !isDisabled && cell.offsetParent !== null; // visible
            })
            .map(cell => ({
              date: cell.getAttribute('data-date') || 
                    cell.getAttribute('title') ||
                    cell.textContent.trim(),
              text: cell.textContent.trim()
            }));
        }).catch(() => []);
        
        if (tableSlots.length > 0) {
          logger.info(`Found ${tableSlots.length} potential dates in table cells`);
          for (const item of tableSlots) {
            try {
              const dateObj = parseDate(item.date);
              if (dateObj && isValidFutureDate(dateObj)) {
                slots.push({
                  date: dateObj,
                  time: null,
                  center: center,
                  source: 'calendar-table',
                  rawText: item.text
                });
              }
            } catch (e) {
              // Skip invalid dates
            }
          }
        }
      } catch (error) {
        logger.debug('Table extraction failed:', error.message);
      }
    }
    
  } catch (error) {
    logger.error('Error extracting from calendar:', error);
  }
  
  return slots;
}

/**
 * Extract slots from time slot elements
 * Primary method for BLS structure: #availableSlots .slot with data-time
 */
async function extractFromTimeSlots(page, center) {
  const slots = [];
  
  try {
    // First, check for #availableSlots container (BLS structure)
    const availableSlotsContainer = await page.$('#availableSlots').catch(() => null);
    if (availableSlotsContainer) {
      logger.info('Found #availableSlots container, extracting slots...');
      
      // Check for "no slots" message first
      const noSlotsMsg = await page.$eval('#availableSlots p', el => el.textContent.trim().toLowerCase()).catch(() => '');
      if (noSlotsMsg.includes('no appointment') || noSlotsMsg.includes('no slot') || noSlotsMsg.includes('no available')) {
        logger.info('No slots available message found in #availableSlots');
        return slots;
      }
      
      // Extract slots from #availableSlots .slot elements
      const timeSlots = await page.$$eval('#availableSlots .slot', (elements) => {
        return elements
          .filter(el => {
            const classes = el.className || '';
            return !classes.includes('disabled') && 
                   !classes.includes('unavailable') &&
                   !el.disabled &&
                   el.offsetParent !== null; // visible
          })
          .map(el => ({
            time: el.getAttribute('data-time') || el.textContent.trim(),
            date: el.getAttribute('data-date') || el.closest('[data-date]')?.getAttribute('data-date'),
            text: el.textContent.trim()
          }));
      }).catch(() => []);
      
      if (timeSlots.length > 0) {
        logger.info(`Found ${timeSlots.length} slots in #availableSlots container`);
        
        // Get date from datepicker if available
        let selectedDate = null;
        try {
          const datepickerValue = await page.$eval('#datepicker', el => el.value).catch(() => null);
          if (datepickerValue) {
            selectedDate = parseDate(datepickerValue);
            logger.info(`Using date from datepicker: ${datepickerValue}`);
          }
        } catch (e) {
          // Datepicker not found or no value, will use slot date or today
        }
        
        for (const slot of timeSlots) {
          try {
            // Get date from datepicker, slot date attribute, or use today's date
            let dateObj = null;
            if (selectedDate) {
              dateObj = selectedDate;
            } else if (slot.date) {
              dateObj = parseDate(slot.date);
            } else {
              // Use today's date if no date found
              dateObj = new Date();
              dateObj.setHours(0, 0, 0, 0);
            }
            
            if (dateObj && isValidFutureDate(dateObj)) {
              slots.push({
                date: dateObj,
                time: slot.time || slot.text,
                center: center,
                source: 'availableSlots'
              });
            }
          } catch (error) {
            logger.warn(`Failed to process slot: ${slot.time}`, error.message);
          }
        }
        
        if (slots.length > 0) {
          return slots; // Return early if we found slots using primary method
        }
      }
    }
    
    // Fallback to other selectors if #availableSlots not found or empty
    for (const selector of SELECTORS.timeSlot) {
      // Skip if we already tried #availableSlots .slot
      if (selector === '#availableSlots .slot') continue;
      
      try {
        const timeSlots = await page.$$eval(selector, (elements) => {
          return elements
            .filter(el => {
              const classes = el.className || '';
              return !classes.includes('disabled') && 
                     !classes.includes('unavailable') &&
                     !el.disabled &&
                     el.offsetParent !== null;
            })
            .map(el => ({
              time: el.getAttribute('data-time') || el.textContent.trim(),
              date: el.getAttribute('data-date') || el.closest('[data-date]')?.getAttribute('data-date'),
              text: el.textContent.trim()
            }));
        }).catch(() => []);
        
        if (timeSlots.length > 0) {
          logger.info(`Found ${timeSlots.length} time slots with selector: ${selector}`);
          
          for (const slot of timeSlots) {
            try {
              let dateObj = null;
              if (slot.date) {
                dateObj = parseDate(slot.date);
              } else {
                dateObj = new Date();
                dateObj.setHours(0, 0, 0, 0);
              }
              
              if (dateObj && isValidFutureDate(dateObj)) {
                slots.push({
                  date: dateObj,
                  time: slot.time || null,
                  center: center,
                  source: 'time-slot'
                });
              }
            } catch (error) {
              // Skip invalid slot
            }
          }
          break;
        }
      } catch (error) {
        continue;
      }
    }
  } catch (error) {
    logger.error('Error extracting from time slots:', error);
  }
  
  return slots;
}

/**
 * Extract slots from list/table of appointments
 */
async function extractFromList(page, center) {
  const slots = [];
  
  try {
    // Look for appointment lists or tables
    const listSelectors = [
      '.appointment-list',
      '.available-slots',
      'table.appointments',
      '[class*="appointment-list"]',
      '.slot-list',
      '.appointments',
      '[class*="slot"]',
      'ul.appointments',
      'ol.appointments'
    ];
    
    for (const selector of listSelectors) {
      try {
        const items = await page.$$eval(`${selector} li, ${selector} tr, ${selector} .slot-item, ${selector} div[class*="slot"]`, (elements) => {
          return elements
            .filter(el => el.offsetParent !== null) // visible
            .map(el => ({
              text: el.textContent.trim(),
              date: el.getAttribute('data-date') || 
                    el.querySelector('[data-date]')?.getAttribute('data-date') ||
                    el.getAttribute('title'),
              time: el.getAttribute('data-time') ||
                    el.querySelector('[data-time]')?.getAttribute('data-time'),
              href: el.getAttribute('href') || el.querySelector('a')?.getAttribute('href')
            }));
        }).catch(() => []);
        
        if (items.length > 0) {
          logger.info(`Found ${items.length} items in list with selector: ${selector}`);
          for (const item of items) {
            if (item.text && (item.text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/) || item.date || item.text.match(/\d{4}/))) {
              try {
                const dateObj = parseDate(item.date || item.text);
                if (dateObj && isValidFutureDate(dateObj)) {
                  slots.push({
                    date: dateObj,
                    time: item.time || extractTimeFromText(item.text),
                    center: center,
                    source: 'list',
                    rawText: item.text
                  });
                }
              } catch (error) {
                // Skip invalid
              }
            }
          }
          if (slots.length > 0) {
            break;
          }
        }
      } catch (error) {
        continue;
      }
    }
  } catch (error) {
    logger.error('Error extracting from list:', error);
  }
  
  return slots;
}

/**
 * Extract slots from clickable date elements (buttons, links)
 */
async function extractFromClickableDates(page, center) {
  const slots = [];
  
  try {
    // Look for clickable date elements
    const clickableSelectors = [
      'button[data-date]',
      'a[data-date]',
      'button[onclick*="date"]',
      'a[href*="date"]',
      '.date-button',
      '.date-link',
      '[role="button"][data-date]'
    ];
    
    for (const selector of clickableSelectors) {
      try {
        const elements = await page.$$eval(selector, (els) => {
          return els
            .filter(el => {
              const classes = el.className || '';
              const isDisabled = classes.includes('disabled') || 
                               classes.includes('unavailable') ||
                               el.hasAttribute('disabled');
              return !isDisabled && el.offsetParent !== null;
            })
            .map(el => ({
              date: el.getAttribute('data-date') ||
                    el.getAttribute('data-value') ||
                    el.getAttribute('title') ||
                    el.textContent.trim(),
              time: el.getAttribute('data-time'),
              text: el.textContent.trim()
            }));
        }).catch(() => []);
        
        if (elements.length > 0) {
          logger.info(`Found ${elements.length} clickable date elements with selector: ${selector}`);
          for (const item of elements) {
            if (item.date) {
              try {
                const dateObj = parseDate(item.date);
                if (dateObj && isValidFutureDate(dateObj)) {
                  slots.push({
                    date: dateObj,
                    time: item.time || null,
                    center: center,
                    source: 'clickable',
                    rawText: item.text
                  });
                }
              } catch (error) {
                // Skip invalid
              }
            }
          }
          if (slots.length > 0) {
            break;
          }
        }
      } catch (error) {
        continue;
      }
    }
  } catch (error) {
    logger.error('Error extracting from clickable dates:', error);
  }
  
  return slots;
}

/**
 * Parse date string to Date object
 * Handles various date formats
 */
function parseDate(dateString) {
  if (!dateString) return null;
  
  // Remove extra whitespace
  dateString = dateString.trim();
  
  // Try ISO format first
  let date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // Try common formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
  const formats = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,  // DD/MM/YYYY or DD-MM-YYYY
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,  // YYYY-MM-DD
  ];
  
  for (const format of formats) {
    const match = dateString.match(format);
    if (match) {
      if (match[3] && match[3].length === 4) {
        // DD/MM/YYYY format
        date = new Date(`${match[3]}-${match[2]}-${match[1]}`);
      } else {
        // YYYY-MM-DD format
        date = new Date(`${match[1]}-${match[2]}-${match[3]}`);
      }
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  // Try parsing as is
  date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Check if date is valid and in the future
 */
function isValidFutureDate(date) {
  if (!date || isNaN(date.getTime())) {
    return false;
  }
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  return checkDate >= now;
}

/**
 * Extract time from text string
 */
function extractTimeFromText(text) {
  const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (timeMatch) {
    return timeMatch[0];
  }
  return null;
}

/**
 * Remove duplicate slots
 */
function removeDuplicates(slots) {
  const seen = new Set();
  return slots.filter(slot => {
    const key = `${slot.date.toISOString()}-${slot.time || ''}-${slot.center}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

module.exports = {
  extractSlots,
  SELECTORS
};

