import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const token = localStorage.getItem('authToken')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const response = await authAPI.getCurrentUser()
      if (response.data.success) {
        setUser(response.data.user)
      }
    } catch (error) {
      console.error('Error loading user:', error)
      localStorage.removeItem('authToken')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const response = await authAPI.login(email, password)
    if (response.data.success && response.data.token) {
      localStorage.setItem('authToken', response.data.token)
      setUser(response.data.user)
      return response.data
    }
    throw new Error(response.data.error || 'Login failed')
  }

  const register = async (email, password) => {
    const response = await authAPI.register(email, password)
    return response.data
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    setUser(null)
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    loadUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

