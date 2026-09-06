import React from 'react';
import { Minus, X, Bot } from 'lucide-react';
import acrovixLogo from '../../assets/Acrovix_logo.png';

export function AIChatHeader({ onMinimize, onClose }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[#102A43] dark:bg-[#081923] text-white border-b border-acrovix-teal-primary/30 rounded-t-2xl shadow-sm">
      <div className="flex items-center space-x-3">
        {/* Brand logo avatar or icon */}
        <div className="w-8 h-8 rounded-lg bg-[#F7FCFA] p-1 flex items-center justify-center border border-acrovix-teal-primary/20 shadow-inner overflow-hidden">
          <img 
            src={acrovixLogo} 
            alt="ACROVIX" 
            className="h-full w-auto object-contain"
            onError={(e) => {
              // Fallback to bot icon if logo image fails to load
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <Bot className="w-4 h-4 text-acrovix-teal-bright hidden" />
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
