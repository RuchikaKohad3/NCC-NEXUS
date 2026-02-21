import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

const ChatWindow = ({
  isHidden,
  chatData,
  messages,
  onSendMessage,
  onTyping,
  onBack,
  isMobile,
  currentUserId,
  typingUsers = [],
}) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!chatData) {
    return (
      <div className={`chat-window ${isHidden ? 'hidden' : ''}`}>
        <div className="empty-state">
          <h2>NCC Connect Web</h2>
          <p>Select a conversation to start messaging.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`chat-window ${isHidden ? 'hidden' : ''}`}>
      <div className="chat-header">
        <div className="chat-header-left">
          {isMobile && (
            <button className="chat-back-btn" onClick={onBack}>
              &larr;
            </button>
          )}

          <div className="chat-header-avatar">
            <div className="avatar-circle">
              {chatData.name.substring(0, 2).toUpperCase()}
            </div>
            <span className={`chat-status-dot ${chatData.online ? 'online' : 'offline'}`} />
          </div>

          <div className="chat-header-info">
            <span className="chat-header-name">{chatData.name}</span>
            <span className={`chat-header-status ${typingUsers.length > 0 ? 'typing' : chatData.online ? 'online' : 'offline'}`}>
              {typingUsers.length > 0 ? 'Typing...' : (chatData.online ? 'Online' : 'Offline')}
            </span>
          </div>
        </div>
      </div>

      <div className="messages-area">
        {messages.map((msg) => (
          <MessageBubble key={msg.message_id} message={msg} currentUserId={currentUserId} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput onSend={onSendMessage} onTyping={onTyping} disabled={!chatData} />
    </div>
  );
};

export default ChatWindow;
