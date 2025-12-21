# Complete Testing Guide - Frontend & Backend

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 16+ installed
- ✅ PostgreSQL installed and running
- ✅ Database created (`bls_appointment_monitor`)
- ✅ `.env` file configured with database credentials

## Step 1: Setup Backend

### 1.1 Install Backend Dependencies

```bash
# In project root
cd /home/jawad/Desktop/Freelance-Project
npm install
```

### 1.2 Configure Environment Variables

Make sure you have a `.env` file in the project root:

```bash
# Check if .env exists
ls -la .env

# If not, create from example (you may need to create this manually)
# Copy these variables:
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# Database
DB_NAME=bls_appointment_monitor
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Generate JWT_SECRET (run this command):
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_generated_jwt_secret_here

# Generate ENCRYPTION_KEY (run this command):
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your_generated_encryption_key_here
```

### 1.3 Create Database

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Create database
createdb bls_appointment_monitor

# Or using psql
psql -U postgres -c "CREATE DATABASE bls_appointment_monitor;"
```

### 1.4 Start Backend Server

```bash
# In project root
npm run dev

# You should see:
# PostgreSQL connection established successfully
# Database models synchronized
# Server running on port 3000
```

**Keep this terminal running!**

## Step 2: Setup Frontend

### 2.1 Open New Terminal

Open a **NEW terminal window** (keep backend running)

### 2.2 Install Frontend Dependencies

```bash
cd /home/jawad/Desktop/Freelance-Project/frontend
npm install
```

This will take a few minutes to install React, Vite, and all dependencies.

### 2.3 Start Frontend Development Server

```bash
# Still in frontend directory
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3001/
➜  Network: use --host to expose
```

**Keep this terminal running too!**

## Step 3: Access the Application

### 3.1 Open Browser

Open your browser and navigate to:
```
http://localhost:3001
```

You should see the login modal automatically appear.

## Step 4: Complete Testing Flow

### Test 1: User Registration

1. **Click "Register"** button in the login modal
2. **Fill in the form:**
   - Email: `test@example.com`
   - Password: `Test123456` (minimum 8 characters)
3. **Click "Register"** button
4. **Expected Result:**
   - Success alert: "Registration successful! Please login."
   - Modal switches to login form automatically

**Check Backend Terminal:**
- You should see: `User registered: test@example.com`
- Check database: `psql -d bls_appointment_monitor -c "SELECT email FROM users;"`

### Test 2: User Login

1. **In the login form** (should be visible after registration)
2. **Enter credentials:**
   - Email: `test@example.com`
   - Password: `Test123456`
3. **Click "Login"** button
4. **Expected Result:**
   - Success alert: "Login successful!"
   - Login modal disappears
   - Dashboard page loads
   - Sidebar shows your email in user info section
   - Socket.io connection established (check browser console)

**Check Browser Console (F12):**
- Should see: `Socket.io connected`
- Check Network tab: Login request to `/api/auth/login` returns 200 with token

**Check Backend Terminal:**
- Should see: `User logged in: test@example.com`
- Should see: `Socket connected: <socket-id> (User: <user-id>)`

### Test 3: Create a Profile

1. **Click "Visa Profiles"** in the sidebar
2. **Fill in the profile form:**
   - Full Name: `John Doe`
   - Passport Number: `A12345678`
   - Date of Birth: Select a date
   - Nationality: `Algerian`
   - Phone: `+213551234567`
   - Email: `john@example.com`
   - Visa Category: Select `Tourist Visa`
   - BLS Center: Select `Algiers 1`
3. **Click "Save Profile"** button
4. **Expected Result:**
   - Success alert: "Profile saved successfully!"
   - Form clears
   - Profile appears in the "Saved Profiles" table below

**Check Backend Terminal:**
- Should see: `Profile created: <profile-id> for user <user-id>`

**Check Database:**
```sql
psql -d bls_appointment_monitor -c "SELECT profile_name, visa_category, bls_center FROM profiles;"
```

### Test 4: View Profiles

1. **In Profiles page**, scroll down to "Saved Profiles" table
2. **Expected Result:**
   - Table shows your created profile
   - All fields are displayed correctly
   - Profile is encrypted in database but decrypted in UI

**Verify Encryption:**
- Check database: `SELECT full_name, passport_number FROM profiles;`
- Should show encrypted values (not plain text)

### Test 5: Start Monitoring

1. **Click "Live Monitoring"** in the sidebar
2. **Fill in monitoring form:**
   - Profile: Select your created profile from dropdown
   - BLS Center: Select `Algiers 1` (or any center)
   - Check Interval: `5` (minutes)
   - Auto-fill Mode: `Manual (Notify Only)`
3. **Click "Start Monitoring"** button
4. **Expected Result:**
   - Success alert: "Monitoring started successfully!"
   - Monitor appears in "Active Monitors" table
   - Status shows as "active"
   - Backend starts monitoring job

**Check Backend Terminal:**
- Should see: `Monitor started: <monitor-id> for user <user-id>`
- Should see: `Monitor started: <monitor-id>` (from MonitorService)

**Check Database:**
```sql
psql -d bls_appointment_monitor -c "SELECT status, bls_center, check_interval FROM monitors;"
```

### Test 6: View Dashboard Statistics

1. **Click "Overview"** in the sidebar (Dashboard)
2. **Expected Result:**
   - Dashboard shows monitoring statistics:
     - Total Checks: 0 (will increase as monitoring runs)
     - Slots Found: 0
     - Active Centers: 1 (your active monitor)
     - Last Check: Shows time or "-"
   - Status indicator shows "Active" with green dot

### Test 7: Stop Monitoring

1. **Go back to "Live Monitoring"** page
2. **Find your active monitor** in the table
3. **Click "Stop"** button
4. **Expected Result:**
   - Success alert: "Monitor stopped"
   - Status changes to "stopped"
   - Monitor no longer active

**Check Backend Terminal:**
- Should see: `Monitor stopped: <monitor-id>`

### Test 8: View Settings

1. **Click "Settings"** in the sidebar
2. **Expected Result:**
   - Settings form loads
   - Shows notification preferences
   - You can toggle email, WhatsApp, Telegram, SMS notifications

**Note:** Settings page is functional but full notification setup requires third-party API keys.

### Test 9: Socket.io Real-time Updates

1. **Open Browser Console (F12)**
2. **Start a monitor** (repeat Test 5)
3. **Watch the console:**
   - Should see: `Socket.io connected`
   - Should see: `Status update:` messages as monitoring runs
   - When slots found: `Slot available!` message

**Expected Backend Messages:**
- Status updates should be emitted to socket
- Check backend terminal for socket events

### Test 10: Logout

1. **Click "Logout"** button in sidebar (bottom)
2. **Expected Result:**
   - Redirected back to login modal
   - Token removed from localStorage
   - Socket connection closed

**Check Browser Console:**
- Should see: `Socket.io disconnected`

**Check localStorage:**
- Open DevTools → Application → Local Storage
- `authToken` should be removed

### Test 11: Re-login and Persistence

1. **Login again** with same credentials
2. **Expected Result:**
   - All your profiles should still be there
   - Monitors should still exist (with stopped status)
   - Data persists across sessions

## Testing API Endpoints Directly (Optional)

### Test Health Check

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{"status":"ok","timestamp":"2024-..."}
```

### Test Registration API

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"api-test@example.com","password":"Test123456"}'
```

### Test Login API

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'
```

Save the token from response, then use it:

### Test Get Profiles (with token)

```bash
curl http://localhost:3000/api/profiles \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Troubleshooting

### Backend Won't Start

**Issue:** Database connection error
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U postgres -d bls_appointment_monitor

# Check .env file has correct credentials
cat .env | grep DB_
```

**Issue:** Port 3000 already in use
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill it
kill -9 <PID>
```

### Frontend Won't Start

**Issue:** Port 3001 already in use
```bash
# Find process
sudo lsof -i :3001

# Kill it or change port in vite.config.js
```

**Issue:** Dependencies not installed
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Frontend Can't Connect to Backend

**Check:**
1. Backend is running on port 3000
2. Frontend dev server is running on port 3001
3. Check browser console for CORS errors
4. Verify proxy settings in `vite.config.js`

### Database Issues

**Check tables were created:**
```sql
psql -d bls_appointment_monitor -c "\dt"
```

Should show: users, profiles, monitors, settings, slots

**Reset database (if needed):**
```sql
-- Drop all tables (CAREFUL - deletes all data!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

Then restart backend - tables will be recreated.

### Authentication Issues

**Token not working:**
- Check JWT_SECRET in .env matches
- Token might be expired (default 7 days)
- Check browser console for 401 errors
- Try logging out and back in

## Expected File Structure After Setup

```
Freelance-Project/
├── frontend/
│   ├── node_modules/          # Frontend dependencies
│   ├── src/                   # React source code
│   ├── package.json
│   └── vite.config.js
├── node_modules/              # Backend dependencies
├── public/                    # React build output (after npm run build)
├── logs/                      # Application logs
├── .env                       # Environment variables
├── server.js                  # Backend server
└── package.json               # Backend dependencies
```

## Success Checklist

After completing all tests, you should have:

- ✅ User registered and logged in
- ✅ Profile created and visible in table
- ✅ Monitor started and showing in active monitors
- ✅ Dashboard showing statistics
- ✅ Socket.io connected and receiving updates
- ✅ Settings page accessible
- ✅ Logout working
- ✅ Data persisting across sessions

## Next Steps

Once testing is complete:

1. **Customize BLS website scraping** in `services/monitorService.js`
2. **Configure third-party services** (Email, Twilio, Telegram, etc.)
3. **Build for production:** `cd frontend && npm run build`
4. **Deploy to VPS** following `DEPLOYMENT.md`

---

**Happy Testing!** 🚀

