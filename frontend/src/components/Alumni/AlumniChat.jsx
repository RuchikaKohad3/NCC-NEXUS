import React from 'react';
import ChatLayout from '../ChatCommon/ChatLayout';
import './alumniChat.css';

const AlumniChat = () => {
  return (
    <div className="alumni-chat-wrapper">
      {/* Dashboard Page Header */}
      <header className="alumni-chat-header">
        <div className="header-left">
          <h1>Alumni Network</h1>
          <span className="subtitle">Connect with Cadets & ANOs</span>
        </div>
        <div className="status-badge">
           🎓 Alumni Access
        </div>
      </header>

      {/* Main Chat Container */}
      <div className="alumni-chat-container">
        <ChatLayout userRole="alumni" />
      </div>
    </div>
  );
};

export default AlumniChat;