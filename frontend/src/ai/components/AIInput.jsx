import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

export function AIInput({ onSendMessage, disabled }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus input on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 bg-white dark:bg-[#102936] border-t border-acrovix-teal-primary/15 flex items-center space-x-2 rounded-b-2xl"
    >
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        disabled={disabled}
        className="flex-1 bg-acrovix-bg dark:bg-[#142F3D] border border-acrovix-teal-primary/20 rounded-xl px-3.5 py-2 text-sm text-acrovix-heading dark:text-[#F4FAF9] placeholder-acrovix-muted focus:outline-none focus:border-acrovix-teal-primary focus:ring-1 focus:ring-acrovix-teal-primary/30 transition-all"
        aria-label="Type your message"
      />
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        aria-label="Send message"
        className="p-2.5 bg-acrovix-teal-primary hover:bg-acrovix-teal-bright text-white rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-acrovix-teal-primary focus:outline-none focus:ring-2 focus:ring-acrovix-teal-primary/50 shadow-xs flex-shrink-0"
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
}
