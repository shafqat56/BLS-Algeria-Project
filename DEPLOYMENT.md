# VPS Deployment Guide - React Frontend

## Prerequisites

- Node.js 16+ installed on VPS
- PostgreSQL installed and running
- Domain name pointed to VPS (optional but recommended)
- SSH access to VPS

## Step 1: Upload Project to VPS

```bash
# On your local machine, compress the project
tar -czf bls-project.tar.gz --exclude=node_modules --exclude=.git Freelance-Project/

# Upload to VPS using SCP
scp bls-project.tar.gz user@your-vps-ip:/home/user/

# SSH into VPS
ssh user@your-vps-ip

# Extract project
cd /home/user
tar -xzf bls-project.tar.gz
cd Freelance-Project
```

## Step 2: Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

## Step 3: Build React Frontend

```bash
cd frontend
npm run build
cd ..
```

This creates the production build in the `public` folder.

## Step 4: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

Set:
- Database credentials
- JWT_SECRET (generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
- ENCRYPTION_KEY (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- NODE_ENV=production
- Other service API keys

## Step 5: Setup Database

```bash
# Create database
createdb bls_appointment_monitor

# Or via psql
psql -U postgres -c "CREATE DATABASE bls_appointment_monitor;"
```

## Step 6: Run Database Migrations

The database tables will be created automatically on first run, or you can test the connection:

```bash
node -e "const {sequelize} = require('./models'); sequelize.authenticate().then(() => {console.log('DB OK'); process.exit(0);})"
```

## Step 7: Install PM2 (Process Manager)

```bash
npm install -g pm2

# Start the server
pm2 start server.js --name bls-monitor

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown
```

## Step 8: Configure Nginx (Optional but Recommended)

```bash
# Install Nginx
sudo apt update
sudo apt install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/bls-monitor
```

Add:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/bls-monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 9: Setup SSL with Let's Encrypt (Recommended)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Step 10: Firewall Configuration

```bash
# Allow HTTP, HTTPS, and SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Monitoring & Maintenance

### View Logs

```bash
# PM2 logs
pm2 logs bls-monitor

# Application logs
tail -f logs/combined.log
tail -f logs/error.log
```

### Restart Application

```bash
pm2 restart bls-monitor
```

### Update Application

```bash
# 1. Pull latest code
git pull  # or upload new files

# 2. Install new dependencies (if any)
npm install
cd frontend && npm install && npm run build && cd ..

# 3. Restart
pm2 restart bls-monitor
```

## Quick Deployment Script

Create `deploy.sh`:

```bash
#!/bin/bash
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "Installing backend dependencies..."
npm install

echo "Restarting application..."
pm2 restart bls-monitor

echo "Deployment complete!"
```

Make executable:
```bash
chmod +x deploy.sh
```

Run with:
```bash
./deploy.sh
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
sudo lsof -i :3000
# Kill process
kill -9 <PID>
```

### Database Connection Failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql
# Check if database exists
psql -l | grep bls
```

### Frontend Not Loading
- Check if `public` folder exists and has `index.html`
- Check Nginx/proxy configuration
- Check browser console for errors
- Verify API URL in frontend config

## Security Checklist

- [ ] All environment variables set
- [ ] Strong JWT_SECRET generated
- [ ] Strong ENCRYPTION_KEY generated
- [ ] Database password is secure
- [ ] HTTPS enabled (SSL certificate)
- [ ] Firewall configured
- [ ] PM2 running as non-root user
- [ ] Logs directory permissions set
- [ ] Regular backups configured

