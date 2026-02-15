import React, { useState } from 'react';

const MessageInput = ({ onSend }) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim()) {
      onSend(text);
      setText('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input-area">
      {/* Emoji Icon (Placeholder) */}
      <span style={{ fontSize: '1.5rem', cursor: 'pointer', color: '#8696a0' }}>
        😊
      </span>

      {/* Text Area */}
      <input
        className="message-field"
        placeholder="Type a message"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      {/* Send Button */}
      <button className="send-btn" onClick={handleSend}>
        ➤
      </button>
    </div>
  );
};

export default MessageInput;