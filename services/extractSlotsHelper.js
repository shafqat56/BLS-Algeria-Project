/**
 * Helper functions for extracting appointment slots from BLS Algeria website
 * This file contains common selector patterns and utilities
 */

const logger = require('../utils/logger');

/**
 * Common selectors for appointment booking systems
 * Update these based on actual BLS Algeria website inspection
 */
const SELECTORS = {
  // Calendar/Date picker patterns
  calendar: [
    '.calendar',
    '.date-picker',
    '.appointment-calendar',
    '#calendar',
    '[class*="calendar"]',
    '[id*="calendar"]'
  ],
  
  // Available date patterns
  availableDate: [
    '.available-date',
    '.slot-available',
    '[data-available="true"]',
    '[class*="available"]',
    '.date-available',
    '.appointment-available',
    'td.available',
    '.day.available',
    '[data-date]:not(.disabled):not(.unavailable)'
  ],
  
  // Disabled/unavailable patterns (to exclude)
  unavailableDate: [
    '.disabled',
    '.unavailable',
    '.booked',
    '.past',
    '[data-available="false"]',
    '[class*="disabled"]',
    '[class*="unavailable"]'
  ],
  
  // Time slot patterns
  timeSlot: [
    '.time-slot',
    '.appointment-time',
    '[data-time]',
    '.slot-time',
    '.available-time',
    'button[data-time]',
    '[class*="time-slot"]'
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
    '#loading'
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
    // Wait for page to be interactive
    await page.waitForTimeout(3000);
    
    // Log page title for debugging
    const pageTitle = await page.title().catch(() => 'Unknown');
    logger.info(`Extracting slots from page: ${pageTitle}`);
    
    // Method 1: Look for calendar with available dates
    const calendarSlots = await extractFromCalendar(page, center);
    if (calendarSlots.length > 0) {
      logger.info(`Found ${calendarSlots.length} slots via calendar method`);
      slots.push(...calendarSlots);
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
    
    // Remove duplicates based on date and time
    const uniqueSlots = removeDuplicates(slots);
    
    logger.info(`Total unique slots found: ${uniqueSlots.length}`);
    return uniqueSlots;
    
  } catch (error) {
    logger.error('Error in extractSlots:', error);
    
    // Take a screenshot for debugging
    try {
      await page.screenshot({ path: `debug-slot-extraction-${Date.now()}.png`, fullPage: true });
      logger.info('Debug screenshot saved');
    } catch (screenshotError) {
      logger.error('Failed to take screenshot:', screenshotError);
    }
    
    return [];
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
      return slots; // No calendar found
    }
    
    // Look for available dates
    for (const selector of SELECTORS.availableDate) {
      try {
        const availableDates = await page.$$eval(selector, (elements) => {
          return elements
            .filter(el => {
              // Exclude disabled/unavailable dates
              const classes = el.className || '';
              const hasDisabled = classes.includes('disabled') || 
                                 classes.includes('unavailable') || 
                                 classes.includes('past') ||
                                 classes.includes('booked');
              return !hasDisabled && !el.disabled;
            })
            .map(el => {
              const date = el.getAttribute('data-date') || 
                          el.getAttribute('data-value') ||
                          el.textContent.trim();
              const time = el.getAttribute('data-time') || null;
              return { date, time, text: el.textContent.trim() };
            });
        }).catch(() => []);
        
        if (availableDates.length > 0) {
          logger.info(`Found ${availableDates.length} available dates with selector: ${selector}`);
          
          for (const item of availableDates) {
            if (item.date) {
              try {
                const dateObj = parseDate(item.date);
                if (dateObj && dateObj > new Date()) {
                  slots.push({
                    date: dateObj,
                    time: item.time || null,
                    center: center,
                    source: 'calendar'
                  });
                }
              } catch (dateError) {
                logger.warn(`Failed to parse date: ${item.date}`, dateError);
              }
            }
          }
          break; // Found dates, no need to try other selectors
        }
      } catch (error) {
        // Try next selector
        continue;
      }
    }
    
  } catch (error) {
    logger.error('Error extracting from calendar:', error);
  }
  
  return slots;
}

/**
 * Extract slots from time slot elements
 */
async function extractFromTimeSlots(page, center) {
  const slots = [];
  
  try {
    for (const selector of SELECTORS.timeSlot) {
      try {
        const timeSlots = await page.$$eval(selector, (elements) => {
          return elements
            .filter(el => {
              const classes = el.className || '';
              return !classes.includes('disabled') && 
                     !classes.includes('unavailable') &&
                     !el.disabled;
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
              // Try to get date from parent or context
              let dateObj = null;
              if (slot.date) {
                dateObj = parseDate(slot.date);
              } else {
                // Use today's date if no date found
                dateObj = new Date();
                dateObj.setHours(0, 0, 0, 0);
              }
              
              if (dateObj && dateObj > new Date()) {
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
      '.slot-list'
    ];
    
    for (const selector of listSelectors) {
      try {
        const items = await page.$$eval(`${selector} li, ${selector} tr, ${selector} .slot-item`, (elements) => {
          return elements.map(el => ({
            text: el.textContent.trim(),
            date: el.getAttribute('data-date') || 
                  el.querySelector('[data-date]')?.getAttribute('data-date'),
            time: el.getAttribute('data-time') ||
                  el.querySelector('[data-time]')?.getAttribute('data-time')
          }));
        }).catch(() => []);
        
        if (items.length > 0) {
          for (const item of items) {
            if (item.text && (item.text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/) || item.date)) {
              try {
                const dateObj = parseDate(item.date || item.text);
                if (dateObj && dateObj > new Date()) {
                  slots.push({
                    date: dateObj,
                    time: item.time || extractTimeFromText(item.text),
                    center: center,
                    source: 'list'
                  });
                }
              } catch (error) {
                // Skip invalid
              }
            }
          }
          break;
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

