import React from 'react';

const MessageList = ({ messages, isTyping, onQuickReply }) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="message-list">
      {messages.map((message) => (
        <div key={message.id} className={`message ${message.sender}`}>
          <div className="message-content">
            <p>{message.text}</p>
            <span className="message-time">{formatTime(message.timestamp)}</span>
          </div>
          
          {message.quickReplies && (
            <div className="quick-replies">
              {message.quickReplies.map((reply, index) => (
                <button
                  key={index}
                  className="quick-reply-btn"
                  onClick={() => onQuickReply(reply)}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      
      {isTyping && (
        <div className="message bot">
          <div className="message-content typing">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;