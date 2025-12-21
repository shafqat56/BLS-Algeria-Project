# Notification System - Implementation Status & Testing Guide

## ✅ **IS IMPLEMENTED** - Here's How It Works:

### 1. **Slot Detection Flow**

```
User Starts Monitor
    ↓
MonitorService.scheduleNextCheck() runs every X minutes (check interval)
    ↓
MonitorService.checkAvailability() executed
    ↓
Puppeteer opens browser → Navigates to BLS website
    ↓
extractSlots() searches for available appointment slots
    ↓
IF SLOTS FOUND:
    ↓
Save slots to database
    ↓
NotificationService.notifySlotFound() called
    ↓
Check user's notification settings
    ↓
Send notifications via enabled channels:
    - Email (if enabled)
    - WhatsApp (if enabled)
    - Telegram (if enabled)
    - SMS (if enabled)
    ↓
Emit Socket.io event → Frontend shows real-time alert
```

### 2. **Where It Checks for Slots**

**File**: `services/monitorService.js`

**Method**: `checkAvailability(monitorId, io)`
- Line 125-287: Main checking logic
- Uses Puppeteer to navigate to BLS website
- Calls `extractSlots()` at line 187

**Method**: `extractSlots(page, center)` 
- Line 289-322: Slot extraction (⚠️ **PLACEHOLDER** - needs customization)
- Currently searches for: `[data-date], .available-date, .slot-available`
- **NOTE**: This needs to be adapted to actual BLS Algeria website structure

### 3. **Notification Sending**

**File**: `services/notificationService.js`

**Method**: `notifySlotFound(userId, data, io)`
- Line 20-89: Main notification handler
- Checks user settings from database
- Sends via multiple channels in parallel

**Channels Implemented**:
1. **Email** (line 32-43): Uses Nodemailer
2. **WhatsApp** (line 46-56): Uses Twilio API
3. **Telegram** (line 59-69): Uses Telegram Bot API
4. **SMS** (line 72-81): Uses Twilio API

### 4. **Real-time Updates**

**Socket.io Events**:
- `slotAvailable` - Emitted when slots found (line 228 in monitorService.js)
- `statusUpdate` - Emitted for status changes (line 138, 249, 273)

---

## ⚠️ **REQUIRES CONFIGURATION** - Before Testing:

### 1. **Environment Variables Needed**

Add to `.env` file:

```env
# Email (for Email notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Twilio (for WhatsApp & SMS)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_PHONE_NUMBER=+1234567890

# Telegram (for Telegram notifications)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# BLS Website URL
BLS_ALGERIA_URL=https://actual-bls-algeria-website.com
```

### 2. **Customize Slot Extraction**

**IMPORTANT**: The `extractSlots()` method is a placeholder. You need to:

1. Visit the actual BLS Algeria appointment website
2. Inspect the HTML structure
3. Update `services/monitorService.js` line 289-322 to match the actual website

**Example of what you need to find**:
- Calendar/date picker element
- Available date selectors
- Time slot elements
- Center-specific appointment availability

---

## 🧪 **HOW TO TEST IN PRACTICE**

### **Method 1: Test Notifications Directly (Recommended for Demo)**

1. **Configure Settings in UI**:
   - Go to Settings page
   - Enable Email notifications
   - Enter your email address
   - Save settings

2. **Use Test Notification API**:
   ```bash
   # Get your auth token (login first)
   TOKEN="your-jwt-token-here"
   
   # Test Email notification
   curl -X POST http://localhost:3000/api/notifications/test \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"type":"email","recipient":"your-email@example.com"}'
   ```

3. **Check Your Email**: You should receive a test notification

### **Method 2: Test Full Monitoring Flow**

**⚠️ Note**: This requires `extractSlots()` to be customized for actual BLS website.

1. **Create a Profile**:
   - Fill in all profile details
   - Save profile

2. **Start Monitoring**:
   - Go to Monitoring page
   - Select profile and center
   - Set check interval (e.g., 5 minutes)
   - Click "Start Monitoring"

3. **Monitor Logs**:
   ```bash
   # Watch backend logs
   tail -f logs/combined.log
   # or if using nodemon, check terminal
   ```

4. **What to Look For**:
   - Log messages: "Checking availability..."
   - Log messages: "Slots found for monitor..."
   - Log messages: "Notifications sent for user..."
   - Frontend Socket.io updates in browser console

### **Method 3: Simulate Slot Found (For Testing)**

Create a test script to simulate slot detection:

**Create `test-notification.js`**:

```javascript
const NotificationService = require('./services/notificationService');

async function testNotification() {
  // Replace with actual user ID from database
  const userId = 'your-user-id-here';
  
  await NotificationService.notifySlotFound(userId, {
    slots: [{
      date: new Date('2024-12-25'),
      time: '10:00 AM',
      center: 'algiers_1'
    }],
    center: 'algiers_1',
    profileName: 'Test Profile'
  });
  
  console.log('Test notification sent!');
}

testNotification().catch(console.error);
```

Run: `node test-notification.js`

---

## 👀 **HOW TO SEE IT WORKING**

### **1. Browser Console (Frontend)**

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for Socket.io messages:
   ```
   Socket connected
   statusUpdate: { id: '...', message: 'Checking availability...' }
   slotAvailable: { id: '...', slots: [...], date: '...' }
   ```

### **2. Backend Terminal Logs**

Watch for:
```
[info]: Checking availability for monitor <id>
[info]: Slots found for monitor <id>: 2
[info]: Email sent to user@example.com: <message-id>
[info]: WhatsApp sent to +1234567890: <sid>
[info]: Notifications sent for user <user-id>
```

### **3. Email Inbox**

Check your configured email for:
- Subject: "BLS Appointment Slot Available!"
- HTML email with slot details

### **4. Dashboard Updates**

- Monitor status changes
- "Slots Found" count increases
- Last check time updates
- Active monitors table shows status

### **5. Database Check**

```sql
-- Check found slots
SELECT * FROM slots ORDER BY created_at DESC LIMIT 10;

-- Check monitor stats
SELECT id, total_checks, slots_found, last_slot_found FROM monitors;
```

---

## 🔧 **QUICK SETUP FOR TESTING**

### **Minimal Setup (Email Only - Easiest)**

1. **Setup Gmail SMTP**:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password  # Generate from Google Account settings
   EMAIL_FROM=your-email@gmail.com
   ```

2. **Enable Email in Settings UI**:
   - Settings → Email Notifications → ON
   - Enter your email
   - Save

3. **Test via API** (as shown above)

### **Full Setup (All Channels)**

1. **Email**: Same as above
2. **WhatsApp/SMS**: Get Twilio account → Add credentials
3. **Telegram**: Create bot via @BotFather → Get token

---

## ⚠️ **IMPORTANT NOTES**

1. **Slot Extraction**: The `extractSlots()` method is a placeholder. It needs to be customized for the actual BLS Algeria website structure. Without this, monitoring won't find real slots.

2. **BLS Website Structure**: You need to inspect the actual appointment booking page and update the selectors in `extractSlots()`.

3. **CAPTCHA**: If BLS website has CAPTCHA, configure 2Captcha API key in Settings for automatic solving.

4. **Rate Limiting**: Be respectful - don't set intervals too low (minimum 3 minutes).

5. **Error Handling**: Check backend logs for errors. Common issues:
   - Website structure changed
   - CAPTCHA not solved
   - Network timeouts
   - API credentials invalid

---

## 📊 **NOTIFICATION STATUS**

| Channel | Backend | Frontend UI | Configuration | Status |
|---------|---------|-------------|---------------|--------|
| Email | ✅ | ✅ | Settings page | ✅ Ready |
| WhatsApp | ✅ | ✅ | Settings page | ⚠️ Needs Twilio |
| Telegram | ✅ | ✅ | Settings page | ⚠️ Needs Bot Token |
| SMS | ✅ | ✅ | Settings page | ⚠️ Needs Twilio |
| Socket.io | ✅ | ✅ | Auto | ✅ Ready |

**Summary**: All notification channels are implemented. Just need to configure API credentials and customize slot extraction for actual website.

