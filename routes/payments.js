const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Create payment intent
router.post('/create-intent', authenticateToken, async (req, res, next) => {
  try {
    const { amount, currency = 'eur' } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Minimum is 1.00 EUR'
      });
    }

    const user = await User.findByPk(req.user.id);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        userId: user.id,
        email: user.email
      },
      automatic_payment_methods: {
        enabled: true
      }
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    logger.error('Stripe error:', error);
    next(error);
  }
});

// Confirm payment and upgrade subscription
router.post('/confirm', authenticateToken, async (req, res, next) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment intent ID required'
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        error: 'Payment not completed'
      });
    }

    // Verify payment belongs to user
    if (paymentIntent.metadata.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized payment'
      });
    }

    // Update user subscription
    const user = await User.findByPk(req.user.id);
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1); // 1 month subscription

    await user.update({
      subscription_status: 'premium',
      subscription_expiry: expiryDate,
      payment_method: 'credit_card'
    });

    logger.info(`Subscription upgraded for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Subscription activated successfully',
      subscriptionExpiry: expiryDate
    });
  } catch (error) {
    logger.error('Payment confirmation error:', error);
    next(error);
  }
});

// Get payment methods
router.get('/methods', authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['payment_method']
    });

    res.json({
      success: true,
      paymentMethod: user.payment_method || 'none'
    });
  } catch (error) {
    next(error);
  }
});

// Webhook for Stripe events (should be in separate endpoint without auth)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      logger.info('Payment succeeded:', paymentIntent.id);
      // Handle payment success if needed
      break;
    default:
      logger.info(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router;


