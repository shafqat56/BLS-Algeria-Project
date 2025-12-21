# 📧 Email Notification Setup Guide

## Quick Setup for Testing (Gmail)

### Step 1: Generate Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Click **Security** → **2-Step Verification** (enable if not already enabled)
3. Go to **App passwords**: https://myaccount.google.com/apppasswords
4. Select **Mail** and **Other (Custom name)**
5. Enter "BLS Monitor" as the name
6. Click **Generate**
7. **Copy the 16-character password** (you'll need this)

### Step 2: Configure Environment Variables

Create a `.env` file in the project root (or update existing one):

```env
# Email Configuration (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
EMAIL_FROM=your-email@gmail.com
```

**Important**: 
- Replace `your-email@gmail.com` with your actual Gmail address
- Replace `your-16-character-app-password` with the app password you generated
- Use the **app password**, NOT your regular Gmail password

### Step 3: Restart the Server

After updating `.env`, restart your backend server:

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 4: Configure in UI

1. Open the app: http://localhost:3001
2. Go to **Settings** page
3. Enable **Email Notifications**
4. Enter your email address
5. Click **Save**

### Step 5: Test Email Notification

1. In Settings page, you should see a **Test Email** button (if implemented)
2. Or use the API directly:

```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "email", "recipient": "your-email@gmail.com"}'
```

## Troubleshooting

### Error: "EAUTH" or "Authentication failed"
- **Solution**: Make sure you're using an **App Password**, not your regular Gmail password
- Verify 2-Step Verification is enabled
- Double-check the app password is correct (no spaces)

### Error: "ECONNECTION" or "Connection timeout"
- **Solution**: Check your internet connection
- Verify `EMAIL_HOST=smtp.gmail.com` and `EMAIL_PORT=587`
- Check firewall settings

### Error: "Email transporter not configured"
- **Solution**: Make sure `.env` file exists and has all required variables:
  - `EMAIL_HOST`
  - `EMAIL_USER`
  - `EMAIL_PASS`
- Restart the server after updating `.env`

### Email not received
- Check **Spam/Junk** folder
- Verify the email address in Settings is correct
- Check server logs for errors: `tail -f logs/combined.log`

## Other Email Providers

### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

### Yahoo Mail
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-app-password
```

### Custom SMTP Server
```env
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587  # or 465 for SSL
EMAIL_USER=your-username
EMAIL_PASS=your-password
EMAIL_FROM=noreply@yourdomain.com
```

## Security Notes

- ⚠️ **Never commit `.env` file to Git**
- ⚠️ **Use App Passwords, not regular passwords**
- ⚠️ **Keep your app passwords secure**
- ✅ `.env` is already in `.gitignore`

## Testing

Once configured, you can test by:
1. Starting a monitor
2. When a slot is found, you'll receive an email automatically
3. Or use the test endpoint (see Step 5 above)

---

**Need help?** Check the server logs for detailed error messages.

