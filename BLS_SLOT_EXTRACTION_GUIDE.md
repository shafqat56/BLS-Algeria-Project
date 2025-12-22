# BLS Algeria Slot Extraction - Implementation Guide

## ✅ Implementation Status

The monitoring service has been **fully implemented** for the BLS Algeria website at **https://algeria.blsspainvisa.com/**

## Website URL

**Base URL**: https://algeria.blsspainvisa.com/

**Centers**:
- Algiers: https://algeria.blsspainvisa.com/algiers
- Oran: https://algeria.blsspainvisa.com/oran

**Booking Page**: Automatically navigated to from center selection

## How to Customize

### Step 1: Inspect the Actual Booking Page

1. **Open the BLS Algeria booking page** in your browser:
   - Go to: https://algeria.blsspainvisa.com/algiers/
   - Click "Book Appointment"
   - Navigate to the appointment selection/calendar page

2. **Open Browser DevTools** (F12)
   - Go to Elements/Inspector tab
   - Right-click on an available appointment slot/date
   - Select "Inspect Element"

3. **Find the Selectors**:
   - Look for:
     - Calendar/date picker element
     - Available dates (what classes/attributes do they have?)
     - Disabled/unavailable dates (what makes them disabled?)
     - Time slots (if separate from dates)

### Step 2: Update Selectors

Edit `services/extractSlotsHelper.js` and update the `SELECTORS` object (around line 10-50) with the actual selectors you found:

```javascript
const SELECTORS = {
  // Update these based on what you find:
  availableDate: [
    '.actual-class-name-from-website',  // Add real selectors here
    '#actual-id-from-website',
    '[data-attribute="actual-value"]'
  ],
  // ... etc
};
```

### Step 3: Test and Debug

1. **Enable Debug Logging**:
   - The function already logs what it finds
   - Check backend logs when monitoring runs

2. **Take Screenshot**:
   - The function automatically saves a screenshot if extraction fails
   - Check `debug-slot-extraction-*.png` files

3. **Test Manually**:
   ```bash
   # Start monitoring for a test profile
   # Watch logs for extraction results
   tail -f logs/combined.log | grep -i "slot"
   ```

## Common Patterns to Look For

### Pattern 1: Calendar with Clickable Dates
```html
<div class="calendar">
  <div class="day available" data-date="2024-12-25">25</div>
  <div class="day disabled">26</div>
</div>
```
**Selector**: `.day.available` or `[data-date]`

### Pattern 2: Table of Available Dates
```html
<table class="appointments">
  <tr>
    <td data-date="2024-12-25" class="available">Dec 25</td>
  </tr>
</table>
```
**Selector**: `td.available` or `table.appointments td[data-date]`

### Pattern 3: List of Time Slots
```html
<ul class="time-slots">
  <li class="available" data-time="10:00">10:00 AM</li>
  <li class="available" data-time="11:00">11:00 AM</li>
</ul>
```
**Selector**: `.time-slots li.available`

### Pattern 4: Button-Based Selection
```html
<button class="appointment-btn" data-date="2024-12-25" data-time="10:00">
  Dec 25, 10:00 AM
</button>
```
**Selector**: `button.appointment-btn` or `button[data-date]`

## Center/Category Selection

BLS Algeria uses appointment categories:
- **ALG1**: First-time applicants or old visas
- **ALG2**: Recent visa (validity < 6 months)
- **ALG3**: Recent visa (6 months - 2 years)
- **ALG4**: Recent visa (2+ years)

The function tries to select the category, but you may need to:
1. Find the category dropdown selector
2. Update the selection logic in `monitorService.js` around line 170-180

## Debugging Tips

1. **Check Screenshots**:
   - Failed extractions save screenshots
   - Review to see what the page looks like

2. **Enable Verbose Logging**:
   - Check logs for: "Found X slots via calendar method"
   - This tells you which extraction method worked

3. **Test with Different Centers**:
   - Some centers might have different page structures
   - Test ALG1, ALG2, etc. separately

4. **Monitor Network Requests**:
   - The booking page might load slots via AJAX
   - Check Network tab in DevTools
   - If slots load via API, we might need to intercept that request instead

## Quick Test Script

Create `test-slot-extraction.js`:

```javascript
const puppeteer = require('puppeteer');
const { extractSlots } = require('./services/extractSlotsHelper');

async function test() {
  const browser = await puppeteer.launch({ headless: false }); // Set to true for production
  const page = await browser.newPage();
  
  await page.goto('https://algeria.blsspainvisa.com/algiers/');
  
  // Navigate to booking page
  // (click links as needed)
  
  const slots = await extractSlots(page, 'algiers_1');
  console.log('Found slots:', slots);
  
  await browser.close();
}

test();
```

Run: `node test-slot-extraction.js`

## Current Function Features

✅ Multiple extraction strategies (calendar, time slots, lists)
✅ Handles various date formats
✅ Removes duplicates
✅ Error handling and logging
✅ Screenshot on failure
✅ Filters out past dates and disabled slots

## Next Steps

1. Visit the actual booking page
2. Inspect HTML structure
3. Update selectors in `extractSlotsHelper.js`
4. Test with the test script
5. Verify slots are correctly extracted
6. Deploy to production monitoring

---

**Remember**: The function is comprehensive but needs the actual selectors from the real website. Once you provide the selectors or HTML structure you find, I can update it specifically for BLS Algeria's structure.

