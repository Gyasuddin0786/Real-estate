const express = require('express');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendBookingConfirmationEmail } = require('../utils/emailService');

const router = express.Router();

// Create booking
router.post('/', auth, async (req, res) => {
  try {
    // console.log('Booking request body:', req.body); // Debug log
    
    const { 
      propertyId, 
      startDate, 
      endDate, 
      message, 
      totalAmount, 
      paidAmount, 
      remainingAmount, 
      paymentStatus, 
      paymentId, 
      orderId 
    } = req.body;
    
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Ensure payment fields are properly handled
    const finalTotalAmount = totalAmount || property.price;
    const finalPaidAmount = paidAmount || 0;
    const finalRemainingAmount = remainingAmount !== undefined ? remainingAmount : (finalTotalAmount - finalPaidAmount);
    const finalPaymentStatus = paymentStatus || 'pending';
    
    const bookingData = {
      property: propertyId,
      tenant: req.user._id,
      owner: property.owner,
      startDate,
      endDate,
      totalAmount: finalTotalAmount,
      paidAmount: finalPaidAmount,
      remainingAmount: finalRemainingAmount,
      paymentStatus: finalPaymentStatus,
      message: message || ''
    };
    
    // Add payment IDs if they exist
    if (paymentId) bookingData.paymentId = paymentId;
    if (orderId) bookingData.orderId = orderId;
    
    // console.log('Final booking data to save:', bookingData);
    
    // console.log('Creating booking with data:', bookingData); // Debug log
    
    const booking = new Booking(bookingData);
    const savedBooking = await booking.save();
    
    // console.log('Saved booking:', savedBooking.toObject()); // Debug log
    // console.log('Payment status in saved booking:', savedBooking.paymentStatus);
    // console.log('Paid amount in saved booking:', savedBooking.paidAmount);
    
    // Send booking confirmation email
    const user = await User.findById(req.user._id);
    if (user && user.email) {
      const bookingDetails = {
        bookingId: savedBooking._id,
        propertyTitle: property.title,
        propertyAddress: `${property.location.address}, ${property.location.city}`,
        checkInDate: savedBooking.startDate,
        checkOutDate: savedBooking.endDate,
        totalAmount: savedBooking.totalAmount
      };
      
      sendBookingConfirmationEmail(user.email, user.name, bookingDetails).catch(err => 
        console.error('Failed to send booking confirmation email:', err)
      );
    }
    
    res.status(201).json(savedBooking);
  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all bookings (role-based)
router.get('/', auth, async (req, res) => {
  try {
    let bookings;
    if (req.user.role === 'owner') {
      bookings = await Booking.find({ owner: req.user._id })
        .populate('property', 'title images location price propertyType bedrooms bathrooms area')
        .populate('tenant', 'name email phone address')
        .sort({ createdAt: -1 });
    } else {
      bookings = await Booking.find({ tenant: req.user._id })
        .populate('property', 'title images location price propertyType bedrooms bathrooms area')
        .populate('owner', 'name email phone address')
        .sort({ createdAt: -1 });
    }
    
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user bookings
router.get('/my-bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ tenant: req.user._id })
      .populate('property', 'title images location price propertyType bedrooms bathrooms area')
      .populate('owner', 'name email phone address')
      .sort({ createdAt: -1 });
    
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get owner bookings
router.get('/owner-bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ owner: req.user._id })
      .populate('property', 'title images location price propertyType bedrooms bathrooms area')
      .populate('tenant', 'name email phone address')
      .sort({ createdAt: -1 });
    
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cancel booking (for users)
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    const isTenant = booking.tenant.toString() === req.user._id.toString();
    
    if (!isTenant) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    booking.status = 'cancelled';
    booking.cancellationDate = new Date();
    booking.updatedAt = new Date();
    await booking.save();
    
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update booking status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Allow owner to update any status, tenant can only cancel
    const isOwner = booking.owner.toString() === req.user._id.toString();
    const isTenant = booking.tenant.toString() === req.user._id.toString();
    
    if (!isOwner && !isTenant) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    if (isTenant && status !== 'cancelled') {
      return res.status(403).json({ message: 'Tenants can only cancel bookings' });
    }

    booking.status = status;
    booking.updatedAt = new Date();
    await booking.save();
    
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Initiate refund
router.put('/:id/refund/initiate', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    const isOwner = booking.owner.toString() === req.user._id.toString();
    
    if (!isOwner) {
      return res.status(403).json({ message: 'Only property owner can initiate refund' });
    }

    if (booking.status !== 'cancelled') {
      return res.status(400).json({ message: 'Can only refund cancelled bookings' });
    }

    if (booking.paidAmount <= 0) {
      return res.status(400).json({ message: 'No payment to refund' });
    }

    booking.refundStatus = 'processing';
    booking.refundAmount = booking.paidAmount;
    booking.refundInitiatedAt = new Date();
    booking.expectedRefundDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
    booking.updatedAt = new Date();
    
    await booking.save();
    
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Complete refund
router.put('/:id/refund/complete', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    const isOwner = booking.owner.toString() === req.user._id.toString();
    
    if (!isOwner) {
      return res.status(403).json({ message: 'Only property owner can complete refund' });
    }

    if (booking.refundStatus !== 'processing') {
      return res.status(400).json({ message: 'Refund is not in processing state' });
    }

    booking.refundStatus = 'completed';
    booking.refundCompletedAt = new Date();
    booking.paymentStatus = 'refunded';
    booking.updatedAt = new Date();
    
    await booking.save();
    
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;