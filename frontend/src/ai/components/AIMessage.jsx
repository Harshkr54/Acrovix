import React from 'react';
import { Bot, ArrowRight } from 'lucide-react';

export function AIMessage({ message, onNavigate }) {
  const isAI = message.sender === 'ai';

  return (
    <div
      className={`flex w-full mb-3.5 ${
        isAI ? 'justify-start' : 'justify-end'
      }`}
    >
      <div className={`flex max-w-[85%] ${isAI ? 'flex-row items-start space-x-2' : 'flex-row-reverse space-x-reverse space-x-2'}`}>
        {isAI && (
          <div className="w-6 h-6 rounded-full bg-acrovix-teal-primary/10 border border-acrovix-teal-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Bot className="w-3.5 h-3.5 text-acrovix-teal-primary" />
          </div>
        )}

        <div className="flex flex-col">
          <div
            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              isAI
                ? 'bg-white dark:bg-[#142F3D] border border-acrovix-teal-primary/20 text-acrovix-heading shadow-xs rounded-tl-xs'
                : 'bg-acrovix-teal-primary text-white shadow-xs rounded-tr-xs'
            }`}
          >
            <p className="whitespace-pre-wrap font-normal">{message.text}</p>

            {isAI && message.link && (
              <button
                onClick={() => onNavigate && onNavigate(message.link.path)}
                className="mt-2.5 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-acrovix-card dark:bg-[#102936] hover:bg-acrovix-aqua-light dark:hover:bg-[#183947] text-acrovix-teal-primary font-medium text-xs rounded-lg border border-acrovix-teal-primary/25 transition-all duration-200 group"
              >
                <span>{message.link.label}</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>

          <span
            className={`text-[10px] text-acrovix-muted mt-1 px-1 ${
              isAI ? 'text-left' : 'text-right'
            }`}
          >
            {message.timestamp}
          </span>
        </div>
      </div>
    </div>
  );
}
