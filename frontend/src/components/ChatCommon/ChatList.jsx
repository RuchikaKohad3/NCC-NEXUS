import React from 'react';

const ChatList = ({ chats, selectedId, onSelect }) => {
  
  if (chats.length === 0) {
    return (
      <div className="empty-state" style={{ height: '200px' }}>
        <p>No conversations found.</p>
      </div>
    );
  }

  return (
    <div className="chat-list">
      {chats.map((chat) => (
        <div 
          key={chat.id} 
          className={`chat-item ${selectedId === chat.id ? 'active' : ''}`}
          onClick={() => onSelect(chat.id)}
        >
          {/* Avatar (Initials) */}
          <div className="avatar-circle">
            {chat.name.substring(0, 2).toUpperCase()}
          </div>

          <div className="chat-info">
            <div className="chat-name-row">
              <span className="chat-name">{chat.name}</span>
              <span className="chat-time">{chat.timestamp}</span>
            </div>
            
            <div className="chat-preview-row">
              <span className="chat-last-msg">
                {chat.type === 'group' && chat.lastMessageSender ? `${chat.lastMessageSender}: ` : ''}
                {chat.lastMessage}
              </span>
              
              {/* Unread Badge */}
              {chat.unread > 0 && (
                <div className="unread-badge">{chat.unread}</div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatList;