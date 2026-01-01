import { useState, useEffect } from 'react'
import { monitorAPI, profileAPI } from '../../services/api'
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

const Monitoring = () => {
  const [monitors, setMonitors] = useState([])
  const [profiles, setProfiles] = useState([])
  const [formData, setFormData] = useState({
    profileId: '', blsCenter: 'algiers_1', checkInterval: 5, autofillMode: 'manual'
  })

  useEffect(() => {
    loadMonitors()
    loadProfiles()
    
    // Refresh monitors every 10 seconds to show updated last_check
    const interval = setInterval(() => {
      loadMonitors()
    }, 10000)
    
    // Listen for navigation events to reload profiles when navigating to monitoring page
    const handleNavigate = (e) => {
      if (e.detail === 'monitoring') {
        loadProfiles()
        loadMonitors()
      }
    }
    window.addEventListener('navigate', handleNavigate)
    
    // Listen for profile updates (when a profile is created/updated/deleted)
    const handleProfileUpdate = () => {
      loadProfiles()
    }
    window.addEventListener('profileUpdated', handleProfileUpdate)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('navigate', handleNavigate)
      window.removeEventListener('profileUpdated', handleProfileUpdate)
    }
  }, [])

  const loadMonitors = async () => {
    try {
      const response = await monitorAPI.getAll()
      if (response.data.success) {
        setMonitors(response.data.monitors || [])
      }
    } catch (error) {
      console.error('Error loading monitors:', error)
    }
  }

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

  const handleStart = async (e) => {
    e.preventDefault()
    if (!formData.profileId) {
      showAlert('Please select a profile', 'error')
      return
    }

    try {
      showLoading('Starting monitor...')
      const response = await monitorAPI.start(formData)
      if (response.data.success) {
        showAlert('Monitoring started successfully!', 'success')
        loadMonitors()
      }
    } catch (error) {
      showAlert(error.response?.data?.error || 'Error starting monitor', 'error')
    } finally {
      hideLoading()
    }
  }

  const handleStop = async (id) => {
    try {
      showLoading('Stopping monitor...')
      await monitorAPI.stop(id)
      showAlert('Monitor stopped', 'success')
      loadMonitors()
    } catch (error) {
      showAlert('Error stopping monitor', 'error')
    } finally {
      hideLoading()
    }
  }

  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h2 id="pageTitle">Live Monitoring</h2>
          <p id="pageDescription">Configure and manage active monitors</p>
        </div>
      </div>

      <div className="form-container">
        <h3 style={{ marginBottom: '25px' }}>Monitoring Configuration</h3>
        <form onSubmit={handleStart}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label"><i className="fas fa-user"></i> Profile</label>
              <select className="form-input" value={formData.profileId}
                onChange={(e) => setFormData({...formData, profileId: e.target.value})} required>
                <option value="">Select a profile</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.profile_name || p.full_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label"><i className="fas fa-map-marker-alt"></i> BLS Center</label>
              <select className="form-input" value={formData.blsCenter}
                onChange={(e) => setFormData({...formData, blsCenter: e.target.value})} required>
                {BLS_CENTERS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label"><i className="fas fa-clock"></i> Check Interval (minutes)</label>
              <input type="number" className="form-input" min="3" max="30" value={formData.checkInterval}
                onChange={(e) => setFormData({...formData, checkInterval: parseInt(e.target.value)})} required />
              <small style={{ color: '#718096', display: 'block', marginTop: '5px' }}>
                Minimum 3 minutes to avoid detection
              </small>
            </div>
            <div className="form-group">
              <label className="form-label"><i className="fas fa-bolt"></i> Auto-fill Mode</label>
              <select className="form-input" value={formData.autofillMode}
                onChange={(e) => setFormData({...formData, autofillMode: e.target.value})}>
                <option value="manual">Manual (Notify Only)</option>
                <option value="semi">Semi-Auto (Fill Forms)</option>
                <option value="full">Full Auto (Attempt Booking)</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-success">
              <i className="fas fa-play"></i> Start Monitoring
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><i className="fas fa-tasks"></i> Active Monitors</div>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Center</th>
                <th>Status</th>
                <th>Last Check</th>
                <th>Found</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {monitors.map(monitor => (
                <tr key={monitor.id}>
                  <td>{monitor.bls_center.replace('_', ' ').toUpperCase()}</td>
                  <td><span className={`status-badge ${monitor.status}`}>{monitor.status}</span></td>
                  <td>
                    {monitor.last_check 
                      ? new Date(monitor.last_check).toLocaleString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit',
                          second: '2-digit'
                        })
                      : monitor.status === 'active' 
                        ? 'Checking...' 
                        : 'Never'}
                  </td>
                  <td>{monitor.slots_found || 0}</td>
                  <td>
                    {monitor.status === 'active' ? (
                      <button className="btn btn-sm btn-danger" onClick={() => handleStop(monitor.id)}>
                        Stop
                      </button>
                    ) : (
                      <button className="btn btn-sm btn-success" onClick={() => monitorAPI.resume(monitor.id).then(loadMonitors)}>
                        Start
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {monitors.length === 0 && (
                <tr><td colSpan="5" style={{ textAlign: 'center' }}>No monitors configured</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

export default Monitoring

