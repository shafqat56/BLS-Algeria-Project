import { useState, useEffect } from 'react'
import { profileAPI } from '../../services/api'
import { showLoading, hideLoading } from '../Common/LoadingOverlay'
import { showAlert } from '../../utils/alerts'

const BLS_CENTERS = [
  { value: 'algiers_1', label: 'Algiers 1' },
  { value: 'algiers_2', label: 'Algiers 2' },
  { value: 'algiers_3', label: 'Algiers 3' },
  { value: 'algiers_4', label: 'Algiers 4' },
  { value: 'oran_1', label: 'Oran 1' },
  { value: 'oran_2', label: 'Oran 2' },
  { value: 'oran_3', label: 'Oran 3' },
]

const VISA_TYPES = [
  { value: 'tourist', label: 'Tourist Visa' },
  { value: 'student', label: 'Student Visa' },
  { value: 'work', label: 'Work Visa' },
  { value: 'business', label: 'Business Visa' },
  { value: 'transit', label: 'Transit Visa' },
  { value: 'family', label: 'Family Visa' },
  { value: 'medical', label: 'Medical Visa' },
  { value: 'cultural', label: 'Cultural Visa' },
  { value: 'sports', label: 'Sports Visa' },
  { value: 'official', label: 'Official Visa' },
  { value: 'diplomatic', label: 'Diplomatic Visa' },
]

const Profiles = () => {
  const [profiles, setProfiles] = useState([])
  const [formData, setFormData] = useState({
    fullName: '', passportNumber: '', dateOfBirth: '', nationality: '',
    phone: '', email: '', visaCategory: 'tourist', blsCenter: 'algiers_1',
    appointmentType: 'Visa Application'
  })

  const APPOINTMENT_TYPES = [
    'Visa Application',
    'Passport Collection',
    'Document Submission',
    'Biometric Appointment',
    'Interview Appointment',
    'Other'
  ]

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    try {
      const response = await profileAPI.getAll()
      if (response.data.success) {
        setProfiles(response.data.profiles || [])
      }
    } catch (error) {
      console.error('Error loading profiles:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      showLoading('Saving profile...')
      const response = await profileAPI.create(formData)
      if (response.data.success) {
        showAlert('Profile saved successfully!', 'success')
        setFormData({
          fullName: '', passportNumber: '', dateOfBirth: '', nationality: '',
          phone: '', email: '', visaCategory: 'tourist', blsCenter: 'algiers_1',
          appointmentType: 'Visa Application'
        })
        loadProfiles()
      }
    } catch (error) {
      showAlert(error.response?.data?.error || 'Error saving profile', 'error')
    } finally {
      hideLoading()
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this profile?')) return
    try {
      showLoading('Deleting profile...')
      await profileAPI.delete(id)
      showAlert('Profile deleted successfully', 'success')
      loadProfiles()
    } catch (error) {
      showAlert('Error deleting profile', 'error')
    } finally {
      hideLoading()
    }
  }

  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h2 id="pageTitle">Visa Profiles</h2>
          <p id="pageDescription">Manage your visa application profiles</p>
        </div>
      </div>

      <div className="form-container">
        <h3 style={{ marginBottom: '25px' }}>Create Profile</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label"><i className="fas fa-user"></i> Full Name</label>
              <input type="text" className="form-input" value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label"><i className="fas fa-passport"></i> Passport Number</label>
              <input type="text" className="form-input" value={formData.passportNumber}
                onChange={(e) => setFormData({...formData, passportNumber: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label"><i className="fas fa-birthday-cake"></i> Date of Birth</label>
              <input type="date" className="form-input" value={formData.dateOfBirth}
                onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label"><i className="fas fa-flag"></i> Nationality</label>
              <input type="text" className="form-input" value={formData.nationality}
                onChange={(e) => setFormData({...formData, nationality: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label"><i className="fas fa-phone"></i> Phone</label>
              <input type="tel" className="form-input" value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label"><i className="fas fa-envelope"></i> Email</label>
              <input type="email" className="form-input" value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label"><i className="fas fa-file-alt"></i> Visa Category</label>
              <select className="form-input" value={formData.visaCategory}
                onChange={(e) => setFormData({...formData, visaCategory: e.target.value})} required>
                {VISA_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label"><i className="fas fa-map-marker-alt"></i> BLS Center</label>
              <select className="form-input" value={formData.blsCenter}
                onChange={(e) => setFormData({...formData, blsCenter: e.target.value})} required>
                {BLS_CENTERS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              <i className="fas fa-save"></i> Save Profile
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><i className="fas fa-users"></i> Saved Profiles</div>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Passport</th>
                <th>Visa Type</th>
                <th>Center</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(profile => (
                <tr key={profile.id}>
                  <td>{profile.full_name || 'N/A'}</td>
                  <td>{profile.passport_number || 'N/A'}</td>
                  <td>{profile.visa_category}</td>
                  <td>{profile.bls_center.replace('_', ' ').toUpperCase()}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(profile.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr><td colSpan="5" style={{ textAlign: 'center' }}>No profiles found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

export default Profiles

