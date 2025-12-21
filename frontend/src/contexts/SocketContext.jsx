import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext()

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (!token) return

    // In development, use direct backend URL (CORS allows it)
    // In production, use same origin (if served from same server)
    const socketUrl = import.meta.env.DEV 
      ? 'http://localhost:3000'
      : (import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin)
    
    const newSocket = io(socketUrl, {
      auth: { token },
    })

    newSocket.on('connect', () => {
      console.log('Socket connected')
      newSocket.emit('join-user-room')
    })

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
}

