import React from 'react';
import { ChatIcon } from './ChatIcon';
import { AIChatHeader } from './AIChatHeader';

export function AIComingSoon({ onMinimize, onClose }) {
  return (
    <div
      role="dialog"
      aria-label="ACROVIX Assistant Coming Soon"
      className="fixed bottom-24 right-4 sm:right-6 z-50 w-[92vw] sm:w-[380px] h-[550px] max-h-[calc(100vh-7rem)] flex flex-col bg-white/95 dark:bg-[#102936]/95 backdrop-blur-xl border border-acrovix-teal-primary/20 dark:border-acrovix-teal-bright/30 rounded-2xl shadow-2xl shadow-acrovix-teal-primary/10 animate-chat-slide-up overflow-hidden"
    >
      {/* Header */}
      <AIChatHeader onMinimize={onMinimize} onClose={onClose} />

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-[#07151F]">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-[#102A43] flex items-center justify-center mb-6 shadow-inner border border-teal-100 dark:border-acrovix-teal-primary/30">
          <ChatIcon className="w-8 h-8 text-acrovix-teal-primary dark:text-acrovix-teal-bright" />
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
          AI Assistant<br/>Coming Soon
        </h2>
        
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-8 leading-relaxed max-w-[280px]">
          Our AI-powered assistant is currently under development. Soon, you'll be able to get instant guidance, explore solutions, and connect with ACROVIX more intelligently.
        </p>
        
        <div className="px-4 py-1.5 rounded-full bg-teal-50 dark:bg-[#102A43] border border-teal-200 dark:border-acrovix-teal-primary/30">
          <span className="text-xs font-bold text-acrovix-teal-primary dark:text-acrovix-teal-bright tracking-wider">
            COMING SOON
          </span>
        </div>
      </div>
    </div>
  );
}
