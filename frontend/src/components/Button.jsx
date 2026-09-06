import React from 'react';
import { Link } from 'react-router-dom';

const Button = ({
  children,
  to,
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-acrovix-teal-bright focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl whitespace-nowrap flex-shrink-0 shadow-none";
  
  const variants = {
    primary: "bg-acrovix-teal-primary hover:bg-acrovix-teal-bright text-white border-0 shadow-none",
    secondary: "bg-white/80 dark:bg-[#102936] hover:bg-acrovix-card dark:hover:bg-[#142F3D] text-acrovix-heading border border-acrovix-teal-primary/25 dark:border-teal-500/30 shadow-none",
    outline: "border-2 border-acrovix-teal-primary text-acrovix-teal-primary hover:bg-acrovix-teal-primary hover:text-white shadow-none",
    ghost: "text-acrovix-heading hover:bg-acrovix-aqua-light/50 dark:hover:bg-[#142F3D] hover:text-acrovix-teal-primary shadow-none",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm gap-1.5",
    md: "px-6 py-2.5 text-base gap-2",
    lg: "px-8 py-3.5 text-lg font-semibold gap-2.5",
  };

  const combinedClasses = `${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`;

  const content = (
    <>
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={combinedClasses} {...props}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={combinedClasses} target="_blank" rel="noopener noreferrer" {...props}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} className={combinedClasses} onClick={onClick} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
};

export default Button;
