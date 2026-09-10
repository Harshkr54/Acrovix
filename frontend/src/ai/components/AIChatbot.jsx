import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import chatbotIcon from '../../assets/chatbot-icon.png';
import { AIChatWindow } from './AIChatWindow';
import { INITIAL_WELCOME_MESSAGE, getAIResponse } from '../data/demoChatData';
import { sendToGemini } from '../data/geminiService';
import { submitEnquiry } from '../../api/enquiryService';
import '../styles/chatbot.css';

const STORAGE_KEY = 'acrovix_chat_history';
const MAX_STORED_MESSAGES = 30;

// Lead capture conversation states
const LEAD_STATE = {
  NONE:    'none',
  NAME:    'awaiting_name',
  EMAIL:   'awaiting_email',
  COMPANY: 'awaiting_company',
  DONE:    'done'
};

// Gemini conversation history format
const toGeminiHistory = (messages) =>
  messages
    .filter((m) => m.sender !== 'system')
    .map((m) => ({ role: m.sender === 'user' ? 'user' : 'model', text: m.text }));

export function AIChatbot() {
  const [isOpen, setIsOpen]     = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [leadState, setLeadState] = useState(LEAD_STATE.NONE);
  const [leadData, setLeadData]   = useState({ name: '', email: '', company: '' });
  const [geminiAvailable, setGeminiAvailable] = useState(true);

  // Load messages from localStorage (Conversation History)
  const [messages, setMessages] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (_) { /* ignore */ }
    return [INITIAL_WELCOME_MESSAGE];
  });

  const navigate = useNavigate();
  const geminiFailCount = useRef(0);

  // Persist messages to localStorage on every change
  useEffect(() => {
    try {
      const toStore = messages.slice(-MAX_STORED_MESSAGES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (_) { /* quota exceeded — ignore */ }
  }, [messages]);

  // Escape key closes chat
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && isOpen) setIsOpen(false);
  }, [isOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const toggleChat = () => {
    setIsOpen((prev) => !prev);
    if (hasUnread) setHasUnread(false);
  };

  // ─── Add a message to state ─────────────────────────────────────────────
  const pushMessage = (msg) => setMessages((prev) => [...prev, msg]);

  const makeUserMsg = (text) => ({
    id: `user_${Date.now()}`,
    sender: 'user',
    text,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  const makeAiMsg = (text, link = null, showQuickActions = false) => ({
    id: `ai_${Date.now()}_${Math.random()}`,
    sender: 'ai',
    text,
    link,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    showQuickActions
  });

  // ─── Lead Capture Flow ──────────────────────────────────────────────────
  const handleLeadCapture = async (text) => {
    if (leadState === LEAD_STATE.NAME) {
      const name = text.trim();
      setLeadData((prev) => ({ ...prev, name }));
      setLeadState(LEAD_STATE.EMAIL);
      pushMessage(makeAiMsg(
        `Nice to meet you, ${name}! 😊\n\nCould you please share your **business email address** so our team can reach you?`
      ));
      return true;
    }

    if (leadState === LEAD_STATE.EMAIL) {
      const email = text.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        pushMessage(makeAiMsg(
          `Hmm, that doesn't look like a valid email. Please enter a valid email address (e.g., you@company.com). 📧`
        ));
        return true;
      }
      setLeadData((prev) => ({ ...prev, email }));
      setLeadState(LEAD_STATE.COMPANY);
      pushMessage(makeAiMsg(
        `Got it! One last thing — what's your **company or organization name**? (You can also type "skip" to skip this step.)`
      ));
      return true;
    }

    if (leadState === LEAD_STATE.COMPANY) {
      const company = text.trim().toLowerCase() === 'skip' ? '' : text.trim();
      const finalData = { ...leadData, company };
      setLeadData(finalData);
      setLeadState(LEAD_STATE.DONE);

      // Submit as enquiry via existing API
      pushMessage(makeAiMsg(`Perfect! Let me submit your details to our team... ⏳`));
      try {
        await submitEnquiry({
          fullName:             finalData.name,
          businessEmail:        finalData.email,
          companyName:          company || 'Not specified',
          phoneNumber:          'Via chatbot',
          projectRequirement:   'Consultation requested via chatbot',
          industrySector:       '',
          serviceRequired:      '',
          preferredContactMethod: 'Email'
        });
        pushMessage(makeAiMsg(
          `✅ All done, ${finalData.name}!\n\nYour details have been sent to our team. We'll reach out to **${finalData.email}** shortly.\n\nIs there anything else I can help you with?`,
          null, true
        ));
      } catch {
        pushMessage(makeAiMsg(
          `Our team has noted your details. We'll reach out to ${finalData.email} shortly. You can also directly email us at sales@acrovix.com 📩`,
          { label: 'Email Us', path: '/contact' }
        ));
      }
      return true;
    }

    return false;
  };

  // ─── Detect if user wants consultation / lead flow ──────────────────────
  const isLeadTrigger = (text) => {
    const q = text.toLowerCase();
    return (
      q.includes('consultation') || q.includes('contact me') ||
      q.includes('reach me') || q.includes('call me') ||
      q.includes('i want to talk') || q.includes('get in touch') ||
      q.includes('mujhe call') || q.includes('mujhe contact') ||
      q.includes('schedule a call') || q.includes('book a call') ||
      q.includes('apna number') || q.includes('send my details')
    );
  };

  // ─── Main message handler ────────────────────────────────────────────────
  const handleSendMessage = async (text) => {
    const userMsg = makeUserMsg(text);
    pushMessage(userMsg);
    setIsTyping(true);

    // Handle active lead capture flow
    if (leadState !== LEAD_STATE.NONE && leadState !== LEAD_STATE.DONE) {
      await handleLeadCapture(text);
      setIsTyping(false);
      return;
    }

    // Detect if user wants to share contact details
    if (leadState === LEAD_STATE.NONE && isLeadTrigger(text)) {
      setLeadState(LEAD_STATE.NAME);
      setTimeout(() => {
        pushMessage(makeAiMsg(
          `I'd love to connect you with our team! 🤝\n\nLet me collect a few quick details. What's your **full name**?`
        ));
        setIsTyping(false);
      }, 600);
      return;
    }

    // Try Gemini AI first
    if (geminiAvailable) {
      try {
        const history = toGeminiHistory(messages);
        const replyText = await sendToGemini(text, history);

        // If Gemini returns a fallback error message, count it
        if (replyText.includes('temporary issue') || replyText.includes('unable to connect')) {
          geminiFailCount.current += 1;
          if (geminiFailCount.current >= 2) {
            setGeminiAvailable(false);
          }
        } else {
          geminiFailCount.current = 0;
        }

        const delay = Math.min(400 + replyText.length * 12, 2000);
        setTimeout(() => {
          pushMessage(makeAiMsg(replyText));
          setIsTyping(false);
        }, delay);
        return;
      } catch {
        geminiFailCount.current += 1;
        if (geminiFailCount.current >= 2) setGeminiAvailable(false);
        // Fall through to local engine
      }
    }

    // Fallback: local keyword engine
    const delay = Math.min(500 + text.length * 15, 1800);
    setTimeout(() => {
      const aiMsg = getAIResponse(text);
      pushMessage(aiMsg);
      setIsTyping(false);
    }, delay);
  };

  // ─── Quick Action handler ────────────────────────────────────────────────
  const handleSelectQuickAction = (action) => {
    const userMsg = makeUserMsg(action.label);
    pushMessage(userMsg);
    setIsTyping(true);

    const delay = Math.min(500 + action.label.length * 20, 1200);
    setTimeout(() => {
      const aiMsg = getAIResponse(action.label);
      pushMessage(aiMsg);
      setIsTyping(false);
      if (action.path) navigate(action.path);
    }, delay);
  };

  const handleNavigate = (path) => { if (path) navigate(path); };

  // Clear chat history
  const handleClearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([INITIAL_WELCOME_MESSAGE]);
    setLeadState(LEAD_STATE.NONE);
    setLeadData({ name: '', email: '', company: '' });
  };

  return (
    <>
      {/* Floating Chat Trigger Button */}
      <button
        onClick={toggleChat}
        aria-label={isOpen ? 'Close ACROVIX AI Assistant' : 'Open ACROVIX AI Assistant'}
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
              <span className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#102936]" />
            )}
          </div>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <AIChatWindow
          messages={messages}
          isTyping={isTyping}
          onSendMessage={handleSendMessage}
          onSelectQuickAction={handleSelectQuickAction}
          onNavigate={handleNavigate}
          onMinimize={() => setIsOpen(false)}
          onClose={() => setIsOpen(false)}
          onClearHistory={handleClearHistory}
          geminiAvailable={geminiAvailable}
        />
      )}
    </>
  );
}
