import { useState, useEffect } from 'react'
import { settingsAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { showLoading, hideLoading } from '../Common/LoadingOverlay'
import { showAlert } from '../../utils/alerts'
import BiometricSettings from './BiometricSettings'
import PaymentSettings from './PaymentSettings'

const Settings = () => {
  const { user } = useAuth()
  const [settings, setSettings] = useState({
    emailNotifications: true,
    whatsappNotifications: false,
    telegramNotifications: false,
    smsNotifications: false,
    emailAddress: '',
    whatsappNumber: '',
    telegramChatId: '',
    phoneNumber: '',
    captchaEnabled: true,
    captchaApiKey: '',
    paymentMethod: 'none',
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await settingsAPI.get()
      if (response.data.success) {
        const data = response.data.settings || {}
        setSettings({
          emailNotifications: data.email_notifications ?? true,
          whatsappNotifications: data.whatsapp_notifications ?? false,
          telegramNotifications: data.telegram_notifications ?? false,
          smsNotifications: data.sms_notifications ?? false,
          emailAddress: data.email_address || '',
          whatsappNumber: data.whatsapp_number || '',
          telegramChatId: data.telegram_chat_id || '',
          phoneNumber: data.phone_number || '',
          captchaEnabled: data.captcha_enabled ?? true,
          captchaApiKey: data.captcha_api_key || '',
          paymentMethod: data.payment_method || 'none',
        })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      showLoading('Saving settings...')
      const response = await settingsAPI.update(settings)
      if (response.data.success) {
        showAlert('Settings saved successfully!', 'success')
      }
    } catch (error) {
      showAlert('Error saving settings', 'error')
    } finally {
      hideLoading()
    }
  }

  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h2 id="pageTitle">Settings</h2>
          <p id="pageDescription">Configure your preferences and notifications</p>
        </div>
      </div>

      <div className="form-container">
        <h3 style={{ marginBottom: '25px' }}>Notification Settings</h3>
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                <input type="checkbox" checked={settings.emailNotifications}
                  onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})} />
                Email Notifications
              </label>
              {settings.emailNotifications && (
                <input type="email" className="form-input" placeholder="Email address"
                  value={settings.emailAddress} onChange={(e) => setSettings({...settings, emailAddress: e.target.value})} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">
                <input type="checkbox" checked={settings.whatsappNotifications}
                  onChange={(e) => setSettings({...settings, whatsappNotifications: e.target.checked})} />
                WhatsApp Notifications
              </label>
              {settings.whatsappNotifications && (
                <input type="tel" className="form-input" placeholder="WhatsApp number"
                  value={settings.whatsappNumber} onChange={(e) => setSettings({...settings, whatsappNumber: e.target.value})} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label"><i className="fas fa-shield-alt"></i> CAPTCHA Service</label>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input type="checkbox" checked={settings.captchaEnabled}
                    onChange={(e) => setSettings({...settings, captchaEnabled: e.target.checked})} />
                  Enable CAPTCHA Solving (2Captcha)
                </label>
                {settings.captchaEnabled && (
                  <input type="password" className="form-input" placeholder="2Captcha API Key"
                    value={settings.captchaApiKey} onChange={(e) => setSettings({...settings, captchaApiKey: e.target.value})} />
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label"><i className="fas fa-credit-card"></i> Payment Method</label>
              <select className="form-input" value={settings.paymentMethod}
                onChange={(e) => setSettings({...settings, paymentMethod: e.target.value})}>
                <option value="none">None</option>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
              </select>
              <small style={{ color: '#718096', display: 'block', marginTop: '5px' }}>
                Payment method for app subscription (if applicable)
              </small>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              <i className="fas fa-save"></i> Save Settings
            </button>
          </div>
        </form>

        <BiometricSettings user={user} onUpdate={loadSettings} />
        <PaymentSettings user={user} onUpdate={loadSettings} />
      </div>
    </>
  )
}

export default Settings

