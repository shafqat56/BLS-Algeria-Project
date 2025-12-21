# Quick Start Guide

## Minimum Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
# Create PostgreSQL database
createdb bls_appointment_monitor

# Or using psql
psql -U postgres -c "CREATE DATABASE bls_appointment_monitor;"
```

### 3. Create .env File
```bash
# Copy example
cp .env.example .env

# Minimum required variables for testing
cat > .env << EOF
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000

DB_NAME=bls_appointment_monitor
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# Generate these:
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
EOF
```

### 4. Start Server
```bash
npm run dev
```

### 5. Test API
```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'
```

## Full Setup

For production use, configure all services:

1. **Email** - Set `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`
2. **Stripe** - Set `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`
3. **Twilio** - Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
4. **Telegram** - Set `TELEGRAM_BOT_TOKEN`
5. **2Captcha** - Set `CAPTCHA_API_KEY`

See `SETUP.md` for detailed instructions.

