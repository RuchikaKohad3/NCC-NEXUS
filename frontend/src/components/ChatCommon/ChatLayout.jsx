import React, { useState, useEffect } from 'react';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import './chatCommon.css';

// ---------------- DUMMY DATA GENERATOR ---------------- //
const INITIAL_CONVERSATIONS = [
  {
    id: "1",
    name: "Alpha Platoon",
    type: "group",
    roleCategory: "Groups",
    lastMessage: "Parade schedule updated.",
    timestamp: "10:30 AM",
    unread: 2,
    online: true,
    messages: [
      { id: 1, sender: "other", text: "Attention everyone!", time: "10:00 AM" },
      { id: 2, sender: "other", text: "Parade schedule updated.", time: "10:30 AM" }
    ]
  },
  {
    id: "2",
    name: "SUO Rajesh Kumar",
    type: "individual",
    roleCategory: "SUO",
    lastMessage: "Sir, reporting for duty.",
    timestamp: "Yesterday",
    unread: 0,
    online: false,
    messages: [
      { id: 1, sender: "me", text: "Report status?", time: "09:00 AM" },
      { id: 2, sender: "other", text: "Sir, reporting for duty.", time: "09:15 AM" }
    ]
  },
  {
    id: "3",
    name: "Col. Sharma (ANO)",
    type: "individual",
    roleCategory: "ANO",
    lastMessage: "Please submit the forms.",
    timestamp: "Tuesday",
    unread: 1,
    online: true,
    messages: [
      { id: 1, sender: "other", text: "Please submit the forms.", time: "Tuesday" }
    ]
  },
  {
    id: "4",
    name: "Cdt. Anjali Singh",
    type: "individual",
    roleCategory: "Cadets",
    lastMessage: "Okay, I will check.",
    timestamp: "Monday",
    unread: 0,
    online: true,
    messages: [
      { id: 1, sender: "me", text: "Check your uniform.", time: "Monday" },
      { id: 2, sender: "other", text: "Okay, I will check.", time: "Monday" }
    ]
  }
];

const ChatLayout = ({ userRole = 'cadet' }) => {
  // State for Conversations
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  
  // State for UI Logic
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mobile Responsiveness Logic
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Listener for window resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Handlers ---

  // 1. Handle sending a message
  const handleSendMessage = (text) => {
    if (!text.trim() || !selectedChatId) return;

    const newMessage = {
      id: Date.now(),
      sender: "me",
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversations(prev => prev.map(chat => {
      if (chat.id === selectedChatId) {
        return {
          ...chat,
          messages: [...chat.messages, newMessage],
          lastMessage: text,
          timestamp: "Just now"
        };
      }
      return chat;
    }));
  };

  // 2. Handle Selecting a Chat (clears unread)
  const handleSelectChat = (chatId) => {
    setSelectedChatId(chatId);
    setConversations(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, unread: 0 } : chat
    ));
  };

  // 3. Handle Back Button (Mobile)
  const handleBackToSidebar = () => {
    setSelectedChatId(null);
  };

  // 4. Filtering Logic
  const filteredConversations = conversations.filter(chat => {
    const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Tab filtering logic
    if (activeTab === 'All') return matchesSearch;
    if (activeTab === 'Unread') return matchesSearch && chat.unread > 0;
    
    // Match role categories (Groups, Cadets, ANO, etc.)
    return matchesSearch && chat.roleCategory === activeTab;
  });

  // Get current active chat object
  const activeChatData = conversations.find(c => c.id === selectedChatId);

  return (
    <div className="ncc-chat-container">
      
      {/* Sidebar - Hidden on mobile if chat is open */}
      <ChatSidebar 
        isHidden={isMobile && selectedChatId !== null}
        userRole={userRole}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        conversations={filteredConversations}
        selectedChatId={selectedChatId}
        onSelectChat={handleSelectChat}
      />

      {/* Chat Window - Hidden on mobile if no chat selected */}
      <ChatWindow 
        isHidden={isMobile && selectedChatId === null}
        chatData={activeChatData}
        onSendMessage={handleSendMessage}
        onBack={handleBackToSidebar} // For mobile
        isMobile={isMobile}
      />

    </div>
  );
};

export default ChatLayout;