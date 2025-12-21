# Security Documentation

## Data Protection

### Encryption at Rest

All sensitive data is encrypted using **AES-256-GCM** encryption before being stored in the database. Encrypted fields include:

- User biometric data
- Profile personal information (full name, passport number, phone, email)
- Settings notification credentials (email addresses, phone numbers, API keys)

#### How It Works

1. **Encryption Key**: A 32-byte encryption key is stored in `ENCRYPTION_KEY` environment variable
2. **Encryption Process**: Data is encrypted using AES-256-GCM with a random IV (Initialization Vector)
3. **Storage Format**: Encrypted data is stored as `IV:Tag:EncryptedData` hex strings
4. **Decryption**: Data is automatically decrypted when retrieved using Sequelize getters

#### Key Management

- **DO NOT** store encryption keys in version control
- **DO NOT** share encryption keys between environments
- **DO NOT** change encryption keys after data is stored (will corrupt existing data)
- Use strong, randomly generated keys (64 hex characters)
- Rotate keys only when migrating to new encryption method

### Password Security

- Passwords are hashed using **bcrypt** with **12 rounds** (cost factor)
- Passwords are never stored in plain text
- Password validation requires minimum 8 characters
- Passwords are excluded from queries by default (`select: false`)

### Authentication

- **JWT Tokens**: JSON Web Tokens for stateless authentication
- **Token Expiration**: Default 7 days (configurable via `JWT_EXPIRE`)
- **Token Secret**: Strong secret key (minimum 32 characters, recommended 64+)
- **Biometric Support**: Optional Face ID/Fingerprint authentication with encrypted storage

## API Security

### Rate Limiting

- **100 requests per 15 minutes** per IP address
- Applied to all `/api/` endpoints
- Prevents brute force attacks and abuse
- Configurable via environment variables

### Input Validation

- All inputs validated using **express-validator**
- SQL injection protection via Sequelize ORM (parameterized queries)
- XSS protection via input sanitization
- Email validation and normalization
- Type checking for all fields

### CORS Configuration

- Restricted to frontend URL specified in `FRONTEND_URL`
- Credentials allowed for authenticated requests
- Prevents unauthorized cross-origin requests

### Security Headers

- **Helmet.js** middleware for security headers:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Strict-Transport-Security (when using HTTPS)

## Database Security

### Access Control

- User isolation: Users can only access their own data
- Foreign key constraints enforce data integrity
- Soft deletes preserve data for auditing

### Connection Security

- PostgreSQL connection uses credentials from environment variables
- Connection pooling limits concurrent connections
- Prepared statements prevent SQL injection

### Backup Considerations

- Backups should be encrypted
- Backup access should be restricted
- Regular backup testing recommended

## Payment Security

### Stripe Integration

- **PCI-DSS Compliant**: No credit card data stored on server
- Payment intents created server-side
- Webhook verification for payment events
- Metadata includes user ID for verification

### Payment Flow

1. Client requests payment intent from backend
2. Backend creates Stripe payment intent
3. Client completes payment via Stripe.js (client-side)
4. Backend confirms payment via webhook
5. Subscription activated only after verified payment

## Monitoring & Logging

### Logging

- Structured logging with Winston
- Error logs stored separately
- Sensitive data excluded from logs
- Log rotation recommended for production

### Monitoring

- Monitor service respects rate limits (minimum 3-minute intervals)
- Error tracking and alerting
- Session timeout handling
- Graceful error recovery

## Best Practices

### Environment Variables

- **NEVER** commit `.env` files to version control
- Use strong, randomly generated secrets
- Different keys for development and production
- Rotate keys periodically

### Code Security

- Keep dependencies updated (`npm audit`)
- Use security-focused packages (bcrypt, helmet, etc.)
- Regular security audits
- Follow OWASP guidelines

### Deployment Security

1. **Use HTTPS**: SSL/TLS certificates required in production
2. **Firewall Rules**: Restrict database access to application server
3. **Process Management**: Use PM2 or similar for process isolation
4. **Updates**: Keep Node.js and dependencies updated
5. **Monitoring**: Set up security monitoring and alerts

## Vulnerability Reporting

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Contact the maintainer privately
3. Provide detailed information about the vulnerability
4. Allow time for fix before public disclosure

## Compliance

### GDPR Considerations

- User data encryption
- Right to deletion (soft deletes with purge option)
- Data portability (export functionality)
- Consent management for data processing

### Data Retention

- User data retained until account deletion
- Logs retained according to policy
- Backup retention policy should be defined

## Security Checklist

Before going to production:

- [ ] All environment variables set and secure
- [ ] Encryption keys generated and stored securely
- [ ] HTTPS/SSL configured
- [ ] Database access restricted
- [ ] Firewall rules configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive information
- [ ] Logs configured and monitored
- [ ] Dependencies updated (`npm audit fix`)
- [ ] Security headers enabled
- [ ] CORS properly configured
- [ ] Payment processing tested
- [ ] Backup strategy in place
- [ ] Monitoring and alerting set up

