const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { sequelize } = require('./models');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Import routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profiles');
const monitorRoutes = require('./routes/monitor');
const settingsRoutes = require('./routes/settings');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import services
const MonitorService = require('./services/monitorService');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for frontend
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3001",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', authenticateToken, profileRoutes);
app.use('/api/monitor', authenticateToken, monitorRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);

// Socket.io connection handling
io.use((socket, next) => {
  // Authenticate socket connections
  const token = socket.handshake.auth.token;
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  } else {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id} (User: ${socket.userId})`);
  
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });

  // Join user-specific room for targeted notifications
  socket.on('join-user-room', () => {
    socket.join(`user-${socket.userId}`);
  });
});

// Make io available to routes
app.set('io', io);

// Serve static files (frontend) - React build in public folder (after API routes)
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for React Router (only in production)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
  });
}

// Error handling middleware
app.use(errorHandler);

// Database connection
sequelize.authenticate()
  .then(() => {
    logger.info('PostgreSQL connection established successfully');
    
    // Sync database models (set force: true only in development to reset tables)
    return sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
  })
  .then(() => {
    logger.info('Database models synchronized');
    
    // Initialize monitor service
    MonitorService.initialize(io);
    
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    logger.error('Database connection error:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    sequelize.close().then(() => {
      logger.info('PostgreSQL connection closed');
      process.exit(0);
    });
  });
});

module.exports = { app, io };

