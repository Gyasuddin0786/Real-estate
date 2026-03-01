import React, { useState } from 'react';

const ChatInput = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-input-container">
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          className="chat-input"
          maxLength={500}
        />
        <button 
          type="submit" 
          className="send-btn"
          disabled={!message.trim()}
        >
          ➤
        </button>
      </form>
      
      <div className="quick-actions">
        <button 
          className="quick-action-btn"
          onClick={() => onSendMessage('Show me properties')}
        >
          🏠 Properties
        </button>
        <button 
          className="quick-action-btn"
          onClick={() => onSendMessage('Contact agent')}
        >
          📞 Contact
        </button>
        <button 
          className="quick-action-btn"
          onClick={() => onSendMessage('Help')}
        >
          ❓ Help
        </button>
      </div>
    </div>
  );
};

export default ChatInput;