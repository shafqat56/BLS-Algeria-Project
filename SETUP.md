# Setup Guide - BLS Spain Appointment Monitor

## Step-by-Step Setup Instructions

### 1. Prerequisites Installation

#### Install Node.js
```bash
# Check if Node.js is installed
node --version  # Should be v16 or higher

# If not installed, download from https://nodejs.org/
```

#### Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS (using Homebrew)
brew install postgresql
brew services start postgresql

# Verify installation
psql --version
```

### 2. Database Setup

```bash
# Start PostgreSQL service (if not running)
sudo service postgresql start  # Linux
brew services start postgresql  # macOS

# Create database and user
sudo -u postgres psql  # Linux
# Or
psql postgres  # macOS

# In psql prompt:
CREATE DATABASE bls_appointment_monitor;
CREATE USER bls_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE bls_appointment_monitor TO bls_user;
\q
```

### 3. Project Setup

```bash
# Navigate to project directory
cd /home/jawad/Desktop/Freelance-Project

# Install dependencies
npm install

# Create logs directory
mkdir -p logs
```

### 4. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit .env file with your configuration
nano .env  # or use your preferred editor
```

#### Generate Encryption Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output and set as `ENCRYPTION_KEY` in `.env`

#### Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copy the output and set as `JWT_SECRET` in `.env`

#### Configure Database in .env
```env
DB_NAME=bls_appointment_monitor
DB_USER=bls_user
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432
```

### 5. Third-Party Service Setup

#### Email (Gmail Example)
1. Enable 2-Step Verification on your Google Account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use app password as `EMAIL_PASS` in `.env`

#### Stripe (Payment Processing)
1. Sign up at https://stripe.com
2. Get API keys from Dashboard > Developers > API keys
3. Set `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` in `.env`
4. For webhooks, set up endpoint: `https://yourdomain.com/api/payments/webhook`

#### Twilio (WhatsApp/SMS)
1. Sign up at https://www.twilio.com
2. Get Account SID and Auth Token from Dashboard
3. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` in `.env`
4. Get WhatsApp number: `whatsapp:+14155238886` (Sandbox)
5. Set `TWILIO_PHONE_NUMBER` for SMS

#### Telegram Bot
1. Message @BotFather on Telegram
2. Create new bot: `/newbot`
3. Copy bot token and set as `TELEGRAM_BOT_TOKEN` in `.env`
4. Get chat ID by messaging your bot, then visit:
   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
5. Use chat ID in settings

#### 2Captcha (CAPTCHA Solving)
1. Sign up at https://2captcha.com
2. Add funds to account
3. Get API key from account page
4. Set as `CAPTCHA_API_KEY` in `.env`

### 6. Database Migration

The database tables will be created automatically on first run. To manually sync:

```bash
# Start Node.js REPL
node

# In REPL:
const { sequelize } = require('./models');
sequelize.sync({ alter: true }).then(() => {
  console.log('Database synced');
  process.exit();
});
```

### 7. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

You should see:
```
PostgreSQL connection established successfully
Database models synchronized
Server running on port 3000
```

### 8. Test the API

```bash
# Health check
curl http://localhost:3000/health

# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'
```

### 9. Frontend Integration

The frontend should connect to:
- Backend API: `http://localhost:3000/api`
- Socket.io: `http://localhost:3000`

Update the frontend socket connection if needed:
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token-here'
  }
});
```

### 10. Common Issues & Solutions

#### Database Connection Failed
- Verify PostgreSQL is running: `pg_isready`
- Check credentials in `.env`
- Ensure database exists: `psql -l | grep bls`

#### Port Already in Use
- Change `PORT` in `.env`
- Or kill process: `lsof -ti:3000 | xargs kill`

#### Encryption Errors
- Ensure `ENCRYPTION_KEY` is exactly 64 hex characters
- Don't change key after data is stored (will corrupt data)

#### Puppeteer Installation Issues
- Install dependencies: `sudo apt-get install -y gconf-service libasound2...` (see Puppeteer docs)
- Or use: `npm install puppeteer --unsafe-perm=true`

#### CAPTCHA Solving Not Working
- Verify 2Captcha account has balance
- Check API key is correct
- Review logs for specific errors

### 11. Security Checklist

- [ ] Changed all default passwords
- [ ] Generated strong encryption keys
- [ ] Set secure JWT secret
- [ ] Enabled HTTPS in production
- [ ] Configured firewall rules
- [ ] Set up database backups
- [ ] Restricted database access
- [ ] Enabled rate limiting
- [ ] Configured CORS properly
- [ ] Set secure environment variables

### 12. Production Deployment

1. **Set Production Environment**
   ```env
   NODE_ENV=production
   ```

2. **Use Process Manager (PM2)**
   ```bash
   npm install -g pm2
   pm2 start server.js --name bls-monitor
   pm2 save
   pm2 startup
   ```

3. **Configure Reverse Proxy (Nginx)**
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
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Enable SSL/TLS**
   - Use Let's Encrypt: `certbot --nginx -d yourdomain.com`
   - Or configure with your SSL certificate

5. **Set Up Monitoring**
   - Configure log rotation
   - Set up error tracking (Sentry, etc.)
   - Monitor server resources

### 13. Next Steps

1. Customize BLS website scraping logic in `services/monitorService.js`
2. Configure notification preferences in user settings
3. Test all notification channels
4. Set up payment processing
5. Configure monitoring intervals
6. Test end-to-end workflow

## Support

For additional help, check:
- README.md for API documentation
- Logs in `logs/` directory
- Database logs for connection issues
