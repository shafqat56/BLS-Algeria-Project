import { useState, useEffect } from 'react'
import { addAlertListener } from '../../utils/alerts'

const AlertContainer = () => {
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    const listener = (alert) => {
      if (alert.remove) {
        setAlerts(prev => prev.filter(a => a.id !== alert.id))
      } else {
        setAlerts(prev => [...prev, alert])
      }
    }
    return addAlertListener(listener)
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      maxWidth: '400px'
    }}>
      {alerts.map(alert => (
        <div key={alert.id} className={`alert alert-${alert.type}`}>
          <i className={`fas fa-${alert.type === 'success' ? 'check-circle' : alert.type === 'error' ? 'exclamation-circle' : 'info-circle'}`}></i>
          <span>{alert.message}</span>
          <button 
            onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  )
}

export default AlertContainer

