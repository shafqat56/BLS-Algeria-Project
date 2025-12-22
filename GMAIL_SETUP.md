# 📧 Gmail Setup Guide for Email Notifications

This guide will help you set up a new Gmail account and configure it for email notifications in your BLS Appointment Monitor application. **This works on both local development and VPS deployment.**

---

## 🎯 Step 1: Create a New Gmail Account

1. **Go to Gmail Sign Up**: Visit [https://accounts.google.com/signup](https://accounts.google.com/signup)

2. **Fill in the form**:
   - First Name: Your first name
   - Last Name: Your last name
   - Username: Choose a unique email (e.g., `blsmonitor2024@gmail.com`)
   - Password: Create a strong password (save it securely!)
   - Confirm Password: Re-enter the password

3. **Verify your phone number** (Google requires this for security)

4. **Complete the setup** and sign in to your new Gmail account

---

## 🔐 Step 2: Enable 2-Step Verification

**Important**: Gmail requires 2-Step Verification to generate App Passwords.

1. **Go to Google Account Settings**:
   - Click your profile picture (top right)
   - Click **"Manage your Google Account"**

2. **Navigate to Security**:
   - Click **"Security"** in the left sidebar

3. **Enable 2-Step Verification**:
   - Find **"2-Step Verification"** section
   - Click **"Get started"** or **"Turn on"**
   - Follow the prompts to set it up:
     - Enter your phone number
     - Verify with SMS code
     - Confirm the setup

---

## 🔑 Step 3: Generate an App Password

**App Passwords** are special passwords that allow applications to access your Gmail account securely.

1. **Go back to Security settings**:
   - [https://myaccount.google.com/security](https://myaccount.google.com/security)

2. **Find "App passwords"**:
   - Scroll down to **"2-Step Verification"** section
   - Click **"App passwords"** (you may need to sign in again)

3. **Create a new App Password**:
   - **Select app**: Choose **"Mail"**
   - **Select device**: Choose **"Other (Custom name)"**
   - **Enter name**: Type `BLS Monitor` or `Appointment Monitor`
   - Click **"Generate"**

4. **Copy the App Password**:
   - Google will show you a **16-character password** (e.g., `abcd efgh ijkl mnop`)
   - **⚠️ IMPORTANT**: Copy this password NOW - you won't be able to see it again!
   - Remove spaces: `abcdefghijklmnop` (the app will handle spaces, but it's cleaner without)

---

## ⚙️ Step 4: Configure Your Application

### For Local Development:

1. **Create/Edit `.env` file** in your project root (`/home/jawad/Desktop/Freelance-Project/.env`):

```env
# Gmail SMTP Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-new-email@gmail.com
EMAIL_PASS=abcdefghijklmnop
EMAIL_FROM=your-new-email@gmail.com

# Other existing variables...
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://...
# ... etc
```

2. **Replace the values**:
   - `EMAIL_USER`: Your new Gmail address (e.g., `blsmonitor2024@gmail.com`)
   - `EMAIL_PASS`: The 16-character App Password you generated (without spaces)
   - `EMAIL_FROM`: Same as EMAIL_USER (the "from" address)

3. **Save the file**

### For VPS Deployment:

1. **SSH into your VPS**:
   ```bash
   ssh user@your-vps-ip
   ```

2. **Navigate to your project directory**:
   ```bash
   cd /path/to/your/project
   ```

3. **Edit the `.env` file** (or create it if it doesn't exist):
   ```bash
   nano .env
   # or
   vi .env
   ```

4. **Add the same Gmail configuration** as shown above

5. **Save and exit**:
   - For `nano`: Press `Ctrl+X`, then `Y`, then `Enter`
   - For `vi`: Press `Esc`, type `:wq`, then `Enter`

6. **Restart your application**:
   ```bash
   # If using PM2:
   pm2 restart all
   
   # If using systemd:
   sudo systemctl restart your-app-name
   
   # Or manually:
   npm run dev
   ```

---

## ✅ Step 5: Test Email Configuration

### Option 1: Test via Frontend UI

1. **Start your backend server**:
   ```bash
   npm run dev
   ```

2. **Start your frontend** (in another terminal):
   ```bash
   cd frontend
   npm run dev
   ```

3. **Login to your application**

4. **Go to Settings** → **Notification Settings**

5. **Enable Email Notifications**:
   - Toggle **"Email Notifications"** to **ON**
   - Enter your email address (can be different from the sender)
   - Click **"Save Settings"**

6. **Click "Send Test Email"** button

7. **Check your inbox** (and spam folder) for the test email

### Option 2: Test via Backend Logs

1. **Start your backend server**:
   ```bash
   npm run dev
   ```

2. **Look for these log messages**:
   ```
   ✅ Email transporter ready
   ```
   
   If you see:
   ```
   ⚠️ Email transporter verification failed: ...
   ```
   
   Then check:
   - Is `EMAIL_USER` correct? (full email address)
   - Is `EMAIL_PASS` correct? (16-character App Password, not your regular password)
   - Did you enable 2-Step Verification?
   - Did you generate an App Password?

---

## 🐛 Troubleshooting

### Error: "Email authentication failed"

**Solution**:
- Make sure you're using an **App Password**, not your regular Gmail password
- Verify 2-Step Verification is enabled
- Check that the App Password has no extra spaces

### Error: "Could not connect to email server"

**Solution**:
- Verify `EMAIL_HOST=smtp.gmail.com`
- Verify `EMAIL_PORT=587` (or try `465` with `secure: true`)
- Check your VPS firewall allows outbound connections on port 587

### Error: "Less secure app access" (deprecated)

**Solution**:
- Google no longer supports "Less secure apps"
- You **MUST** use App Passwords with 2-Step Verification enabled

### Emails going to Spam

**Solution**:
- This is normal for automated emails
- Check your spam/junk folder
- Mark the email as "Not Spam" to train Gmail
- Consider using a professional email service (SendGrid/Mailgun) for production

---

## 🌐 VPS-Specific Notes

### ✅ Gmail SMTP Works on VPS

Gmail SMTP works perfectly on VPS because:
- SMTP is a standard protocol that works from anywhere
- Gmail doesn't restrict connections by IP (unlike some corporate emails)
- Port 587 (TLS) is open on most VPS providers

### Firewall Configuration

If emails aren't sending from VPS, check firewall:

```bash
# Check if port 587 is blocked (should return connection)
telnet smtp.gmail.com 587

# Or test with curl
curl -v telnet://smtp.gmail.com:587
```

If blocked, allow outbound port 587:
```bash
# Ubuntu/Debian (UFW)
sudo ufw allow out 587/tcp

# CentOS/RHEL (firewalld)
sudo firewall-cmd --add-port=587/tcp --permanent
sudo firewall-cmd --reload
```

---

## 📋 Quick Reference

**Required `.env` variables**:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
EMAIL_FROM=your-email@gmail.com
```

**Gmail SMTP Settings**:
- **Host**: `smtp.gmail.com`
- **Port**: `587` (TLS) or `465` (SSL)
- **Security**: TLS (port 587) or SSL (port 465)
- **Authentication**: Required (App Password)

---

## 🎉 Success Checklist

- [ ] Created new Gmail account
- [ ] Enabled 2-Step Verification
- [ ] Generated App Password
- [ ] Added email config to `.env` file
- [ ] Restarted application
- [ ] Saw "Email transporter ready" in logs
- [ ] Sent test email successfully
- [ ] Received test email in inbox

---

## 💡 Pro Tips

1. **Use a dedicated Gmail account** for your application (not your personal email)
2. **Save the App Password securely** - you'll need it if you redeploy
3. **For production**, consider using SendGrid or Mailgun for better deliverability
4. **Monitor your Gmail account** - Google has daily sending limits (~500 emails/day for free accounts)
5. **Check spam folder** - Automated emails often go to spam initially

---

## 🚀 Next Steps

Once Gmail is working:
1. Test email notifications when slots are found
2. Configure other notification channels (WhatsApp, Telegram, SMS)
3. Set up monitoring for your profiles
4. Deploy to VPS with the same `.env` configuration

---

**Need Help?** Check the logs:
```bash
# Backend logs will show email status
npm run dev

# Look for:
# ✅ Email transporter ready
# ✅ Email sent to user@example.com: <message-id>
```

