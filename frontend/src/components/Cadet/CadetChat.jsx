import React from 'react';
import ChatLayout from '../ChatCommon/ChatLayout';
import './cadetChat.css';

const CadetChat = () => {
  return (
    <div className="cadet-chat-wrapper">
      {/* Dashboard Page Header */}
      <header className="cadet-chat-header">
        <h1>Cadet Chat</h1>
        <span className="online-status">🟢 You are Online</span>
      </header>

      {/* Main Chat Container */}
      <div className="cadet-chat-container">
        <ChatLayout userRole="cadet" />
      </div>
    </div>
  );
};

export default CadetChat;