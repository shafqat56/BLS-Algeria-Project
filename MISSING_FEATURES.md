# Missing Features Status

## ✅ **IMPLEMENTED** (Backend + Frontend):

1. ✅ **Full name** - In Profiles form
2. ✅ **Passport number** - In Profiles form  
3. ✅ **Email + phone** - In Profiles form
4. ✅ **Visa category** - In Profiles form (all 11 types)
5. ✅ **Selected BLS center** - In Profiles & Monitoring forms (Algiers 1-4, Oran 1-3)
6. ✅ **Customizable refresh/check interval** - In Monitoring form (`checkInterval` field)
7. ✅ **Captcha pass** - In Settings (captchaEnabled, captchaApiKey fields)

## ⚠️ **BACKEND IMPLEMENTED, MISSING IN FRONTEND UI:**

8. ⚠️ **Appointment type** - Backend supports it, but NOT in Profiles form UI
9. ⚠️ **Face ID lock (Biometric)** - Backend API exists, but NO frontend UI
10. ⚠️ **Payment method** - Backend exists in Settings/User models, but NOT in Settings UI

## 📍 **WHERE THEY ARE:**

### ✅ Check Interval
- **Location**: Monitoring Configuration form
- **Field**: "Check Interval (minutes)"
- **Default**: 5 minutes
- **Range**: 3-30 minutes

### ⚠️ Appointment Type (MISSING IN UI)
- **Backend**: ✅ Profile model has `appointment_type` field
- **Backend**: ✅ API accepts `appointmentType` in POST/PUT
- **Frontend**: ❌ NOT in Profiles form UI
- **Action Needed**: Add dropdown/input field in Profiles form

### ⚠️ Face ID Lock (MISSING IN UI)
- **Backend**: ✅ `/api/auth/enable-biometric` endpoint
- **Backend**: ✅ `/api/auth/verify-biometric` endpoint
- **Backend**: ✅ User model has `biometric_enabled` and `biometric_data` fields
- **Frontend**: ❌ NO UI button/option to enable biometric
- **Action Needed**: Add biometric enable button in Settings or User profile section

### ⚠️ Payment Method (MISSING IN UI)
- **Backend**: ✅ Settings model has `payment_method` field (credit_card, debit_card, none)
- **Backend**: ✅ User model has `payment_method` field
- **Frontend**: ❌ NOT in Settings form UI
- **Action Needed**: Add payment method dropdown in Settings form

### ✅ Captcha Pass (IN SETTINGS)
- **Backend**: ✅ Settings model has `captcha_enabled` and `captcha_api_key` fields
- **Backend**: ✅ CaptchaService integrated with 2Captcha
- **Frontend**: ⚠️ Settings form exists but may need enhancement
- **Current**: Settings component has basic structure

