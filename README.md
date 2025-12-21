# BLS Algeria Appointment Monitor - Backend

A secure, automated system for monitoring and notifying users about BLS Algeria appointment availability for Algiers and Oran centers.

## Features

- 🔐 **Secure Authentication**: JWT-based authentication with optional biometric support
- 🔒 **Data Encryption**: All sensitive data encrypted at rest using AES-256-GCM
- 🤖 **Automated Monitoring**: Continuous monitoring of BLS Algeria appointment slots (Algiers & Oran centers)
- 📧 **Multi-channel Notifications**: Email, WhatsApp, Telegram, and SMS
- 💳 **Payment Integration**: Secure payment processing via Stripe
- 🤝 **CAPTCHA Handling**: Automated CAPTCHA solving via 2Captcha
- 🔄 **Real-time Updates**: Socket.io for real-time status updates
- 🛡️ **Security First**: Helmet, rate limiting, input validation

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT, bcrypt
- **Web Scraping**: Puppeteer
- **Real-time**: Socket.io
- **Encryption**: AES-256-GCM

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. **Clone the repository and navigate to the project**
   ```bash
   cd Freelance-Project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb bls_appointment_monitor
   
   # Or using psql
   psql -U postgres
   CREATE DATABASE bls_appointment_monitor;
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Generate encryption key** (IMPORTANT)
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copy the output and set it as `ENCRYPTION_KEY` in `.env`

6. **Generate JWT secret** (IMPORTANT)
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Copy the output and set it as `JWT_SECRET` in `.env`

7. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## Environment Variables

See `.env.example` for all required environment variables. Key variables:

- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` - PostgreSQL configuration
- `JWT_SECRET` - Secret key for JWT tokens (minimum 32 characters)
- `ENCRYPTION_KEY` - 32-byte key for data encryption
- `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` - Email notification settings
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` - Stripe payment configuration
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` - Twilio for WhatsApp/SMS
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `CAPTCHA_API_KEY` - 2Captcha API key

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/verify-biometric` - Verify biometric authentication
- `POST /api/auth/enable-biometric` - Enable biometric authentication
- `GET /api/auth/me` - Get current user

### Profiles
- `GET /api/profiles` - Get all profiles
- `GET /api/profiles/:id` - Get profile by ID
- `POST /api/profiles` - Create profile
- `PUT /api/profiles/:id` - Update profile
- `DELETE /api/profiles/:id` - Delete profile

### Monitoring
- `GET /api/monitor` - Get all monitors
- `GET /api/monitor/:id` - Get monitor by ID
- `POST /api/monitor/start` - Start monitoring
- `POST /api/monitor/stop` - Stop monitoring
- `POST /api/monitor/pause` - Pause monitoring
- `POST /api/monitor/resume` - Resume monitoring

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings

### Payments
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/confirm` - Confirm payment
- `GET /api/payments/methods` - Get payment methods
- `POST /api/payments/webhook` - Stripe webhook (no auth)

### Notifications
- `POST /api/notifications/test` - Send test notification

## Security Features

1. **Data Encryption**
   - All sensitive fields (passport, phone, email, etc.) encrypted using AES-256-GCM
   - Encryption keys stored in environment variables
   - Decryption handled automatically by Sequelize getters/setters

2. **Authentication Security**
   - Passwords hashed with bcrypt (12 rounds)
   - JWT tokens with expiration
   - Optional biometric authentication (Face ID / fingerprint)

3. **API Security**
   - Helmet.js for HTTP headers
   - Rate limiting (100 requests per 15 minutes)
   - Input validation with express-validator
   - CORS configuration

4. **Database Security**
   - Prepared statements (via Sequelize)
   - User isolation (users can only access their own data)
   - Soft deletes for data retention

## Monitoring Service

The monitoring service:
- Uses Puppeteer to check BLS Algeria website (Algiers and Oran centers)
- Respects rate limits (minimum 3-minute intervals)
- Handles CAPTCHAs automatically
- Sends notifications when slots are found
- Emits real-time updates via Socket.io

**Note**: The BLS website scraping logic (`extractSlots` method) needs to be customized based on the actual BLS Algeria website structure.

## Supported Centers

### Algiers
- Algiers 1
- Algiers 2
- Algiers 3
- Algiers 4

### Oran
- Oran 1
- Oran 2
- Oran 3

## Supported Visa Categories

All visa subcategories are supported:
- Tourist Visa
- Student Visa
- Work Visa
- Business Visa
- Transit Visa
- Family Visa
- Medical Visa
- Cultural Visa
- Sports Visa
- Official Visa
- Diplomatic Visa

## Notification Services

Supports multiple notification channels:
- **Email**: Via nodemailer (SMTP)
- **WhatsApp**: Via Twilio WhatsApp API
- **Telegram**: Via Telegram Bot API
- **SMS**: Via Twilio SMS API

Users can configure which channels to use in settings.

## Payment Processing

Integrated with Stripe for secure payment processing:
- Payment intents for card payments
- Webhook handling for payment events
- Subscription management
- PCI-DSS compliant (no card data stored)

## Frontend Integration

The backend is designed to work with the existing frontend:
- Socket.io connection on `http://localhost:3000`
- REST API endpoints as documented above
- CORS enabled for frontend domain

## Development

```bash
# Development mode with auto-reload
npm run dev

# Run with logging
LOG_LEVEL=debug npm start
```

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use a production PostgreSQL database
3. Configure reverse proxy (nginx/Apache)
4. Use PM2 or similar for process management
5. Enable SSL/TLS certificates
6. Configure firewall rules

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running: `pg_isready`
- Check database credentials in `.env`
- Ensure database exists: `psql -l`

### Encryption Errors
- Verify `ENCRYPTION_KEY` is 32 bytes (64 hex characters)
- Don't change encryption key after data is encrypted

### CAPTCHA Issues
- Verify 2Captcha API key is valid
- Check account balance on 2Captcha
- CAPTCHA solving can take 10-30 seconds

### Notification Failures
- Verify API credentials (Twilio, Telegram, Email)
- Check logs for specific error messages
- Test notifications individually via `/api/notifications/test`

## License

ISC

## Support

For issues and questions, please refer to the project documentation or contact support.


