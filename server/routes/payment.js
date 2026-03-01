const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_xfdz8hdehyaXJT',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_secret_here'
});

// Create Razorpay Order
router.post('/create-order', auth, async (req, res) => {
  try {
    const { amount, currency = 'INR', propertyId, bookingData } = req.body;
    
    const options = {
      amount: amount * 100, // Amount in paise
      currency,
      receipt: `booking_${Date.now()}`,
      notes: {
        propertyId,
        userId: req.user.id,
        startDate: bookingData.startDate,
        endDate: bookingData.endDate
      }
    };
    
    const order = await razorpay.orders.create(options);
    
    res.json({
      id: order.id,
      currency: order.currency,
      amount: order.amount,
      receipt: order.receipt
    });
    
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create payment order',
      message: error.message 
    });
  }
});

// Verify Razorpay Payment
router.post('/verify', auth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      propertyId,
      bookingData
    } = req.body;
    
    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'your_secret_here')
      .update(body.toString())
      .digest('hex');
    
    const isAuthentic = expectedSignature === razorpay_signature;
    
    if (isAuthentic) {
      // Payment is verified
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      
      res.json({
        success: true,
        message: 'Payment verified successfully',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: payment.amount / 100,
        status: payment.status
      });
      
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }
    
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Payment verification failed',
      message: error.message
    });
  }
});

// Get Payment Status
router.get('/status/:paymentId', auth, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await razorpay.payments.fetch(paymentId);
    
    res.json({
      id: payment.id,
      amount: payment.amount / 100,
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      created_at: payment.created_at
    });
    
  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({
      error: 'Failed to fetch payment status',
      message: error.message
    });
  }
});

// Refund Payment
router.post('/refund', auth, async (req, res) => {
  try {
    const { paymentId, amount, reason = 'Property unavailable' } = req.body;
    
    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount * 100,
      notes: {
        reason,
        refund_by: req.user.id
      }
    });
    
    res.json({
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
      message: 'Refund initiated successfully'
    });
    
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({
      success: false,
      error: 'Refund failed',
      message: error.message
    });
  }
});

module.exports = router;