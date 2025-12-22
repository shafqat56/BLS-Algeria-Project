import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Sidebar from './Sidebar'
import Dashboard from '../Dashboard/Dashboard'
import Profiles from '../Profiles/Profiles'
import Monitoring from '../Monitoring/Monitoring'
import Settings from '../Settings/Settings'
import QuickBooking from '../QuickBooking/QuickBooking'
import '../Layout/Layout.css'

const Layout = ({ onLogout }) => {
  const { user } = useAuth()
  const [activePage, setActivePage] = useState('dashboard')

  useEffect(() => {
    const handleNavigate = (e) => {
      setActivePage(e.detail)
      // Scroll to top when navigating
      document.querySelector('.main-content').scrollTop = 0
    }
    window.addEventListener('navigate', handleNavigate)
    return () => window.removeEventListener('navigate', handleNavigate)
  }, [])

  return (
    <div id="app">
      <Sidebar 
        activePage={activePage} 
        onPageChange={setActivePage}
        user={user}
        onLogout={onLogout}
      />
      <div className="main-content">
        <div id="contentPages">
          {/* All pages visible on one scrollable page */}
          <div className={`page ${activePage === 'dashboard' ? 'active' : ''}`} id="dashboardPage">
            <Dashboard />
          </div>

          <div className={`page ${activePage === 'monitoring' ? 'active' : ''}`} id="monitoringPage">
            <Monitoring />
          </div>

          <div className={`page ${activePage === 'profiles' ? 'active' : ''}`} id="profilesPage">
            <Profiles />
          </div>

          <div className={`page ${activePage === 'settings' ? 'active' : ''}`} id="settingsPage">
            <Settings />
          </div>

          <div className={`page ${activePage === 'slots' ? 'active' : ''}`} id="slotsPage">
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <i className="fas fa-calendar-check"></i>
                  <span>Found Slots</span>
                </div>
              </div>
              <div style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>
                No slots found yet. Start monitoring to find available appointment slots.
              </div>
            </div>
          </div>

          <div className={`page ${activePage === 'centers' ? 'active' : ''}`} id="centersPage">
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <i className="fas fa-map-marker-alt"></i>
                  <span>BLS Centers</span>
                </div>
              </div>
              <div style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>
                BLS Centers information will be displayed here.
              </div>
            </div>
          </div>

          <div className={`page ${activePage === 'autofill' ? 'active' : ''}`} id="autofillPage">
            <QuickBooking />
          </div>

          <div className={`page ${activePage === 'notifications' ? 'active' : ''}`} id="notificationsPage">
            <Settings />
          </div>

          <div className={`page ${activePage === 'logs' ? 'active' : ''}`} id="logsPage">
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <i className="fas fa-clipboard-list"></i>
                  <span>Activity Logs</span>
                </div>
              </div>
              <div style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>
                Activity logs will be displayed here.
              </div>
            </div>
          </div>
        </div>
        <div id="alertsContainer"></div>
      </div>
    </div>
  )
}

export default Layout
