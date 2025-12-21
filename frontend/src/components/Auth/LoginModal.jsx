import { useState } from 'react'
import { showLoading, hideLoading } from '../Common/LoadingOverlay'
import { showAlert } from '../../utils/alerts'
import { authAPI } from '../../services/api'
import './Auth.css'

const LoginModal = ({ show, onClose, onRegisterClick, onAuthSuccess }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      showAlert('Please enter both email and password', 'error')
      return
    }

    try {
      showLoading('Logging in...')
      const response = await authAPI.login(email, password)
      
      if (response.data.success && response.data.token) {
        localStorage.setItem('authToken', response.data.token)
        showAlert('Login successful!', 'success')
        onAuthSuccess()
      }
    } catch (error) {
      showAlert(error.response?.data?.error || 'Login failed', 'error')
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
          <h3>Secure Login</h3>
          <p>Enter your credentials to access the automation system</p>
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
            <label className="form-label">Master Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your master password"
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              <i className="fas fa-lock"></i>
              Login
            </button>
            <button type="button" className="btn btn-outline" onClick={onRegisterClick}>
              Register
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

export default LoginModal

