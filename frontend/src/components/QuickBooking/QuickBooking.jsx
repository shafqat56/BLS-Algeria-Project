import { useState, useEffect } from 'react'
import { profileAPI } from '../../services/api'
import { showLoading, hideLoading } from '../Common/LoadingOverlay'
import { showAlert } from '../../utils/alerts'
import axios from 'axios'

const QuickBooking = () => {
  const [profiles, setProfiles] = useState([])
  const [selectedProfile, setSelectedProfile] = useState('')
  const [autofillMode, setAutofillMode] = useState('semi')
  const [bookingUrl, setBookingUrl] = useState('')
  const [isBooking, setIsBooking] = useState(false)

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    try {
      const response = await profileAPI.getAll()
      if (response.data.success) {
        setProfiles(response.data.profiles || [])
        if (response.data.profiles?.length > 0) {
          setSelectedProfile(response.data.profiles[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading profiles:', error)
      showAlert('Error loading profiles', 'error')
    }
  }

  const handleQuickBook = async () => {
    if (!selectedProfile) {
      showAlert('Please select a profile', 'warning')
      return
    }

    try {
      setIsBooking(true)
      showLoading('Opening booking page with autofill...')

      const token = localStorage.getItem('authToken')
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/autofill/quick-book`,
        {
          profileId: selectedProfile,
          mode: autofillMode
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.data.success) {
        if (autofillMode === 'semi' && response.data.url) {
          // Open in new tab for semi mode
          window.open(response.data.url, '_blank')
          showAlert('Booking page opened! Form is pre-filled. Complete the booking manually.', 'success')
          setBookingUrl(response.data.url)
        } else {
          showAlert(response.data.message || 'Booking initiated', 'success')
        }
      } else {
        showAlert(response.data.error || 'Booking failed', 'error')
      }
    } catch (error) {
      console.error('Quick booking error:', error)
      showAlert(error.response?.data?.error || 'Error initiating booking', 'error')
    } finally {
      setIsBooking(false)
      hideLoading()
    }
  }

  const handleGetFormData = async () => {
    if (!selectedProfile) {
      showAlert('Please select a profile', 'warning')
      return
    }

    try {
      showLoading('Loading form data...')
      const token = localStorage.getItem('authToken')
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/autofill/profile/${selectedProfile}/data`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.data.success) {
        const data = response.data.data
        const formDataText = `
Full Name: ${data.fullName}
Passport: ${data.passportNumber}
Email: ${data.email}
Phone: ${data.phone}
Date of Birth: ${data.dateOfBirth}
Nationality: ${data.nationality}
Visa Category: ${data.visaCategory}
Appointment Type: ${data.appointmentType}
BLS Center: ${data.blsCenter}
        `.trim()

        // Copy to clipboard
        navigator.clipboard.writeText(formDataText).then(() => {
          showAlert('Form data copied to clipboard!', 'success')
        }).catch(() => {
          // Fallback: show in alert
          alert('Form Data:\n\n' + formDataText)
        })
      }
    } catch (error) {
      console.error('Error getting form data:', error)
      showAlert('Error loading form data', 'error')
    } finally {
      hideLoading()
    }
  }

  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h2>Quick Booking</h2>
          <p>Quickly book an appointment with autofill</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <i className="fas fa-bolt"></i>
            <span>Quick Booking Assistant</span>
          </div>
        </div>
        <div style={{ padding: '20px' }}>
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-user"></i> Select Profile
            </label>
            <select 
              className="form-input" 
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
            >
              <option value="">Select a profile</option>
              {profiles.map(profile => (
                <option key={profile.id} value={profile.id}>
                  {profile.profile_name || profile.full_name} - {profile.bls_center.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-cog"></i> Autofill Mode
            </label>
            <select 
              className="form-input" 
              value={autofillMode}
              onChange={(e) => setAutofillMode(e.target.value)}
            >
              <option value="semi">Semi-Auto (Fill Forms, You Complete)</option>
              <option value="full">Full Auto (Attempt Complete Booking)</option>
            </select>
            <small style={{ color: '#718096', display: 'block', marginTop: '5px' }}>
              {autofillMode === 'semi' 
                ? 'Form will be pre-filled. You complete the booking manually.'
                : 'System will attempt to complete the entire booking process automatically.'}
            </small>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-primary" 
              onClick={handleQuickBook}
              disabled={isBooking || !selectedProfile}
            >
              <i className="fas fa-rocket"></i>
              {isBooking ? 'Opening...' : 'Start Quick Booking'}
            </button>
            <button 
              className="btn btn-outline" 
              onClick={handleGetFormData}
              disabled={!selectedProfile}
            >
              <i className="fas fa-copy"></i>
              Copy Form Data
            </button>
          </div>

          {bookingUrl && (
            <div style={{ marginTop: '20px', padding: '15px', background: '#e8f4f8', borderRadius: '8px' }}>
              <p style={{ margin: 0, marginBottom: '10px' }}>
                <strong>Booking URL:</strong>
              </p>
              <a 
                href={bookingUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#2d6ef5', wordBreak: 'break-all' }}
              >
                {bookingUrl}
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <div className="card-title">
            <i className="fas fa-info-circle"></i>
            <span>How It Works</span>
          </div>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ marginBottom: '10px' }}>Semi-Auto Mode</h4>
            <p style={{ color: '#718096', lineHeight: '1.6' }}>
              The system will open the BLS booking page in a new tab and automatically fill in all your information. 
              You then complete the booking by selecting the slot and confirming.
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: '10px' }}>Full Auto Mode</h4>
            <p style={{ color: '#718096', lineHeight: '1.6' }}>
              The system will attempt to complete the entire booking process automatically, including selecting 
              the first available slot and submitting the form. Use with caution and verify bookings on BLS website.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default QuickBooking

