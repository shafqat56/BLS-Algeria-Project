# Quick Testing Commands

## Terminal 1: Backend
```bash
cd /home/jawad/Desktop/Freelance-Project
npm install  # First time only
npm run dev
```

## Terminal 2: Frontend
```bash
cd /home/jawad/Desktop/Freelance-Project/frontend
npm install  # First time only
npm run dev
```

## Browser
Open: http://localhost:3001

## Quick Test Flow
1. Register → test@example.com / Test123456
2. Login → test@example.com / Test123456
3. Go to Profiles → Create profile
4. Go to Monitoring → Start monitor
5. Go to Dashboard → View stats

## Check Backend is Running
```bash
curl http://localhost:3000/health
```

## Check Database
```bash
psql -d bls_appointment_monitor -c "SELECT COUNT(*) FROM users;"
```
