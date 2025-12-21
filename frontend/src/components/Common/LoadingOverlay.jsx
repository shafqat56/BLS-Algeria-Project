import { useState, useEffect } from 'react'

let loadingListeners = []

export const showLoading = (text = 'Loading...') => {
  loadingListeners.forEach(listener => listener({ show: true, text }))
}

export const hideLoading = () => {
  loadingListeners.forEach(listener => listener({ show: false }))
}

const LoadingOverlay = () => {
  const [loading, setLoading] = useState({ show: false, text: 'Loading...' })

  useEffect(() => {
    const listener = (state) => {
      setLoading(state)
    }
    loadingListeners.push(listener)
    return () => {
      loadingListeners = loadingListeners.filter(l => l !== listener)
    }
  }, [])

  if (!loading.show) return null

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal" style={{ background: 'transparent', boxShadow: 'none' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <i className="fas fa-spinner fa-spin fa-3x" style={{ marginBottom: '20px' }}></i>
          <h3>{loading.text}</h3>
        </div>
      </div>
    </div>
  )
}

export default LoadingOverlay

