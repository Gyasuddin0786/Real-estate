const express = require('express');
const router = express.Router();
const chatHandler = require('../bot/logic/chatHandler');

// Chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, userId } = req.body;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({
        error: 'Message is required'
      });
    }

    // Process message through chat handler
    const response = await chatHandler.processMessage(message, userId || 'guest');
    
    // Log chat for analytics (optional)
    console.log(`Bot Chat - User: ${userId || 'guest'}, Message: ${message}, Response: ${response.text}`);
    
    res.json({
      response: response.text,
      quickReplies: response.quickReplies || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Bot chat error:', error);
    res.status(500).json({
      error: 'Internal server error',
      response: 'Sorry, I\'m having trouble right now. Please try again later.',
      quickReplies: ['Try again', 'Contact support']
    });
  }
});

// Get bot status
router.get('/status', (req, res) => {
  res.json({
    status: 'online',
    message: 'Real Estate Bot is ready to help!',
    features: [
      'Property search assistance',
      'Price inquiries',
      'Location information',
      'Agent contact',
      'Appointment booking'
    ]
  });
});

// Clear user context (for privacy)
router.delete('/context/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    chatHandler.clearUserContext(userId);
    
    res.json({
      message: 'User context cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing context:', error);
    res.status(500).json({
      error: 'Failed to clear context'
    });
  }
});

module.exports = router;