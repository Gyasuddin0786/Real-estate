const express = require('express');
const Property = require('../models/Property');
const auth = require('../middleware/auth');
const multer = require('multer');

const router = express.Router();

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Get all properties
router.get('/', async (req, res) => {
  try {
    const { city, propertyType, minPrice, maxPrice, bedrooms, page = 1, limit = 12 } = req.query;
    const limitNum = parseInt(limit);
    const skip = (page - 1) * limitNum;

    let query = { available: true };
    
    if (city) query['location.city'] = new RegExp(city, 'i');
    if (propertyType) query.propertyType = propertyType;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (bedrooms) query.bedrooms = Number(bedrooms);

    const properties = await Property.find(query)
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Property.countDocuments(query);

    // console.log(`Found ${properties.length} properties`);
    res.json({ properties, total, pages: Math.ceil(total / limitNum) });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get featured properties
router.get('/featured', async (req, res) => {
  try {
    let properties = await Property.find({ featured: true, available: true })
      .populate('owner', 'name email')
      .limit(6);
    
    // If no featured properties, get latest 6 properties
    if (properties.length === 0) {
      properties = await Property.find({ available: true })
        .populate('owner', 'name email')
        .sort({ createdAt: -1 })
        .limit(6);
    }
    
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Test route working' });
});

// Get owner properties
router.get('/owner', async (req, res) => {
  try {
    // console.log('=== OWNER PROPERTIES REQUEST (NO AUTH) ===');
    // console.log('Headers:', req.headers.authorization);
    
    // Get token manually
    const token = req.header('Authorization')?.replace('Bearer ', '');
    // console.log('Token:', token ? 'Present' : 'Missing');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    // Verify token manually
    const jwt = require('jsonwebtoken');
    const User = require('../models/User');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log('Decoded token:', decoded);
    
    const user = await User.findById(decoded.userId).select('-password');
    // console.log('User found:', user ? user.name : 'Not found');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    const properties = await Property.find({ owner: user._id })
      .sort({ createdAt: -1 });
    
    // console.log('Found properties for owner:', properties.length);
    res.json(properties);
  } catch (error) {
    console.error('=== ERROR IN OWNER PROPERTIES ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// Get single property
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('owner', 'name email phone')
      .populate('reviews.user', 'name');
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    res.json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create property (owner only)
router.post('/', auth, upload.array('images', 10), async (req, res) => {
  try {
    const propertyData = { ...req.body, owner: req.user._id };
    
    // Parse amenities if it's a string
    if (typeof propertyData.amenities === 'string') {
      propertyData.amenities = JSON.parse(propertyData.amenities);
    }
    
    // Handle location data
    if (req.body['location[address]']) {
      propertyData.location = {
        address: req.body['location[address]'],
        city: req.body['location[city]'],
        state: req.body['location[state]'],
        zipCode: req.body['location[zipCode]']
      };
    }
    
    // Handle images from file uploads
    let images = [];
    if (req.files) {
      images = req.files.map(file => `/uploads/${file.filename}`);
    }
    
    // Handle image URLs
    if (req.body.imageUrls) {
      const imageUrls = JSON.parse(req.body.imageUrls);
      images = [...images, ...imageUrls];
    }
    
    if (images.length > 0) {
      propertyData.images = images;
    }

    const property = new Property(propertyData);
    await property.save();
    
    console.log('Property saved:', property.title);
    res.status(201).json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update property
router.put('/:id', auth, upload.array('images', 10), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    if (property.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const propertyData = { ...req.body };
    
    // Parse amenities if it's a string
    if (typeof propertyData.amenities === 'string') {
      propertyData.amenities = JSON.parse(propertyData.amenities);
    }
    
    // Handle location data
    if (req.body['location[address]']) {
      propertyData.location = {
        address: req.body['location[address]'],
        city: req.body['location[city]'],
        state: req.body['location[state]'],
        zipCode: req.body['location[zipCode]']
      };
    }
    
    // Handle images: start fresh from what frontend sends (existingImages + new imageUrls)
    let images = [];
    if (req.body.imageUrls) {
      images = JSON.parse(req.body.imageUrls); // already contains kept existing images
    }
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/${file.filename}`);
      images = [...images, ...newImages];
    }
    propertyData.images = images;

    const updatedProperty = await Property.findByIdAndUpdate(
      req.params.id,
      propertyData,
      { new: true }
    );
    
    res.json(updatedProperty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete property
router.delete('/:id', auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    if (property.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Property.findByIdAndDelete(req.params.id);
    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add review
router.post('/:id/reviews', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const review = {
      user: req.user._id,
      rating: Number(rating),
      comment
    };

    property.reviews.push(review);
    property.rating = property.reviews.reduce((acc, item) => item.rating + acc, 0) / property.reviews.length;
    
    await property.save();
    res.status(201).json({ message: 'Review added' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;