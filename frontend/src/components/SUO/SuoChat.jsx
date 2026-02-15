import React from 'react';
import ChatLayout from '../ChatCommon/ChatLayout';
import './suoChat.css';

const SUOChat = () => {
  return (
    <div className="suo-chat-wrapper">
      {/* Dashboard Page Header */}
      <header className="suo-chat-header">
        <div className="header-title">
          <h1>SUO Command Center</h1>
          <span className="subtitle">Secure Communication Channel</span>
        </div>
        
        <div className="suo-actions">
          <button className="broadcast-btn">📢 Broadcast</button>
        </div>
      </header>

      {/* Main Chat Container */}
      <div className="suo-chat-container">
        {/* Pass role="suo" to enable SUO specific tabs */}
        <ChatLayout userRole="suo" />
      </div>
    </div>
  );
};

export default SUOChat;