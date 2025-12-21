# Testing Guide - Frontend & Backend Integration

## Quick Access

Since the backend serves static files, you can access the frontend directly:

**Open in your browser:**
```
http://localhost:3000
```

Or open the `index.html` file directly from your file system.

## Step-by-Step Testing

### 1. Access the Frontend

1. **Option A: Via Browser (Recommended)**
   - Open your browser
   - Navigate to: `http://localhost:3000`
   - The frontend should load automatically

2. **Option B: Direct File**
   - Navigate to the project folder
   - Double-click `index.html` to open in browser
   - Note: Some features may not work without backend running

### 2. Test Registration

**Using Browser Developer Tools Console:**

1. Open browser console (F12 or Right-click → Inspect → Console)
2. Run this JavaScript to register a test user:

```javascript
async function testRegister() {
  const response = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'Test123456'
    })
  });
  const result = await response.json();
  console.log('Registration:', result);
  return result;
}
testRegister();
```

**Expected Result:** 
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": { "id": "...", "email": "test@example.com" }
}
```

### 3. Test Login

**Using Browser Console:**

```javascript
async function testLogin() {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'Test123456'
    })
  });
  const result = await response.json();
  console.log('Login:', result);
  
  // Store token for later use
  if (result.success && result.token) {
    localStorage.setItem('authToken', result.token);
    console.log('Token stored in localStorage');
  }
  return result;
}
testLogin();
```

**Expected Result:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": { "id": "...", "email": "test@example.com" }
}
```

### 4. Test Creating a Profile

```javascript
async function testCreateProfile() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.error('Please login first!');
    return;
  }

  const response = await fetch('http://localhost:3000/api/profiles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      fullName: 'John Doe',
      passportNumber: 'A12345678',
      dateOfBirth: '1990-01-01',
      nationality: 'Algerian',
      phone: '+213551234567',
      email: 'john@example.com',
      visaCategory: 'tourist',
      blsCenter: 'algiers_1',
      appointmentType: 'Tourist Visa Application',
      profileName: 'John\'s Profile'
    })
  });
  const result = await response.json();
  console.log('Profile Created:', result);
  return result;
}
testCreateProfile();
```

### 5. Test Getting Profiles

```javascript
async function testGetProfiles() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.error('Please login first!');
    return;
  }

  const response = await fetch('http://localhost:3000/api/profiles', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const result = await response.json();
  console.log('Profiles:', result);
  return result;
}
testGetProfiles();
```

### 6. Test Health Check

```javascript
async function testHealth() {
  const response = await fetch('http://localhost:3000/health');
  const result = await response.json();
  console.log('Health:', result);
  return result;
}
testHealth();
```

## Using the Frontend UI

### Manual Testing via UI

1. **Open Frontend:**
   - Navigate to `http://localhost:3000` in your browser

2. **Register/Login:**
   - The login modal should appear
   - Use the test account you created above
   - Or click to register a new account

3. **Note:** The frontend may need authentication token handling. If the login doesn't work automatically, check the browser console for errors.

## Using cURL (Command Line Testing)

### Test Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'
```

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'
```

Save the token from login response, then use it:

### Test Get Profiles (Replace TOKEN with actual token)
```bash
curl -X GET http://localhost:3000/api/profiles \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test Create Profile
```bash
curl -X POST http://localhost:3000/api/profiles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "fullName": "John Doe",
    "passportNumber": "A12345678",
    "dateOfBirth": "1990-01-01",
    "nationality": "Algerian",
    "phone": "+213551234567",
    "email": "john@example.com",
    "visaCategory": "tourist",
    "blsCenter": "algiers_1",
    "appointmentType": "Tourist Visa",
    "profileName": "John Profile"
  }'
```

### Test Start Monitoring
```bash
curl -X POST http://localhost:3000/api/monitor/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "profileId": "PROFILE_UUID_HERE",
    "blsCenter": "algiers_1",
    "checkInterval": 5,
    "autofillMode": "manual"
  }'
```

## Troubleshooting

### Frontend Not Loading
- Check if backend is running: `http://localhost:3000/health`
- Check browser console for errors (F12)
- Verify you're accessing `http://localhost:3000` (not file://)

### Authentication Errors
- Make sure you're logged in and have a token
- Check if token is stored: `localStorage.getItem('authToken')`
- Token expires after 7 days - login again if expired

### CORS Errors
- Backend CORS is configured for `http://localhost:3000`
- If accessing from different origin, update CORS in `server.js`

### Socket.io Connection Issues
- Check browser console for Socket.io errors
- Verify Socket.io is connecting: Look for "Socket connected" in backend logs
- Make sure token is sent in Socket.io auth (if implemented)

## Quick Test Script

Save this as `test-api.js` and run with `node test-api.js`:

```javascript
const fetch = require('node-fetch'); // npm install node-fetch

const API_URL = 'http://localhost:3000/api';

async function testAPI() {
  try {
    // 1. Health Check
    console.log('1. Testing health check...');
    const health = await fetch('http://localhost:3000/health');
    console.log('Health:', await health.json());

    // 2. Register
    console.log('\n2. Testing registration...');
    const register = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Test123456'
      })
    });
    const registerResult = await register.json();
    console.log('Register:', registerResult);

    // 3. Login
    console.log('\n3. Testing login...');
    const login = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Test123456'
      })
    });
    const loginResult = await login.json();
    console.log('Login:', loginResult);

    if (loginResult.success && loginResult.token) {
      const token = loginResult.token;

      // 4. Get Current User
      console.log('\n4. Testing get current user...');
      const me = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('Current User:', await me.json());

      // 5. Create Profile
      console.log('\n5. Testing create profile...');
      const profile = await fetch(`${API_URL}/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: 'John Doe',
          passportNumber: 'A12345678',
          dateOfBirth: '1990-01-01',
          nationality: 'Algerian',
          phone: '+213551234567',
          email: 'john@example.com',
          visaCategory: 'tourist',
          blsCenter: 'algiers_1',
          appointmentType: 'Tourist Visa',
          profileName: 'Test Profile'
        })
      });
      const profileResult = await profile.json();
      console.log('Profile:', profileResult);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();
```

## Next Steps

1. **Frontend Enhancement:** Add complete authentication handling to frontend
2. **Token Storage:** Implement localStorage token management
3. **API Wrapper:** Create a JavaScript API wrapper for easier frontend integration
4. **Error Handling:** Add user-friendly error messages in UI

---

**Ready to test!** Start with the health check, then proceed through registration, login, and profile creation.

