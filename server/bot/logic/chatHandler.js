const responses = require('../responses/responses.json');

class ChatHandler {
  constructor() {
    this.context = new Map(); // Store user context
  }

  async processMessage(message, userId = 'guest') {
    const normalizedMessage = message.toLowerCase().trim();
    
    // Get or create user context
    if (!this.context.has(userId)) {
      this.context.set(userId, {
        lastIntent: null,
        preferences: {},
        conversationStep: 0
      });
    }

    const userContext = this.context.get(userId);
    
    // Intent detection
    const intent = this.detectIntent(normalizedMessage);
    userContext.lastIntent = intent;
    
    // Generate response based on intent
    const response = this.generateResponse(intent, normalizedMessage, userContext);
    
    // Update context
    this.context.set(userId, userContext);
    
    return response;
  }

  detectIntent(message) {
    const intents = {
      greeting: ['hi', 'hello', 'hey', 'good morning', 'good evening'],
      property_search: ['property', 'house', 'apartment', 'flat', 'home', 'buy', 'rent', 'search'],
      price_inquiry: ['price', 'cost', 'budget', 'expensive', 'cheap', 'affordable'],
      location: ['location', 'area', 'where', 'address', 'near', 'locality'],
      contact: ['contact', 'agent', 'call', 'phone', 'email', 'reach'],
      booking: ['book', 'appointment', 'visit', 'schedule', 'meeting'],
      help: ['help', 'assist', 'support', 'guide'],
      goodbye: ['bye', 'goodbye', 'thanks', 'thank you', 'exit']
    };

    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        return intent;
      }
    }

    return 'unknown';
  }

  generateResponse(intent, message, userContext) {
    const intentResponses = responses[intent] || responses.unknown;
    
    let response = {
      text: this.getRandomResponse(intentResponses.messages),
      quickReplies: intentResponses.quickReplies || []
    };

    // Add context-specific responses
    switch (intent) {
      case 'property_search':
        response = this.handlePropertySearch(message, userContext);
        break;
      case 'price_inquiry':
        response = this.handlePriceInquiry(message, userContext);
        break;
      case 'location':
        response = this.handleLocationInquiry(message, userContext);
        break;
      case 'contact':
        response = this.handleContactRequest(message, userContext);
        break;
      case 'booking':
        response = this.handleBookingRequest(message, userContext);
        break;
    }

    return response;
  }

  handlePropertySearch(message, userContext) {
    const propertyTypes = {
      'apartment': 'apartments',
      'house': 'houses',
      'flat': 'flats',
      'villa': 'villas',
      'commercial': 'commercial properties'
    };

    let propertyType = 'properties';
    for (const [key, value] of Object.entries(propertyTypes)) {
      if (message.includes(key)) {
        propertyType = value;
        break;
      }
    }

    return {
      text: `I can help you find ${propertyType}! Let me know your preferences:`,
      quickReplies: [
        'Under ₹50 Lakh',
        '₹50L - ₹1 Crore',
        'Above ₹1 Crore',
        'Show all properties'
      ]
    };
  }

  handlePriceInquiry(message, userContext) {
    return {
      text: 'Our properties range from ₹25 Lakh to ₹5 Crore. What\'s your budget range?',
      quickReplies: [
        '₹25L - ₹50L',
        '₹50L - ₹1Cr',
        '₹1Cr - ₹2Cr',
        'Above ₹2Cr'
      ]
    };
  }

  handleLocationInquiry(message, userContext) {
    return {
      text: 'We have properties in prime locations across the city. Which area interests you?',
      quickReplies: [
        'City Center',
        'Suburbs',
        'Near Metro',
        'Waterfront'
      ]
    };
  }

  handleContactRequest(message, userContext) {
    return {
      text: 'I\'ll connect you with our expert agents! How would you prefer to be contacted?',
      quickReplies: [
        'Call me',
        'WhatsApp',
        'Email',
        'Schedule meeting'
      ]
    };
  }

  handleBookingRequest(message, userContext) {
    return {
      text: 'Great! I can help you schedule a property visit. When would you like to visit?',
      quickReplies: [
        'Today',
        'Tomorrow',
        'This weekend',
        'Next week'
      ]
    };
  }

  getRandomResponse(messages) {
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Clear user context (for privacy)
  clearUserContext(userId) {
    this.context.delete(userId);
  }
}

module.exports = new ChatHandler();