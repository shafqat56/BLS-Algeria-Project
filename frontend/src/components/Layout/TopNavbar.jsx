import '../Layout/TopNavbar.css'

const TopNavbar = ({ activeSection, onSectionChange, user, onLogout }) => {
  const navItems = [
    { id: 'dashboard', icon: 'fas fa-home', label: 'Dashboard' },
    { id: 'profiles', icon: 'fas fa-user-circle', label: 'Profiles' },
    { id: 'monitoring', icon: 'fas fa-search', label: 'Monitoring' },
    { id: 'settings', icon: 'fas fa-cog', label: 'Settings' },
  ]

  return (
    <nav className="top-navbar">
      <div className="navbar-brand">
        <i className="fas fa-robot"></i>
        <span>BLS Bot Pro</span>
      </div>
      
      <div className="navbar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => onSectionChange(item.id)}
          >
            <i className={item.icon}></i>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="navbar-user">
        <div className="user-info-top">
          <div className="user-avatar-small">
            {user?.email ? user.email[0].toUpperCase() : 'U'}
          </div>
          <span className="user-name">{user?.email || 'User'}</span>
        </div>
        <button onClick={onLogout} className="btn-logout">
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    </nav>
  )
}

export default TopNavbar

