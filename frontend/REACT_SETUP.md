# React Frontend Setup & Deployment Guide

## Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Development Mode

```bash
npm run dev
```

Frontend will run on `http://localhost:3001` (proxied to backend on port 3000)

### 3. Build for Production

```bash
npm run build
```

This creates optimized production build in `../public` folder

### 4. Update Backend to Serve React Build

The backend already serves static files from the project root. After building React:

1. Build React: `cd frontend && npm run build`
2. The build output goes to `../public` (which is the project root)
3. Backend will automatically serve the React app

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── LoginModal.jsx
│   │   │   └── RegisterModal.jsx
│   │   ├── Layout/
│   │   │   ├── Layout.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── Dashboard/
│   │   │   └── Dashboard.jsx (to be created)
│   │   ├── Profiles/
│   │   │   └── Profiles.jsx (to be created)
│   │   ├── Monitoring/
│   │   │   └── Monitoring.jsx (to be created)
│   │   ├── Settings/
│   │   │   └── Settings.jsx (to be created)
│   │   └── Common/
│   │       ├── AlertContainer.jsx
│   │       └── LoadingOverlay.jsx
│   ├── contexts/
│   │   ├── AuthContext.jsx
│   │   └── SocketContext.jsx
│   ├── services/
│   │   └── api.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── package.json
├── vite.config.js
└── index.html
```

## VPS Deployment Steps

### Option 1: Build on Server

1. **SSH into your VPS**
2. **Clone/upload project**
3. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```
4. **Start backend:**
   ```bash
   cd ..
   npm start
   ```
5. **Use PM2 for process management:**
   ```bash
   npm install -g pm2
   pm2 start server.js --name bls-monitor
   pm2 save
   pm2 startup
   ```

### Option 2: Build Locally, Upload Build

1. **Build locally:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```
2. **Upload `public` folder to server**
3. **Server already configured to serve from project root**

## Environment Variables

Create `frontend/.env` for production:

```env
VITE_API_URL=https://yourdomain.com/api
```

Or set in `vite.config.js` for production builds.

## Notes

- React components are structured and ready
- Core components (Auth, Layout) are complete
- Dashboard, Profiles, Monitoring, Settings need to be created (can copy from HTML version)
- All API calls use the centralized `api.js` service
- Socket.io integration ready via SocketContext

## Next Steps

1. Complete Dashboard, Profiles, Monitoring, Settings components
2. Test locally with `npm run dev`
3. Build with `npm run build`
4. Deploy to VPS

