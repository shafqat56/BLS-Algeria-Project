const express = require('express');
const { body, validationResult } = require('express-validator');
const { Monitor, Profile } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const MonitorService = require('../services/monitorService');
const logger = require('../utils/logger');

const router = express.Router();

// Get all monitors for user
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const monitors = await Monitor.findAll({
      where: {
        user_id: req.user.id
      },
      include: [{
        model: Profile,
        as: 'profile',
        attributes: ['id', 'profile_name', 'full_name']
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      monitors
    });
  } catch (error) {
    next(error);
  }
});

// Get single monitor
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const monitor = await Monitor.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      },
      include: [{
        model: Profile,
        as: 'profile'
      }]
    });

    if (!monitor) {
      return res.status(404).json({ 
        success: false, 
        error: 'Monitor not found' 
      });
    }

    res.json({
      success: true,
      monitor
    });
  } catch (error) {
    next(error);
  }
});

// Start monitoring
router.post('/start', authenticateToken, [
  body('profileId').notEmpty().isUUID(),
  body('blsCenter').isIn(['algiers_1', 'algiers_2', 'algiers_3', 'algiers_4', 'oran_1', 'oran_2', 'oran_3']),
  body('checkInterval').optional().isInt({ min: 3, max: 30 }),
  body('autofillMode').optional().isIn(['manual', 'semi', 'full'])
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { profileId, blsCenter, checkInterval = 5, autofillMode = 'manual' } = req.body;

    // Verify profile belongs to user
    const profile = await Profile.findOne({
      where: {
        id: profileId,
        user_id: req.user.id,
        is_active: true
      }
    });

    if (!profile) {
      return res.status(404).json({ 
        success: false, 
        error: 'Profile not found' 
      });
    }

    // Check if monitor already exists
    let monitor = await Monitor.findOne({
      where: {
        user_id: req.user.id,
        profile_id: profileId,
        bls_center: blsCenter,
        status: ['active', 'paused']
      }
    });

    if (monitor) {
      // Update existing monitor
      await monitor.update({
        check_interval: checkInterval,
        autofill_mode: autofillMode,
        status: 'active',
        next_check: new Date(Date.now() + checkInterval * 60 * 1000)
      });
    } else {
      // Create new monitor
      monitor = await Monitor.create({
        user_id: req.user.id,
        profile_id: profileId,
        bls_center: blsCenter,
        check_interval: checkInterval,
        autofill_mode: autofillMode,
        status: 'active',
        next_check: new Date(Date.now() + checkInterval * 60 * 1000)
      });
    }

    // Start monitoring service
    MonitorService.startMonitor(monitor.id, req.app.get('io'));

    logger.info(`Monitor started: ${monitor.id} for user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Monitoring started',
      monitor
    });
  } catch (error) {
    next(error);
  }
});

// Stop monitoring
router.post('/stop', authenticateToken, [
  body('id').notEmpty().isUUID()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.body;

    const monitor = await Monitor.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!monitor) {
      return res.status(404).json({ 
        success: false, 
        error: 'Monitor not found' 
      });
    }

    // Stop monitoring service
    MonitorService.stopMonitor(id);

    // Update monitor status
    await monitor.update({
      status: 'stopped'
    });

    logger.info(`Monitor stopped: ${id}`);

    res.json({
      success: true,
      message: 'Monitoring stopped'
    });
  } catch (error) {
    next(error);
  }
});

// Pause monitoring
router.post('/pause', authenticateToken, [
  body('id').notEmpty().isUUID()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.body;

    const monitor = await Monitor.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!monitor) {
      return res.status(404).json({ 
        success: false, 
        error: 'Monitor not found' 
      });
    }

    MonitorService.pauseMonitor(id);

    await monitor.update({
      status: 'paused'
    });

    res.json({
      success: true,
      message: 'Monitoring paused'
    });
  } catch (error) {
    next(error);
  }
});

// Resume monitoring
router.post('/resume', authenticateToken, [
  body('id').notEmpty().isUUID()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.body;

    const monitor = await Monitor.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!monitor) {
      return res.status(404).json({ 
        success: false, 
        error: 'Monitor not found' 
      });
    }

    MonitorService.resumeMonitor(id, req.app.get('io'));

    await monitor.update({
      status: 'active',
      next_check: new Date(Date.now() + monitor.check_interval * 60 * 1000)
    });

    res.json({
      success: true,
      message: 'Monitoring resumed'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


