// Alert utility functions
let alertListeners = []

export const showAlert = (message, type = 'info') => {
  const id = Date.now()
  alertListeners.forEach(listener => listener({ id, message, type }))
  setTimeout(() => {
    alertListeners.forEach(listener => listener({ id, remove: true }))
  }, 5000)
}

export const addAlertListener = (listener) => {
  alertListeners.push(listener)
  return () => {
    alertListeners = alertListeners.filter(l => l !== listener)
  }
}

