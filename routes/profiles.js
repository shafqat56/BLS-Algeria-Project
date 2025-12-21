const express = require('express');
const { body, validationResult } = require('express-validator');
const { Profile } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all profiles for user
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const profiles = await Profile.findAll({
      where: {
        user_id: req.user.id,
        is_active: true
      },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      profiles
    });
  } catch (error) {
    next(error);
  }
});

// Get single profile
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const profile = await Profile.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!profile) {
      return res.status(404).json({ 
        success: false, 
        error: 'Profile not found' 
      });
    }

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    next(error);
  }
});

// Create profile
router.post('/', authenticateToken, [
  body('fullName').notEmpty().trim(),
  body('passportNumber').notEmpty().trim(),
  body('dateOfBirth').isISO8601(),
  body('nationality').notEmpty().trim(),
  body('phone').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('visaCategory').isIn(['tourist', 'student', 'work', 'business', 'transit', 'family', 'medical', 'cultural', 'sports', 'official', 'diplomatic']),
  body('blsCenter').isIn(['algiers_1', 'algiers_2', 'algiers_3', 'algiers_4', 'oran_1', 'oran_2', 'oran_3']),
  body('appointmentType').notEmpty().trim(),
  body('profileName').optional().trim()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const profileData = {
      user_id: req.user.id,
      full_name: req.body.fullName,
      passport_number: req.body.passportNumber,
      date_of_birth: req.body.dateOfBirth,
      nationality: req.body.nationality,
      phone: req.body.phone,
      email: req.body.email,
      visa_category: req.body.visaCategory,
      bls_center: req.body.blsCenter,
      appointment_type: req.body.appointmentType,
      profile_name: req.body.profileName || 'Default Profile'
    };

    const profile = await Profile.create(profileData);

    logger.info(`Profile created: ${profile.id} for user ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      profile
    });
  } catch (error) {
    next(error);
  }
});

// Update profile
router.put('/:id', authenticateToken, [
  body('fullName').optional().notEmpty().trim(),
  body('passportNumber').optional().notEmpty().trim(),
  body('dateOfBirth').optional().isISO8601(),
  body('nationality').optional().notEmpty().trim(),
  body('phone').optional().notEmpty().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('visaCategory').optional().isIn(['tourist', 'student', 'work', 'business', 'transit', 'family', 'medical', 'cultural', 'sports', 'official', 'diplomatic']),
  body('blsCenter').optional().isIn(['algiers_1', 'algiers_2', 'algiers_3', 'algiers_4', 'oran_1', 'oran_2', 'oran_3']),
  body('appointmentType').optional().notEmpty().trim(),
  body('profileName').optional().trim()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const profile = await Profile.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!profile) {
      return res.status(404).json({ 
        success: false, 
        error: 'Profile not found' 
      });
    }

    // Update only provided fields
    const updateData = {};
    if (req.body.fullName) updateData.full_name = req.body.fullName;
    if (req.body.passportNumber) updateData.passport_number = req.body.passportNumber;
    if (req.body.dateOfBirth) updateData.date_of_birth = req.body.dateOfBirth;
    if (req.body.nationality) updateData.nationality = req.body.nationality;
    if (req.body.phone) updateData.phone = req.body.phone;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.visaCategory) updateData.visa_category = req.body.visaCategory;
    if (req.body.blsCenter) updateData.bls_center = req.body.blsCenter;
    if (req.body.appointmentType) updateData.appointment_type = req.body.appointmentType;
    if (req.body.profileName) updateData.profile_name = req.body.profileName;

    await profile.update(updateData);

    logger.info(`Profile updated: ${profile.id}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile
    });
  } catch (error) {
    next(error);
  }
});

// Delete profile (soft delete)
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const profile = await Profile.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!profile) {
      return res.status(404).json({ 
        success: false, 
        error: 'Profile not found' 
      });
    }

    await profile.update({ is_active: false });

    logger.info(`Profile deleted: ${profile.id}`);

    res.json({
      success: true,
      message: 'Profile deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


