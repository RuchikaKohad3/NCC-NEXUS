import React, { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

const ChatWindow = ({ isHidden, chatData, onSendMessage, onBack, isMobile }) => {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatData && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatData?.messages]);

  // If no chat is selected (and not hidden by mobile logic)
  if (!chatData) {
    return (
      <div className={`chat-window ${isHidden ? 'hidden' : ''}`}>
        <div className="empty-state">
          <h2>NCC Connect Web</h2>
          <p>Send and receive messages without keeping your phone online.</p>
          <p>Use NCC Chat on up to 4 linked devices and 1 phone.</p>
          <div style={{fontSize: '3rem', marginTop: '20px'}}>🛡️</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`chat-window ${isHidden ? 'hidden' : ''}`}>
      {/* Header */}
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Mobile Back Button */}
          {isMobile && (
            <button 
              onClick={onBack} 
              style={{ background: 'none', border: 'none', color: '#fff', marginRight: 10, fontSize: '1.2rem' }}
            >
              ←
            </button>
          )}
          
          <div className="avatar-circle" style={{width: 35, height: 35, fontSize: '0.8rem'}}>
            {chatData.name.substring(0, 2).toUpperCase()}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 500 }}>{chatData.name}</span>
            <span style={{ fontSize: '0.75rem', color: '#8696a0' }}>
              {chatData.online ? 'Online' : 'Click for info'}
            </span>
          </div>
        </div>

        {/* Action Icons (Visual only) */}
        <div style={{ display: 'flex', gap: 15, color: '#8696a0' }}>
          <span>🔍</span>
          <span>⋮</span>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-area">
        {chatData.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {/* Invisible div to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={onSendMessage} />
    </div>
  );
};

export default ChatWindow;