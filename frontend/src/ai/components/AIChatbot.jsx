import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import chatbotIcon from '../../assets/chatbot-icon.png';
import { AIChatWindow } from './AIChatWindow';
import { INITIAL_WELCOME_MESSAGE, getAIResponse } from '../data/demoChatData';
import '../styles/chatbot.css';

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_WELCOME_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  const navigate = useNavigate();

  // Close chatbot window on Escape key press
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const toggleChat = () => {
    setIsOpen((prev) => !prev);
    if (hasUnread) {
      setHasUnread(false);
    }
  };

  const handleSendMessage = (text) => {
    const userMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // Simulate realistic AI response latency
    setTimeout(() => {
      const aiMsg = getAIResponse(text);
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 750);
  };

  const handleSelectQuickAction = (action) => {
    const userMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: action.label,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const aiMsg = getAIResponse(action.label);
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);

      if (action.path) {
        navigate(action.path);
      }
    }, 700);
  };

  const handleNavigate = (path) => {
    if (path) {
      navigate(path);
    }
  };

  return (
    <>
      {/* Floating Chat Trigger Button */}
      <button
        onClick={toggleChat}
        aria-label={isOpen ? "Close ACROVIX AI Assistant" : "Open ACROVIX AI Assistant"}
        className={`fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-acrovix-teal-bright focus:ring-offset-2 ${
          isOpen
            ? 'p-3.5 bg-[#0B1C2A] dark:bg-[#102936] text-white rotate-90 shadow-none'
            : 'w-16 h-16 bg-transparent shadow-lg shadow-acrovix-teal-primary/25'
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative flex items-center justify-center w-full h-full">
            <img
              src={chatbotIcon}
              alt="Open ACROVIX AI Assistant"
              className="w-full h-full object-contain rounded-full"
            />
            {hasUnread && (
              <span className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#102936]"></span>
            )}
          </div>
        )}
      </button>

      {/* Chat Window Panel */}
      {isOpen && (
        <AIChatWindow
          messages={messages}
          isTyping={isTyping}
          onSendMessage={handleSendMessage}
          onSelectQuickAction={handleSelectQuickAction}
          onNavigate={handleNavigate}
          onMinimize={() => setIsOpen(false)}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
