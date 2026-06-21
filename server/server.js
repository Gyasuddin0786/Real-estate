const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const bookingRoutes = require('./routes/bookings');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const botRoutes = require('./routes/bot');
const paymentRoutes = require('./routes/payment');
const statsRoutes = require('./routes/stats');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/property-rental')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('Server  is running... 🚀');
});
const PORT = process.env.PORT || 5000;
const http = require('http').createServer(app);
const { Server } = require('socket.io');

const io = new Server(http, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Attach io instance to app so routes can emit events
app.set('io', io);

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  // client should emit 'user:join' with their userId after connecting
  socket.on('user:join', (userId) => {
    if (!userId) return;
    // console.log('User joining room user_' + userId, 'socket:', socket.id);
    socket.join(`user_${userId}`);
  });

  socket.on('typing', ({ toUserId, fromUserId, typing }) => {
    if (toUserId) {
      io.to(`user_${toUserId}`).emit('typing', { fromUserId, typing });
    }
  });

  socket.on('disconnect', () => {
    // cleanup handled by socket.io automatically
  });
});

http.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});