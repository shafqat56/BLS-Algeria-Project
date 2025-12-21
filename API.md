# API Documentation

## Base URL

```
http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "subscriptionStatus": "free",
    "biometricEnabled": false
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "subscriptionStatus": "free",
    "subscriptionExpiry": null,
    "biometricEnabled": false,
    "paymentMethod": "none",
    "lastLogin": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Enable Biometric
```http
POST /api/auth/enable-biometric
Authorization: Bearer <token>
Content-Type: application/json

{
  "biometricData": "encrypted_biometric_hash"
}
```

#### Verify Biometric
```http
POST /api/auth/verify-biometric
Authorization: Bearer <token>
Content-Type: application/json

{
  "biometricData": "biometric_hash_to_verify"
}
```

### Profiles

#### Get All Profiles
```http
GET /api/profiles
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "profiles": [
    {
      "id": "uuid",
      "full_name": "John Doe",
      "passport_number": "A12345678",
      "date_of_birth": "1990-01-01",
      "nationality": "American",
      "phone": "+34677123456",
      "email": "john@example.com",
      "visa_category": "tourist",
      "bls_center": "algiers_1",
      "appointment_type": "Visa Application",
      "profile_name": "John's Profile",
      "is_active": true
    }
  ]
}
```

#### Get Profile by ID
```http
GET /api/profiles/:id
Authorization: Bearer <token>
```

#### Create Profile
```http
POST /api/profiles
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "John Doe",
  "passportNumber": "A12345678",
  "dateOfBirth": "1990-01-01",
  "nationality": "American",
  "phone": "+34677123456",
  "email": "john@example.com",
  "visaCategory": "tourist",
  "blsCenter": "algiers_1",
  "appointmentType": "Visa Application",
  "profileName": "John's Profile"
}
```

#### Update Profile
```http
PUT /api/profiles/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "John Updated",
  "phone": "+34677987654"
}
```

#### Delete Profile
```http
DELETE /api/profiles/:id
Authorization: Bearer <token>
```

### Monitoring

#### Get All Monitors
```http
GET /api/monitor
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "monitors": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "profile_id": "uuid",
      "bls_center": "algiers_1",
      "check_interval": 5,
      "autofill_mode": "manual",
      "status": "active",
      "last_check": "2024-01-01T12:00:00.000Z",
      "next_check": "2024-01-01T12:05:00.000Z",
      "total_checks": 100,
      "slots_found": 5,
      "profile": {
        "id": "uuid",
        "profile_name": "John's Profile"
      }
    }
  ]
}
```

#### Start Monitoring
```http
POST /api/monitor/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "profileId": "uuid",
  "blsCenter": "algiers_1",
  "checkInterval": 5,
  "autofillMode": "manual"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Monitoring started",
  "monitor": { ... }
}
```

#### Stop Monitoring
```http
POST /api/monitor/stop
Authorization: Bearer <token>
Content-Type: application/json

{
  "id": "monitor_uuid"
}
```

#### Pause Monitoring
```http
POST /api/monitor/pause
Authorization: Bearer <token>
Content-Type: application/json

{
  "id": "monitor_uuid"
}
```

#### Resume Monitoring
```http
POST /api/monitor/resume
Authorization: Bearer <token>
Content-Type: application/json

{
  "id": "monitor_uuid"
}
```

### Settings

#### Get Settings
```http
GET /api/settings
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "email_notifications": true,
    "whatsapp_notifications": false,
    "telegram_notifications": false,
    "sms_notifications": false,
    "email_address": "user@example.com",
    "whatsapp_number": null,
    "telegram_chat_id": null,
    "phone_number": null,
    "captcha_enabled": true,
    "payment_method": "none"
  }
}
```

#### Update Settings
```http
PUT /api/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "emailNotifications": true,
  "whatsappNotifications": true,
  "whatsappNumber": "+34677123456",
  "telegramNotifications": false,
  "smsNotifications": false,
  "captchaEnabled": true,
  "captchaApiKey": "your_2captcha_api_key"
}
```

### Payments

#### Create Payment Intent
```http
POST /api/payments/create-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 9.99,
  "currency": "eur"
}
```

**Response:**
```json
{
  "success": true,
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

#### Confirm Payment
```http
POST /api/payments/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentIntentId": "pi_xxx"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription activated successfully",
  "subscriptionExpiry": "2024-02-01T00:00:00.000Z"
}
```

#### Get Payment Methods
```http
GET /api/payments/methods
Authorization: Bearer <token>
```

### Notifications

#### Test Notification
```http
POST /api/notifications/test
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "email",
  "recipient": "test@example.com"
}
```

**Types:** `email`, `whatsapp`, `telegram`, `sms`

## Socket.IO Events

### Client → Server

#### Join User Room
```javascript
socket.emit('join-user-room');
```

### Server → Client

#### Status Update
```javascript
socket.on('statusUpdate', (data) => {
  // data: { id, message, timestamp }
});
```

#### Slot Available
```javascript
socket.on('slotAvailable', (data) => {
  // data: { id, slots, date, center }
});
```

## Error Responses

All endpoints may return error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": ["Additional error details"]
}
```

**Status Codes:**
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `500` - Internal Server Error

