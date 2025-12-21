import { useState, useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import Layout from './components/Layout/Layout'
import LoginModal from './components/Auth/LoginModal'
import RegisterModal from './components/Auth/RegisterModal'
import AlertContainer from './components/Common/AlertContainer'
import LoadingOverlay from './components/Common/LoadingOverlay'
import './App.css'

function App() {
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    console.log('App mounted, checking authentication...')
    const token = localStorage.getItem('authToken')
    if (token) {
      console.log('Token found, setting authenticated')
      setIsAuthenticated(true)
    } else {
      console.log('No token found, showing login')
      setShowLogin(true)
    }
  }, [])

  const handleAuthSuccess = () => {
    setIsAuthenticated(true)
    setShowLogin(false)
    setShowRegister(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    setIsAuthenticated(false)
    setShowLogin(true)
  }

  if (!isAuthenticated) {
    return (
      <>
        {showLogin && (
          <LoginModal 
            show={showLogin} 
            onClose={() => setShowLogin(false)}
            onRegisterClick={() => { setShowLogin(false); setShowRegister(true) }}
            onAuthSuccess={handleAuthSuccess}
          />
        )}
        {showRegister && (
          <RegisterModal 
            show={showRegister} 
            onClose={() => setShowRegister(false)}
            onLoginClick={() => { setShowRegister(false); setShowLogin(true) }}
            onAuthSuccess={handleAuthSuccess}
          />
        )}
        <AlertContainer />
      </>
    )
  }

  return (
    <AuthProvider>
      <SocketProvider>
        <Layout onLogout={handleLogout} />
        <AlertContainer />
        <LoadingOverlay />
      </SocketProvider>
    </AuthProvider>
  )
}

export default App

