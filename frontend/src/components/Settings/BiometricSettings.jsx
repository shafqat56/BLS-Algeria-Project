import { useState } from 'react'
import { authAPI } from '../../services/api'
import { showLoading, hideLoading } from '../Common/LoadingOverlay'
import { showAlert } from '../../utils/alerts'

const BiometricSettings = ({ user, onUpdate }) => {
  const [enabling, setEnabling] = useState(false)

  const handleEnableBiometric = async () => {
    if (!window.PublicKeyCredential) {
      showAlert('Biometric authentication is not supported on this device/browser', 'error')
      return
    }

    try {
      setEnabling(true)
      showLoading('Setting up biometric authentication...')

      // Request biometric credential
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: {
            name: 'BLS Bot Pro',
            id: window.location.hostname,
          },
          user: {
            id: new Uint8Array(16),
            name: user.email,
            displayName: user.email,
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: {
            userVerification: 'preferred',
          },
          timeout: 60000,
        },
      })

      // Convert credential to string for storage
      const credentialId = Array.from(new Uint8Array(credential.rawId))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      // Enable biometric on backend
      const response = await authAPI.enableBiometric(credentialId)
      
      if (response.data.success) {
        showAlert('Biometric authentication enabled successfully!', 'success')
        if (onUpdate) onUpdate()
      }
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        showAlert('Biometric authentication was cancelled or not available', 'error')
      } else {
        showAlert('Failed to enable biometric authentication', 'error')
      }
      console.error('Biometric error:', error)
    } finally {
      setEnabling(false)
      hideLoading()
    }
  }

  const handleVerifyBiometric = async () => {
    try {
      showLoading('Verifying biometric...')

      // Request biometric assertion
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          timeout: 60000,
        },
      })

      const credentialId = Array.from(new Uint8Array(assertion.rawId))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      const response = await authAPI.verifyBiometric(credentialId)
      
      if (response.data.success) {
        showAlert('Biometric verification successful!', 'success')
        // Token is returned, update auth state
        if (response.data.token) {
          localStorage.setItem('authToken', response.data.token)
          if (onUpdate) onUpdate()
        }
      }
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        showAlert('Biometric verification was cancelled', 'error')
      } else {
        showAlert('Biometric verification failed', 'error')
      }
      console.error('Biometric verification error:', error)
    } finally {
      hideLoading()
    }
  }

  const isSupported = typeof window !== 'undefined' && window.PublicKeyCredential

  return (
    <div className="card" style={{ marginTop: '30px' }}>
      <div className="card-header">
        <div className="card-title">
          <div className="card-icon primary">
            <i className="fas fa-fingerprint"></i>
          </div>
          <span>Biometric Authentication (Face ID / Fingerprint)</span>
        </div>
      </div>
      <div style={{ padding: '20px' }}>
        {!isSupported && (
          <div className="alert alert-warning">
            <i className="fas fa-exclamation-triangle"></i>
            <span>Biometric authentication is not supported on this device or browser. Please use a modern browser with biometric support (Chrome, Safari, Edge).</span>
          </div>
        )}

        {isSupported && (
          <>
            <p style={{ color: '#718096', marginBottom: '20px' }}>
              Enable Face ID or Fingerprint authentication for quick and secure access to your account.
            </p>

            {!user?.biometricEnabled ? (
              <button 
                className="btn btn-primary" 
                onClick={handleEnableBiometric}
                disabled={enabling}
              >
                <i className="fas fa-fingerprint"></i>
                {enabling ? 'Setting up...' : 'Enable Face ID / Fingerprint'}
              </button>
            ) : (
              <div>
                <div className="alert alert-success" style={{ marginBottom: '20px' }}>
                  <i className="fas fa-check-circle"></i>
                  <span>Biometric authentication is enabled for this account</span>
                </div>
                <button 
                  className="btn btn-outline" 
                  onClick={handleVerifyBiometric}
                >
                  <i className="fas fa-lock-open"></i>
                  Test Biometric Login
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default BiometricSettings

