import React from 'react';
import ChatTabs from './ChatTabs';
import ChatList from './ChatList';

const ChatSidebar = ({ 
  isHidden, 
  userRole, 
  activeTab, 
  setActiveTab, 
  searchQuery, 
  setSearchQuery, 
  conversations, 
  selectedChatId, 
  onSelectChat 
}) => {
  
  return (
    <div className={`chat-sidebar ${isHidden ? 'hidden' : ''}`}>
      {/* Header / Search */}
      <div className="chat-header">
        <div className="avatar-circle" style={{width: 35, height: 35, fontSize: '0.8rem'}}>
          ME
        </div>
        <div style={{fontWeight: 'bold'}}>NCC Chats</div>
      </div>

      <div className="sidebar-search">
        <input 
          type="text" 
          placeholder="Search or start new chat" 
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Dynamic Tabs based on Role */}
      <ChatTabs 
        userRole={userRole} 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      {/* List of Conversations */}
      <ChatList 
        chats={conversations} 
        selectedId={selectedChatId} 
        onSelect={onSelectChat} 
      />
    </div>
  );
};

export default ChatSidebar;