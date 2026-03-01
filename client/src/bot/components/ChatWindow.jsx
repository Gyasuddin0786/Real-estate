import React, { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

const ChatWindow = ({ messages, onSendMessage, onClose, isTyping }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleQuickReply = (reply) => {
    onSendMessage(reply);
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="bot-avatar">🏠</div>
          <div>
            <h4>Real Estate Assistant</h4>
            <span className="status">Online</span>
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="chat-body">
        <MessageList 
          messages={messages} 
          isTyping={isTyping}
          onQuickReply={handleQuickReply}
        />
        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSendMessage={onSendMessage} />
    </div>
  );
};

export default ChatWindow;