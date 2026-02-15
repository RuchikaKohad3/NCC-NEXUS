import React from 'react';

const MessageBubble = ({ message }) => {
  const isMe = message.sender === 'me';

  return (
    <div className={`message-bubble ${isMe ? 'sent' : 'received'}`}>
      <div className="msg-text">
        {message.text}
      </div>
      <div className="msg-meta">
        <span className="msg-time">{message.time}</span>
        {isMe && <span style={{fontSize: '0.8rem', color: '#53bdeb'}}>✓✓</span>} 
      </div>
    </div>
  );
};

export default MessageBubble;