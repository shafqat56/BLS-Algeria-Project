// Frontend API Helper Functions
// Add this to your index.html or create a separate JS file

// API Base URL
const API_BASE = 'http://localhost:3000/api';

// Get stored auth token
function getAuthToken() {
  return localStorage.getItem('authToken');
}

// Store auth token
function setAuthToken(token) {
  localStorage.setItem('authToken', token);
}

// Remove auth token (logout)
function removeAuthToken() {
  localStorage.removeItem('authToken');
}

// Make authenticated API request
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Authentication Functions
async function register(email, password) {
  return await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

async function login(email, password) {
  const result = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  if (result.success && result.token) {
    setAuthToken(result.token);
  }

  return result;
}

async function logout() {
  removeAuthToken();
  window.location.reload();
}

async function getCurrentUser() {
  return await apiRequest('/auth/me');
}

// Profile Functions
async function getProfiles() {
  return await apiRequest('/profiles');
}

async function getProfile(id) {
  return await apiRequest(`/profiles/${id}`);
}

async function createProfile(profileData) {
  return await apiRequest('/profiles', {
    method: 'POST',
    body: JSON.stringify(profileData)
  });
}

async function updateProfile(id, profileData) {
  return await apiRequest(`/profiles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(profileData)
  });
}

async function deleteProfile(id) {
  return await apiRequest(`/profiles/${id}`, {
    method: 'DELETE'
  });
}

// Monitor Functions
async function getMonitors() {
  return await apiRequest('/monitor');
}

async function getMonitor(id) {
  return await apiRequest(`/monitor/${id}`);
}

async function startMonitor(monitorData) {
  return await apiRequest('/monitor/start', {
    method: 'POST',
    body: JSON.stringify(monitorData)
  });
}

async function stopMonitor(monitorId) {
  return await apiRequest('/monitor/stop', {
    method: 'POST',
    body: JSON.stringify({ id: monitorId })
  });
}

async function pauseMonitor(monitorId) {
  return await apiRequest('/monitor/pause', {
    method: 'POST',
    body: JSON.stringify({ id: monitorId })
  });
}

async function resumeMonitor(monitorId) {
  return await apiRequest('/monitor/resume', {
    method: 'POST',
    body: JSON.stringify({ id: monitorId })
  });
}

// Settings Functions
async function getSettings() {
  return await apiRequest('/settings');
}

async function updateSettings(settingsData) {
  return await apiRequest('/settings', {
    method: 'PUT',
    body: JSON.stringify(settingsData)
  });
}

// Notification Functions
async function testNotification(type, recipient) {
  return await apiRequest('/notifications/test', {
    method: 'POST',
    body: JSON.stringify({ type, recipient })
  });
}

// Handle Login Function (for use in HTML)
async function handleLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    alert('Please enter both email and password');
    return;
  }

  try {
    const result = await login(email, password);
    
    if (result.success) {
      // Hide login modal
      hideModal('loginModal');
      
      // Show success message
      showAlert('Login successful!', 'success');
      
      // Update UI
      if (result.user) {
        updateUserDisplay(result.user);
      }
      
      // Load user data
      loadUserData();
      
      // Connect to Socket.io with token
      if (window.socket) {
        window.socket.disconnect();
      }
      connectSocket();
    } else {
      alert(result.error || 'Login failed');
    }
  } catch (error) {
    alert('Login error: ' + error.message);
  }
}

// Handle Registration Function
async function handleRegister() {
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;

  if (!email || !password) {
    alert('Please enter both email and password');
    return;
  }

  if (password !== confirmPassword) {
    alert('Passwords do not match');
    return;
  }

  if (password.length < 8) {
    alert('Password must be at least 8 characters');
    return;
  }

  try {
    const result = await register(email, password);
    
    if (result.success) {
      alert('Registration successful! Please login.');
      hideModal('registerModal');
      showModal('loginModal');
    } else {
      alert(result.error || 'Registration failed');
    }
  } catch (error) {
    alert('Registration error: ' + error.message);
  }
}

// Helper Functions
function showAlert(message, type = 'info') {
  // Create alert element
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;
  
  const container = document.getElementById('alertsContainer');
  if (container) {
    container.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      alert.remove();
    }, 5000);
  }
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

function updateUserDisplay(user) {
  const userName = document.getElementById('userName');
  const userAvatar = document.getElementById('userAvatar');
  
  if (userName) {
    userName.textContent = user.email || 'User';
  }
  
  if (userAvatar) {
    const initial = (user.email || 'U')[0].toUpperCase();
    userAvatar.textContent = initial;
  }
}

async function loadUserData() {
  try {
    const userResult = await getCurrentUser();
    if (userResult.success) {
      updateUserDisplay(userResult.user);
    }

    const profilesResult = await getProfiles();
    if (profilesResult.success) {
      // Update profiles display
      console.log('Profiles loaded:', profilesResult.profiles);
    }

    const monitorsResult = await getMonitors();
    if (monitorsResult.success) {
      // Update monitors display
      console.log('Monitors loaded:', monitorsResult.monitors);
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

// Socket.io Connection with Authentication
function connectSocket() {
  const token = getAuthToken();
  
  if (!token) {
    console.warn('No auth token, cannot connect to Socket.io');
    return;
  }

  if (window.socket) {
    window.socket.disconnect();
  }

  window.socket = io('http://localhost:3000', {
    auth: {
      token: token
    }
  });

  window.socket.on('connect', () => {
    console.log('Socket.io connected');
    window.socket.emit('join-user-room');
  });

  window.socket.on('disconnect', () => {
    console.log('Socket.io disconnected');
  });

  window.socket.on('statusUpdate', (data) => {
    console.log('Status update:', data);
    // Update UI with status
  });

  window.socket.on('slotAvailable', (data) => {
    console.log('Slot available!', data);
    showAlert('Appointment slot found!', 'success');
    // Update UI with slot information
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already logged in
  const token = getAuthToken();
  if (token) {
    // User is logged in, load data
    loadUserData();
    connectSocket();
  } else {
    // Show login modal
    showModal('loginModal');
  }
});

