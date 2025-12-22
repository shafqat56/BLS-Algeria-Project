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

      // Generate random challenge
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      // Convert user ID to buffer
      const userIdBuffer = new TextEncoder().encode(user.id)

      // Request biometric credential
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: {
            name: 'BLS Bot Pro',
            id: window.location.hostname || 'localhost',
          },
          user: {
            id: userIdBuffer,
            name: user.email,
            displayName: user.email,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // Use device authenticator
            userVerification: 'required',
            requireResidentKey: false
          },
          timeout: 60000,
          attestation: 'direct'
        },
      })

      // Convert credential data to base64 for storage
      const credentialData = {
        id: Array.from(new Uint8Array(credential.rawId))
          .map(b => String.fromCharCode(b))
          .join(''),
        rawId: Array.from(new Uint8Array(credential.rawId))
          .map(b => b.toString(16).padStart(2, '0'))
          .join(''),
        response: {
          attestationObject: Array.from(new Uint8Array(credential.response.attestationObject))
            .map(b => String.fromCharCode(b))
            .join(''),
          clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON))
            .map(b => String.fromCharCode(b))
            .join('')
        },
        type: credential.type
      }

      // Convert to base64 for storage
      const credentialString = btoa(JSON.stringify(credentialData))

      // Enable biometric on backend
      const response = await authAPI.enableBiometric(credentialString)
      
      if (response.data.success) {
        showAlert('Biometric authentication enabled successfully!', 'success')
        if (onUpdate) onUpdate()
      }
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        showAlert('Biometric authentication was cancelled or not available', 'error')
      } else if (error.name === 'NotSupportedError') {
        showAlert('Biometric authentication is not supported on this device', 'error')
      } else {
        showAlert('Failed to enable biometric authentication: ' + error.message, 'error')
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

      // Generate random challenge
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      // Request biometric assertion
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          timeout: 60000,
          userVerification: 'required',
          allowCredentials: [] // Empty array means use any available credential
        },
      })

      // Prepare assertion data
      const assertionData = {
        id: Array.from(new Uint8Array(assertion.rawId))
          .map(b => String.fromCharCode(b))
          .join(''),
        rawId: Array.from(new Uint8Array(assertion.rawId))
          .map(b => b.toString(16).padStart(2, '0'))
          .join(''),
        response: {
          authenticatorData: Array.from(new Uint8Array(assertion.response.authenticatorData))
            .map(b => String.fromCharCode(b))
            .join(''),
          clientDataJSON: Array.from(new Uint8Array(assertion.response.clientDataJSON))
            .map(b => String.fromCharCode(b))
            .join(''),
          signature: Array.from(new Uint8Array(assertion.response.signature))
            .map(b => String.fromCharCode(b))
            .join(''),
          userHandle: assertion.response.userHandle ? 
            Array.from(new Uint8Array(assertion.response.userHandle))
              .map(b => String.fromCharCode(b))
              .join('') : null
        },
        type: assertion.type
      }

      // Convert to base64
      const assertionString = btoa(JSON.stringify(assertionData))

      const response = await authAPI.verifyBiometric(assertionString)
      
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
      } else if (error.name === 'InvalidStateError') {
        showAlert('No biometric credential found. Please enable biometric authentication first.', 'error')
      } else {
        showAlert('Biometric verification failed: ' + error.message, 'error')
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

