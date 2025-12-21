import '../Layout/Sidebar.css'

const Sidebar = ({ activePage, onPageChange, user, onLogout }) => {
  return (
    <div className="sidebar">
      <div className="logo">
        <h1>
          <i className="fas fa-robot"></i>
          <span>BLS Bot Pro</span>
        </h1>
        <p>Automated Visa Slot Finder</p>
      </div>

      <div className="nav">
        <div className="nav-section">
          <div className="nav-title">Dashboard</div>
          <div 
            className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
            onClick={() => onPageChange('dashboard')}
          >
            <i className="fas fa-home"></i>
            <span>Overview</span>
          </div>
          <div 
            className={`nav-item ${activePage === 'monitoring' ? 'active' : ''}`}
            onClick={() => onPageChange('monitoring')}
          >
            <i className="fas fa-search"></i>
            <span>Live Monitoring</span>
          </div>
          <div 
            className={`nav-item ${activePage === 'slots' ? 'active' : ''}`}
            onClick={() => onPageChange('slots')}
          >
            <i className="fas fa-calendar-check"></i>
            <span>Found Slots</span>
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-title">Management</div>
          <div 
            className={`nav-item ${activePage === 'profiles' ? 'active' : ''}`}
            onClick={() => onPageChange('profiles')}
          >
            <i className="fas fa-user-circle"></i>
            <span>Visa Profiles</span>
          </div>
          <div 
            className={`nav-item ${activePage === 'centers' ? 'active' : ''}`}
            onClick={() => onPageChange('centers')}
          >
            <i className="fas fa-map-marker-alt"></i>
            <span>BLS Centers</span>
          </div>
          <div 
            className={`nav-item ${activePage === 'settings' ? 'active' : ''}`}
            onClick={() => onPageChange('settings')}
          >
            <i className="fas fa-cog"></i>
            <span>Settings</span>
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-title">Tools</div>
          <div 
            className={`nav-item ${activePage === 'autofill' ? 'active' : ''}`}
            onClick={() => onPageChange('autofill')}
          >
            <i className="fas fa-magic"></i>
            <span>Auto-fill</span>
          </div>
          <div 
            className={`nav-item ${activePage === 'notifications' ? 'active' : ''}`}
            onClick={() => onPageChange('notifications')}
          >
            <i className="fas fa-bell"></i>
            <span>Notifications</span>
          </div>
          <div 
            className={`nav-item ${activePage === 'logs' ? 'active' : ''}`}
            onClick={() => onPageChange('logs')}
          >
            <i className="fas fa-clipboard-list"></i>
            <span>Activity Logs</span>
          </div>
        </div>
      </div>

      <div className="user-info">
        <div className="user-avatar" id="userAvatar">
          {user?.email ? user.email[0].toUpperCase() : 'U'}
        </div>
        <div className="user-details">
          <h4 id="userName">{user?.email || 'User Account'}</h4>
          <p id="userStatus">Online</p>
        </div>
        <button 
          onClick={onLogout} 
          className="btn btn-sm btn-outline"
          style={{ marginLeft: 'auto', padding: '5px 10px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}
        >
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    </div>
  )
}

export default Sidebar

