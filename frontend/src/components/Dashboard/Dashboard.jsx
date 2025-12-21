import { useEffect, useState } from 'react'
import { monitorAPI, profileAPI } from '../../services/api'

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalChecks: 0,
    foundSlots: 0,
    activeCenters: 0,
    lastCheck: '-'
  })
  const [profileCount, setProfileCount] = useState(0)

  useEffect(() => {
    loadStats()
    loadProfileCount()
  }, [])

  const loadStats = async () => {
    try {
      const response = await monitorAPI.getAll()
      if (response.data.success) {
        const monitors = response.data.monitors || []
        const totalChecks = monitors.reduce((sum, m) => sum + (m.total_checks || 0), 0)
        const foundSlots = monitors.reduce((sum, m) => sum + (m.slots_found || 0), 0)
        const activeCount = monitors.filter(m => m.status === 'active').length
        const lastCheck = monitors.length > 0 && monitors[0].last_check 
          ? new Date(monitors[0].last_check).toLocaleTimeString() 
          : '-'

        setStats({ totalChecks, foundSlots, activeCenters: activeCount, lastCheck })
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadProfileCount = async () => {
    try {
      const response = await profileAPI.getAll()
      if (response.data.success) {
        setProfileCount(response.data.profiles?.length || 0)
      }
    } catch (error) {
      console.error('Error loading profiles:', error)
    }
  }

  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h2 id="pageTitle">Dashboard Overview</h2>
          <p id="pageDescription">Monitor and manage your BLS appointment automation</p>
        </div>
        <div className="quick-actions">
          <button className="btn btn-primary" id="startMonitorBtn" onClick={() => {
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'monitoring' }))
          }}>
            <i className="fas fa-play"></i>
            Start Monitoring
          </button>
          <button className="btn btn-outline" id="addProfileBtn" onClick={() => {
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'profiles' }))
          }}>
            <i className="fas fa-plus"></i>
            Add Profile
          </button>
          <button className="btn btn-outline" id="settingsBtn" onClick={() => {
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'settings' }))
          }}>
            <i className="fas fa-cog"></i>
            Settings
          </button>
        </div>
      </div>

      <div className="cards-grid">
        <div className="card monitoring-card">
          <div className="card-header">
            <div className="card-title">
              <div className="card-icon primary">
                <i className="fas fa-search"></i>
              </div>
              <span>Live Monitoring Status</span>
            </div>
            <div className="status-indicator">
              <div className={`status-dot ${stats.activeCenters > 0 ? 'active' : 'inactive'}`}></div>
              <span>{stats.activeCenters > 0 ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
          <div className="monitoring-status">
            <div className="status-header">
              <h3 style={{ color: 'white' }}>BLS Appointment Tracker</h3>
            </div>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{stats.totalChecks}</div>
                <div className="stat-label">Total Checks</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.foundSlots}</div>
                <div className="stat-label">Slots Found</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.activeCenters}</div>
                <div className="stat-label">Active Centers</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.lastCheck}</div>
                <div className="stat-label">Last Check</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <div className="card-icon success">
                <i className="fas fa-user-check"></i>
              </div>
              <span>Profiles</span>
            </div>
          </div>
          <div style={{ padding: '10px 0' }}>
            <p style={{ color: '#718096', marginBottom: '15px', fontSize: '18px' }}>
              <strong>{profileCount}</strong> profile{profileCount !== 1 ? 's' : ''} configured
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => {
              window.dispatchEvent(new CustomEvent('navigate', { detail: 'profiles' }))
            }}>
              <i className="fas fa-plus"></i>
              Add Profile
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <div className="card-icon warning">
                <i className="fas fa-bell"></i>
              </div>
              <span>Notifications</span>
            </div>
          </div>
          <div style={{ padding: '10px 0' }}>
            <p style={{ color: '#718096', marginBottom: '15px' }}>
              Configure notifications to get alerts when slots are found
            </p>
            <button className="btn btn-outline btn-sm" onClick={() => {
              window.dispatchEvent(new CustomEvent('navigate', { detail: 'notifications' }))
            }}>
              <i className="fas fa-cog"></i>
              Setup
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Section */}
      <div className="card" style={{ marginTop: '30px' }}>
        <div className="card-header">
          <div className="card-title">
            <i className="fas fa-chart-line"></i>
            <span>Quick Statistics</span>
          </div>
        </div>
        <div className="stats-grid" style={{ marginTop: '20px' }}>
          <div className="stat-item" style={{ background: 'white', padding: '25px', borderRadius: '12px' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#2d6ef5', marginBottom: '10px' }}>
              {stats.totalChecks}
            </div>
            <div style={{ fontSize: '14px', color: '#718096', fontWeight: '600' }}>Total Checks</div>
          </div>
          <div className="stat-item" style={{ background: 'white', padding: '25px', borderRadius: '12px' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#38a169', marginBottom: '10px' }}>
              {stats.foundSlots}
            </div>
            <div style={{ fontSize: '14px', color: '#718096', fontWeight: '600' }}>Slots Found</div>
          </div>
          <div className="stat-item" style={{ background: 'white', padding: '25px', borderRadius: '12px' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#ed8936', marginBottom: '10px' }}>
              {profileCount}
            </div>
            <div style={{ fontSize: '14px', color: '#718096', fontWeight: '600' }}>Active Profiles</div>
          </div>
          <div className="stat-item" style={{ background: 'white', padding: '25px', borderRadius: '12px' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#4299e1', marginBottom: '10px' }}>
              {stats.activeCenters}
            </div>
            <div style={{ fontSize: '14px', color: '#718096', fontWeight: '600' }}>Active Monitors</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <i className="fas fa-history"></i>
            <span>Recent Activity</span>
          </div>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Center</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="activityLog">
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: '#718096', padding: '20px' }}>
                  No recent activity
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

export default Dashboard
