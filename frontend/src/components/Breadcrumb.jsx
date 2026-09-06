import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumb = ({ items = [] }) => {
  return (
    <nav className="flex items-center gap-2 text-xs font-semibold text-acrovix-muted mb-6 overflow-x-auto py-1" aria-label="Breadcrumb">
      <Link to="/" className="inline-flex items-center gap-1 hover:text-acrovix-teal-primary transition-colors flex-shrink-0">
        <Home className="w-3.5 h-3.5" />
        <span>Home</span>
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            {isLast || !item.path ? (
              <span className="text-acrovix-teal-primary font-bold truncate flex-shrink-0">
                {item.label}
              </span>
            ) : (
              <Link to={item.path} className="hover:text-acrovix-teal-primary transition-colors flex-shrink-0">
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
