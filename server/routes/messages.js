const express = require('express');
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/messages/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Get messages for current user
router.get('/', auth, async (req, res) => {
  try {
    let messages;

    if (req.user.role === 'admin') {
      // Admin sees all messages
      messages = await Message.find({})
        .populate('sender', 'name email role')
        .populate('recipient', 'name email role')
        .sort({ createdAt: 1 });
    } else {
      // Users should only see messages they are involved in:
      // - messages they sent
      // - messages addressed to them
      // - messages tied to bookings where they are the tenant or owner
      const Booking = require('../models/Booking');
      const userBookings = await Booking.find({
        $or: [ { tenant: req.user._id }, { owner: req.user._id } ]
      }).select('_id');
      const bookingIds = userBookings.map(b => b._id);

      messages = await Message.find({
        $or: [
          { sender: req.user._id },
          { recipient: req.user._id },
          { bookingId: { $in: bookingIds } }
        ]
      })
      .populate('sender', 'name email role')
      .populate('recipient', 'name email role')
      .sort({ createdAt: 1 });
    }
    
    res.json(messages || []);
  } catch (error) {
    console.error('Message fetch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send message with file upload
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    const { content, replyTo, bookingId } = req.body;
    
    if (!content?.trim() && !req.file) {
      return res.status(400).json({ message: 'Content or file is required' });
    }

    let recipient = null;
    let finalBookingId = bookingId; // Start with provided bookingId
    console.log('POST /messages - sender:', req.user._id?.toString(), 'role:', req.user.role, 'bookingId:', bookingId, 'replyTo:', replyTo);

    // If replying, inherit bookingId from original message if not provided
    if (replyTo && !bookingId) {
      try {
        const original = await Message.findById(replyTo).select('bookingId');
        if (original?.bookingId) {
          finalBookingId = original.bookingId;
          console.log('  -> Inherited bookingId from original message:', finalBookingId?.toString());
        }
      } catch (e) {
        console.log('  -> Could not find original message for bookingId inheritance');
      }
    }

    // If a recipient is explicitly provided (owner <-> tenant messaging), use it
    if (req.body.recipient) {
      recipient = req.body.recipient;
      console.log('  -> Using explicit recipient:', recipient?.toString());
    } else if (finalBookingId) {
      // If bookingId provided, direct message to the other party (owner <-> tenant)
      const Booking = require('../models/Booking');
      const booking = await Booking.findById(finalBookingId);
      if (booking) {
        // If sender is tenant, recipient is owner. If sender is owner, recipient is tenant.
        if (booking.tenant.toString() === req.user._id.toString()) {
          recipient = booking.owner;
          console.log('  -> Sender is tenant, recipient is owner:', recipient?.toString());
        } else if (booking.owner.toString() === req.user._id.toString()) {
          recipient = booking.tenant;
          console.log('  -> Sender is owner, recipient is tenant:', recipient?.toString());
        }
      }
    } else {
      // If admin is replying to a specific message, route back to original sender
      if (req.user.role === 'admin' && replyTo) {
        try {
          const original = await Message.findById(replyTo).select('sender');
          if (original && original.sender) {
            recipient = original.sender;
            console.log('  -> Admin replying to message, recipient (original sender):', recipient?.toString());
          }
        } catch (e) {
          console.log('  -> Error looking up original message:', e.message);
          // ignore lookup errors and fall through to broadcast
        }
      }

      // Fallback: Simple messaging - users send to admin, admin sends to all
      if (!recipient) {
        if (req.user.role === 'admin') {
          recipient = null; // Broadcast message
          console.log('  -> Admin broadcasting to all');
        } else {
          const User = require('../models/User');
          const admin = await User.findOne({ role: 'admin' });
          recipient = admin ? admin._id : null;
          console.log('  -> Regular user sending to admin:', recipient?.toString());
        }
      }
    }

    const messageData = {
      sender: req.user._id,
      recipient,
      content: content?.trim() || '',
      replyTo: replyTo || null,
      bookingId: finalBookingId || null
    };

    if (req.file) {
      messageData.fileUrl = `/uploads/messages/${req.file.filename}`;
      messageData.fileName = req.file.originalname;
    }

    const message = new Message(messageData);
    console.log('[MSG-SAVE]', {
      sender: req.user.name || req.user._id?.toString(),
      senderRole: req.user.role,
      senderId: req.user._id?.toString(),
      recipient: recipient?.toString() || null,
      bookingId: finalBookingId?.toString() || null,
      replyTo,
      hasFile: !!req.file
    });
    const savedMessage = await message.save();
    const populatedMessage = await Message.findById(savedMessage._id)
      .populate('sender', 'name email role')
      .populate('recipient', 'name email role');

    // Emit real-time event via Socket.IO
    try {
      const io = req.app.get('io');
      if (io) {
        // If recipient is null => broadcast to a public room
        if (!recipient) {
          console.log('Emitting broadcast message:new');
          io.emit('message:new', populatedMessage);
        } else {
          const rid = recipient.toString();
          const sid = req.user._id.toString();
          console.log('[EMIT-RECIPIENT]', `user_${rid}`);
          console.log('[EMIT-SENDER]', `user_${sid}`);
          io.to(`user_${rid}`).emit('message:new', populatedMessage);
          io.to(`user_${sid}`).emit('message:new', populatedMessage);
        }
      }
    } catch (e) {
      console.error('Socket emit error:', e.message);
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Message send error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});



// Get messages for specific booking
router.get('/booking/:bookingId', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const Booking = require('../models/Booking');
    const booking = await Booking.findById(bookingId);
    
    // Only tenant or owner of the booking can access these messages
    if (!booking || (booking.tenant.toString() !== req.user._id.toString() && booking.owner.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const messages = await Message.find({ bookingId })
      .populate('sender', 'name email role')
      .populate('recipient', 'name email role')
      .sort({ createdAt: 1 });
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark messages as read
router.put('/mark-read', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    await Message.updateMany(
      {
        recipient: userId,
        isRead: false
      },
      { isRead: true }
    );
    // Emit read receipt to user rooms so senders can update
    try {
      const io = req.app.get('io');
      if (io) {
        try {
          const uid = req.user._id.toString();
          io.to(`user_${uid}`).emit('messages:read', { userId: uid });
        } catch (e) {
          console.error('Socket emit (read) failed', e.message);
        }
      }
    } catch (e) {
      console.error('Socket read emit error:', e.message);
    }

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark-read error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Typing status storage
let typingUsers = [];

// Send typing status
router.post('/typing', auth, (req, res) => {
  try {
    const { typing, userId } = req.body;
    const existingIndex = typingUsers.findIndex(u => u.userId === userId);
    
    if (typing) {
      const typingData = {
        userId,
        userName: req.user.name,
        typing: true,
        timestamp: Date.now()
      };
      
      if (existingIndex >= 0) {
        typingUsers[existingIndex] = typingData;
      } else {
        typingUsers.push(typingData);
      }
    } else {
      if (existingIndex >= 0) {
        typingUsers.splice(existingIndex, 1);
      }
    }
    
    // Clean old typing statuses (older than 5 seconds)
    typingUsers = typingUsers.filter(u => Date.now() - u.timestamp < 5000);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get typing status
router.get('/typing-status', auth, (req, res) => {
  try {
    // Clean old typing statuses
    typingUsers = typingUsers.filter(u => Date.now() - u.timestamp < 5000);
    res.json(typingUsers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Debug: Get last 5 messages
router.get('/debug/recent', auth, async (req, res) => {
  try {
    const messages = await Message.find({})
      .populate('sender', 'name _id')
      .populate('recipient', 'name _id')
      .sort({ createdAt: -1 })
      .limit(5);
    res.json(messages.map(m => ({
      _id: m._id,
      sender: m.sender?.name || m.sender,
      recipient: m.recipient?.name || m.recipient,
      bookingId: m.bookingId,
      content: m.content?.substring(0, 50),
      createdAt: m.createdAt
    })));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// Edit message
router.put('/:messageId', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    message.content = content;
    message.isEdited = true;
    await message.save();
    
    res.json({ message: 'Message updated' });
  } catch (error) {
    console.error('Message send error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete message
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await Message.findByIdAndDelete(req.params.messageId);
    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;