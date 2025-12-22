import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { showLoading, hideLoading } from '../Common/LoadingOverlay'
import { showAlert } from '../../utils/alerts'
import axios from 'axios'

// Initialize Stripe - get key from environment
const getStripeKey = () => {
  // Check multiple possible env variable names
  return import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 
         import.meta.env.REACT_APP_STRIPE_PUBLISHABLE_KEY ||
         ''
}

const stripePromise = getStripeKey() ? loadStripe(getStripeKey()) : null

const PaymentForm = ({ onSuccess }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [amount, setAmount] = useState(9.99) // Default subscription amount

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setProcessing(true)
    showLoading('Processing payment...')

    try {
      const token = localStorage.getItem('authToken')
      
      // Create payment intent
      const intentResponse = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payments/create-intent`,
        { amount, currency: 'eur' },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!intentResponse.data.success) {
        throw new Error(intentResponse.data.error || 'Failed to create payment intent')
      }

      const { clientSecret, paymentIntentId } = intentResponse.data

      // Confirm payment with Stripe
      const cardElement = elements.getElement(CardElement)
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      if (paymentIntent.status === 'succeeded') {
        // Confirm payment on backend
        const confirmResponse = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payments/confirm`,
          { paymentIntentId },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (confirmResponse.data.success) {
          showAlert('Payment successful! Subscription activated.', 'success')
          if (onSuccess) onSuccess()
        } else {
          throw new Error(confirmResponse.data.error || 'Payment confirmation failed')
        }
      }
    } catch (error) {
      console.error('Payment error:', error)
      showAlert(error.response?.data?.error || error.message || 'Payment failed', 'error')
    } finally {
      setProcessing(false)
      hideLoading()
    }
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '500px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label className="form-label">
          <i className="fas fa-euro-sign"></i> Subscription Amount (EUR)
        </label>
        <input
          type="number"
          className="form-input"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          min="1"
          step="0.01"
          required
        />
        <small style={{ color: '#718096', display: 'block', marginTop: '5px' }}>
          Monthly subscription fee
        </small>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', background: '#f7fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>
          <i className="fas fa-credit-card"></i> Card Details
        </label>
        <CardElement options={cardElementOptions} />
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={!stripe || processing}
        style={{ width: '100%' }}
      >
        <i className="fas fa-lock"></i>
        {processing ? 'Processing...' : `Pay €${amount.toFixed(2)}`}
      </button>

      <p style={{ fontSize: '12px', color: '#718096', marginTop: '15px', textAlign: 'center' }}>
        <i className="fas fa-shield-alt"></i> Secure payment powered by Stripe
      </p>
    </form>
  )
}

const PaymentSettings = ({ user, onUpdate }) => {
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState('free')

  useEffect(() => {
    if (user) {
      setSubscriptionStatus(user.subscriptionStatus || 'free')
    }
  }, [user])

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false)
    setSubscriptionStatus('premium')
    if (onUpdate) onUpdate()
  }

  return (
    <div className="card" style={{ marginTop: '30px' }}>
      <div className="card-header">
        <div className="card-title">
          <div className="card-icon success">
            <i className="fas fa-credit-card"></i>
          </div>
          <span>Payment & Subscription</span>
        </div>
      </div>
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: '#718096', marginBottom: '15px' }}>
            <strong>Current Status:</strong>{' '}
            <span style={{
              padding: '5px 12px',
              borderRadius: '20px',
              background: subscriptionStatus === 'premium' ? '#c6f6d5' : '#fed7d7',
              color: subscriptionStatus === 'premium' ? '#22543d' : '#742a2a',
              fontWeight: '600',
              textTransform: 'uppercase',
              fontSize: '12px'
            }}>
              {subscriptionStatus}
            </span>
          </p>
          
          {subscriptionStatus === 'premium' && user?.subscriptionExpiry && (
            <p style={{ color: '#718096', fontSize: '14px' }}>
              Expires: {new Date(user.subscriptionExpiry).toLocaleDateString()}
            </p>
          )}
        </div>

        {!showPaymentForm && subscriptionStatus !== 'premium' && (
          <button
            className="btn btn-primary"
            onClick={() => setShowPaymentForm(true)}
          >
            <i className="fas fa-credit-card"></i>
            Subscribe Now
          </button>
        )}

        {showPaymentForm && (
          <div>
            {stripePromise ? (
              <Elements stripe={stripePromise}>
                <PaymentForm onSuccess={handlePaymentSuccess} />
              </Elements>
            ) : (
              <div className="alert alert-warning">
                <i className="fas fa-exclamation-triangle"></i>
                <span>Stripe publishable key not configured. Please set VITE_STRIPE_PUBLISHABLE_KEY in your environment.</span>
              </div>
            )}
            <button
              className="btn btn-outline"
              onClick={() => setShowPaymentForm(false)}
              style={{ marginTop: '15px', width: '100%' }}
            >
              Cancel
            </button>
          </div>
        )}

        {subscriptionStatus === 'premium' && (
          <div className="alert alert-success" style={{ marginTop: '20px' }}>
            <i className="fas fa-check-circle"></i>
            <span>You have an active premium subscription</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default PaymentSettings

