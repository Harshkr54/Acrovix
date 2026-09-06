import React from 'react';
import { QUICK_ACTIONS } from '../data/demoChatData';

export function AIQuickActions({ onSelectAction }) {
  return (
    <div className="my-2.5 px-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-acrovix-muted mb-2">
        Suggested Quick Actions
      </p>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => onSelectAction(action)}
            className="px-3 py-1.5 bg-acrovix-card hover:bg-acrovix-aqua-light border border-acrovix-teal-primary/20 text-acrovix-heading hover:text-acrovix-teal-primary text-xs font-medium rounded-full transition-all duration-200 hover:shadow-xs hover:border-acrovix-teal-primary/40 active:scale-98 focus:outline-none focus:ring-1 focus:ring-acrovix-teal-primary"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
