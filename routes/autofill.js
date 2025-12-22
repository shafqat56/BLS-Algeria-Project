const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { Profile, Monitor } = require('../models');
const AutofillService = require('../services/autofillService');
const logger = require('../utils/logger');

const router = express.Router();

// Quick booking with autofill
router.post('/quick-book', authenticateToken, [
  body('profileId').notEmpty().isUUID(),
  body('slotId').optional().isUUID(),
  body('mode').optional().isIn(['semi', 'full'])
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { profileId, slotId, mode = 'semi' } = req.body;

    // Get profile
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

    // Get slot if provided
    let slot = null;
    if (slotId) {
      const { Slot } = require('../models');
      slot = await Slot.findOne({
        where: {
          id: slotId,
          status: 'available'
        },
        include: [{
          model: Monitor,
          as: 'monitor',
          where: { user_id: req.user.id }
        }]
      });

      if (!slot) {
        return res.status(404).json({
          success: false,
          error: 'Slot not found or no longer available'
        });
      }

      slot = {
        date: slot.slot_date,
        time: slot.slot_time,
        center: slot.center
      };
    }

    logger.info(`Quick booking initiated for profile ${profileId} in ${mode} mode`);

    // Start autofill
    const result = await AutofillService.fillForm(profile, slot, mode);

    res.json({
      success: result.success,
      message: result.message,
      url: result.url,
      mode: result.mode,
      error: result.error
    });
  } catch (error) {
    logger.error('Quick booking error:', error);
    next(error);
  }
});

// Get autofill data for a profile (for manual form filling)
router.get('/profile/:profileId/data', authenticateToken, async (req, res, next) => {
  try {
    const { profileId } = req.params;

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

    // Return profile data in format suitable for form filling
    res.json({
      success: true,
      data: {
        fullName: profile.full_name,
        passportNumber: profile.passport_number,
        email: profile.email,
        phone: profile.phone,
        dateOfBirth: profile.date_of_birth,
        nationality: profile.nationality,
        visaCategory: profile.visa_category,
        appointmentType: profile.appointment_type,
        blsCenter: profile.bls_center
      }
    });
  } catch (error) {
    logger.error('Get autofill data error:', error);
    next(error);
  }
});

module.exports = router;

