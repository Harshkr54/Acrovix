import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleTheme(e);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`
        p-1.5 rounded-lg flex items-center justify-center flex-shrink-0
        bg-transparent border-0 shadow-none outline-none
        hover:scale-110 active:scale-95
        transition-all duration-300 cursor-pointer select-none z-20 pointer-events-auto
        focus:outline-none focus-visible:ring-1 focus-visible:ring-[#14B8A6]
        ${className}
      `}
    >
      <div
        className={`
          flex items-center justify-center transition-transform duration-300 ease-out transform pointer-events-none
          ${isDark ? 'rotate-[360deg] scale-100' : 'rotate-0 scale-100'}
        `}
      >
        {isDark ? (
          <Moon className="w-5 h-5 text-white stroke-[2.2]" />
        ) : (
          <Sun className="w-5 h-5 text-[#F59E0B] stroke-[2.2]" />
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;
