# Testing Checklist

Use this checklist to verify everything works:

## Setup Phase
- [ ] Backend dependencies installed (`npm install` in root)
- [ ] Frontend dependencies installed (`npm install` in frontend/)
- [ ] Database created (`bls_appointment_monitor`)
- [ ] `.env` file configured
- [ ] JWT_SECRET generated and set
- [ ] ENCRYPTION_KEY generated and set

## Backend Testing
- [ ] Backend starts without errors (`npm run dev`)
- [ ] Database connection successful
- [ ] Tables created automatically (users, profiles, monitors, settings, slots)
- [ ] Health check works: `curl http://localhost:3000/health`

## Frontend Testing
- [ ] Frontend starts (`cd frontend && npm run dev`)
- [ ] Browser opens to http://localhost:3001
- [ ] Login modal appears automatically

## User Flow Testing
- [ ] Registration works
- [ ] Login works
- [ ] Dashboard loads after login
- [ ] Sidebar shows user email
- [ ] Socket.io connects (check console)

## Profile Testing
- [ ] Create profile form works
- [ ] Profile saves successfully
- [ ] Profile appears in table
- [ ] Profile data is encrypted in database (verify with SQL)
- [ ] Delete profile works

## Monitoring Testing
- [ ] Profile dropdown populates
- [ ] Start monitoring works
- [ ] Monitor appears in active monitors table
- [ ] Status shows "active"
- [ ] Stop monitoring works
- [ ] Status changes to "stopped"

## Dashboard Testing
- [ ] Statistics display correctly
- [ ] Total checks shows number
- [ ] Active centers count is correct
- [ ] Status indicator works (green dot when active)

## Settings Testing
- [ ] Settings page loads
- [ ] Notification toggles work
- [ ] Save settings works

## Socket.io Testing
- [ ] Connection established (console log)
- [ ] Status updates received
- [ ] Disconnects on logout

## Data Persistence
- [ ] Logout and login again
- [ ] Profiles still exist
- [ ] Monitors still exist

## API Testing (Optional)
- [ ] POST /api/auth/register works
- [ ] POST /api/auth/login works
- [ ] GET /api/profiles works (with token)
- [ ] POST /api/profiles works (create)
- [ ] POST /api/monitor/start works

## Browser Console Check
- [ ] No errors in console
- [ ] API calls successful (200 status)
- [ ] Socket.io connected
- [ ] No CORS errors

## Database Verification
- [ ] Users table has data
- [ ] Profiles table has encrypted data
- [ ] Monitors table has data
- [ ] Settings table created

---

**All checked?** ✅ System is ready for production customization!

