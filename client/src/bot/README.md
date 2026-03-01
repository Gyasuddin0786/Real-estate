# Real Estate Chat Bot

## Overview
A free, custom-built chat bot for real estate applications with support for property search, price inquiries, agent contact, and appointment booking.

## Features
- 🏠 Property search assistance
- 💰 Price range inquiries
- 📍 Location-based queries
- 📞 Agent contact facilitation
- 📅 Appointment booking
- 🎯 Context-aware conversations
- 📱 Mobile responsive design

## Integration

### 1. Add to Your Main App Component

```jsx
import ChatBot from './bot';

function App() {
  return (
    <div className="App">
      {/* Your existing components */}
      
      {/* Add ChatBot at the end */}
      <ChatBot />
    </div>
  );
}
```

### 2. Import CSS (if needed)
The ChatBot component automatically imports its CSS, but you can customize it by modifying:
`/bot/components/ChatBot.css`

## API Endpoints

### Chat Endpoint
- **POST** `/api/bot/chat`
- **Body**: `{ message: string, userId?: string }`
- **Response**: `{ response: string, quickReplies: string[], timestamp: string }`

### Status Endpoint
- **GET** `/api/bot/status`
- **Response**: `{ status: string, message: string, features: string[] }`

### Clear Context
- **DELETE** `/api/bot/context/:userId`
- **Response**: `{ message: string }`

## Customization

### 1. Modify Responses
Edit `/server/bot/responses/responses.json` to customize bot responses.

### 2. Add New Intents
Update `/server/bot/logic/chatHandler.js` to add new conversation flows.

### 3. Styling
Modify `/client/src/bot/components/ChatBot.css` for custom styling.

### 4. Quick Actions
Update quick action buttons in `/client/src/bot/components/ChatInput.jsx`.

## File Structure
```
bot/
├── components/
│   ├── ChatBot.jsx          # Main chat bot component
│   ├── ChatWindow.jsx       # Chat window container
│   ├── MessageList.jsx      # Message display component
│   ├── ChatInput.jsx        # Input and quick actions
│   └── ChatBot.css          # All styles
├── utils/
│   └── botApi.js           # API communication utilities
├── index.js                # Export file
└── README.md              # This file

server/bot/
├── logic/
│   └── chatHandler.js      # Main bot logic and intent detection
├── responses/
│   └── responses.json      # Predefined responses
└── routes/
    └── bot.js             # Express routes (in /routes/bot.js)
```

## Usage Examples

### Basic Integration
```jsx
import ChatBot from './bot';

<ChatBot />
```

### With Custom User ID
```jsx
import { ChatBot } from './bot';

<ChatBot userId={currentUser?.id || 'guest'} />
```

## Real Estate Specific Features

### Property Search
- Detects property type (apartment, house, villa)
- Asks for budget preferences
- Provides quick reply options

### Price Inquiries
- Handles budget-related questions
- Offers price range selections
- Connects to property listings

### Location Queries
- Understands area preferences
- Suggests popular locations
- Filters by proximity

### Agent Contact
- Facilitates agent connections
- Offers multiple contact methods
- Schedules callbacks

### Appointment Booking
- Handles visit scheduling
- Offers time slot options
- Confirms bookings

## Performance
- Lightweight components
- Efficient state management
- Minimal API calls
- Responsive design
- Mobile optimized

## Browser Support
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Dependencies
- React 16.8+ (hooks support)
- No external chat libraries required
- Uses native fetch API

## Deployment Notes
- Ensure server routes are properly configured
- Update API_BASE_URL in production
- Test all conversation flows
- Monitor chat logs for improvements