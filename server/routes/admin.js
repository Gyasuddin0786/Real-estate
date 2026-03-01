const express = require('express');
const User = require('../models/User');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');

const router = express.Router();

// Admin middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

// Get admin dashboard stats
router.get('/dashboard-stats', auth, adminOnly, async (req, res) => {
  try {
    const [
      totalUsers,
      totalOwners,
      totalProperties,
      totalBookings,
      activeBookings,
      pendingApprovals,
      totalRevenue,
      monthlyRevenue
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'owner' }),
      Property.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'confirmed' }),
      User.countDocuments({ role: 'user', isActive: false }), // Assuming pending users are inactive
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$paidAmount' } } }
      ]),
      Booking.aggregate([
        {
          $match: {
            status: 'confirmed',
            createdAt: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        },
        { $group: { _id: null, total: { $sum: '$paidAmount' } } }
      ])
    ]);

    // Calculate growth percentages (mock data for now)
    const stats = {
      totalRevenue: totalRevenue[0]?.total || 0,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      totalUsers,
      totalOwners,
      totalProperties,
      totalBookings,
      activeBookings,
      pendingApprovals,
      growth: {
        revenue: 12, // Mock percentage
        users: 8,
        properties: 15,
        bookings: 5
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
});

// Get recent activities
router.get('/recent-activities', auth, adminOnly, async (req, res) => {
  try {
    const [recentUsers, recentProperties, recentBookings] = await Promise.all([
      User.find().sort({ createdAt: -1 }).limit(5).select('name email role createdAt'),
      Property.find().populate('owner', 'name').sort({ createdAt: -1 }).limit(5),
      Booking.find().populate('property', 'title').populate('tenant', 'name').sort({ createdAt: -1 }).limit(5)
    ]);

    res.json({
      recentUsers,
      recentProperties,
      recentBookings
    });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({ message: 'Error fetching recent activities' });
  }
});

// Get owner performance data
router.get('/owner-performance', auth, adminOnly, async (req, res) => {
  try {
    const ownerStats = await User.aggregate([
      { $match: { role: 'owner' } },
      {
        $lookup: {
          from: 'properties',
          localField: '_id',
          foreignField: 'owner',
          as: 'properties'
        }
      },
      {
        $lookup: {
          from: 'bookings',
          localField: 'properties._id',
          foreignField: 'property',
          as: 'bookings'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          propertyCount: { $size: '$properties' },
          totalBookings: { $size: '$bookings' },
          totalRevenue: {
            $sum: {
              $map: {
                input: '$bookings',
                as: 'booking',
                in: { $ifNull: ['$$booking.paidAmount', 0] }
              }
            }
          },
          isActive: 1,
          createdAt: 1
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    res.json(ownerStats);
  } catch (error) {
    console.error('Error fetching owner performance:', error);
    res.status(500).json({ message: 'Error fetching owner performance' });
  }
});

module.exports = router;