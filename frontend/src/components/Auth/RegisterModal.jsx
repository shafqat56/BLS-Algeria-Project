import { useState } from 'react'
import { showLoading, hideLoading } from '../Common/LoadingOverlay'
import { showAlert } from '../../utils/alerts'
import { authAPI } from '../../services/api'
import './Auth.css'

const RegisterModal = ({ show, onClose, onLoginClick, onAuthSuccess }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      showAlert('Please enter both email and password', 'error')
      return
    }

    if (password.length < 8) {
      showAlert('Password must be at least 8 characters', 'error')
      return
    }

    try {
      showLoading('Registering...')
      const response = await authAPI.register(email, password)
      
      if (response.data.success) {
        showAlert('Registration successful! Please login.', 'success')
        setTimeout(() => {
          onClose()
          onLoginClick()
        }, 1000)
      }
    } catch (error) {
      showAlert(error.response?.data?.error || 'Registration failed', 'error')
    } finally {
      hideLoading()
    }
  }

  if (!show) return null

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}>&times;</button>
        <div className="modal-header">
          <h3>Create Account</h3>
          <p>Register a new account to get started</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password (min 8 characters)</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a secure password"
              required
              minLength={8}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              <i className="fas fa-user-plus"></i>
              Register
            </button>
            <button type="button" className="btn btn-outline" onClick={onLoginClick}>
              Already have account? Login
            </button>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegisterModal

