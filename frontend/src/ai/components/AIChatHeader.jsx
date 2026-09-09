import React from 'react';
import { Minus, X } from 'lucide-react';
import chatbotIcon from '../../assets/chatbot-icon.png';

export function AIChatHeader({ onMinimize, onClose }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[#102A43] dark:bg-[#081923] text-white border-b border-acrovix-teal-primary/30 rounded-t-2xl shadow-sm">
      <div className="flex items-center space-x-3">
        {/* Chatbot mascot avatar */}
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center border border-acrovix-teal-primary/20 shadow-inner overflow-hidden flex-shrink-0">
          <img
            src={chatbotIcon}
            alt="ACROVIX Assistant"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold text-white tracking-wide">
              ACROVIX Assistant
            </h3>
          </div>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] text-teal-100/80 font-medium">Online</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-1">
        <button
          onClick={onMinimize}
          aria-label="Minimize Chat"
          className="p-1.5 text-teal-100/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-acrovix-teal-bright"
          title="Minimize"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={onClose}
          aria-label="Close Chat"
          className="p-1.5 text-teal-100/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-acrovix-teal-bright"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
