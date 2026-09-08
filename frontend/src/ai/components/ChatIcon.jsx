import React from 'react';

export const ChatIcon = ({ className = "w-6 h-6" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    {/* Clean rounded chat bubble */}
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    {/* Subtle central spark representing AI intelligence */}
    <path d="m12 7-1.5 2.5L8 11l2.5 1.5L12 15l1.5-2.5L16 11l-2.5-1.5z" />
  </svg>
);
