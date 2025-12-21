const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch user to ensure they still exist and are active
    const user = await User.findByPk(decoded.userId);
    
    if (!user || !user.is_active) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or inactive user' 
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      subscriptionStatus: user.subscription_status
    };
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        success: false, 
        error: 'Token expired' 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      error: 'Authentication failed' 
    });
  }
};

const requirePremium = (req, res, next) => {
  if (req.user.subscriptionStatus !== 'premium') {
    return res.status(403).json({ 
      success: false, 
      error: 'Premium subscription required' 
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requirePremium
};


