import React, { useState } from 'react';
import ChatLayout from '../ChatCommon/ChatLayout';
import './anoChat.css';

const ANOChat = () => {
  const [createGroupSignal, setCreateGroupSignal] = useState(0);

  return (
    <div className="ano-chat-wrapper">
      {/* Dashboard Page Header */}
      <header className="ano-chat-header">
        <div className="ano-title-group">
          <h1>Commanding Officer Chat</h1>
          <span className="encryption-note">🔒 End-to-End Encrypted</span>
        </div>
        
        <div className="ano-controls">
           <button className="new-group-btn" type="button" onClick={() => setCreateGroupSignal((prev) => prev + 1)}>+ New Group</button>
        </div>
      </header>

      {/* Main Chat Container */}
      <div className="ano-chat-container">
        <ChatLayout userRole="ano" createGroupSignal={createGroupSignal} />
      </div>
    </div>
  );
};

export default ANOChat;
