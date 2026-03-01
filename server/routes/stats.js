const express = require('express');
const Property = require('../models/Property');
const User = require('../models/User');
const Booking = require('../models/Booking');

const router = express.Router();

// Get website statistics
router.get('/', async (req, res) => {
  try {
    const [propertiesCount, usersCount, bookingsCount, citiesCount] = await Promise.all([
      Property.countDocuments(),
      User.countDocuments(),
      Booking.countDocuments({ status: 'confirmed' }),
      Property.distinct('location.city').then(cities => cities.filter(city => city).length)
    ]);

    res.json({
      properties: propertiesCount,
      users: usersCount,
      bookings: bookingsCount,
      cities: citiesCount
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

module.exports = router;