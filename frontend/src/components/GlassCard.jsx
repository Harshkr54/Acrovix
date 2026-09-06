import React from 'react';

const GlassCard = ({
  children,
  className = '',
  hoverEffect = true,
  glow = false,
  padding = 'p-6 md:p-8',
  ...props
}) => {
  return (
    <div
      className={`
        bg-white/68 dark:bg-acrovix-card/80 backdrop-blur-md
        border border-acrovix-teal-primary/14 dark:border-acrovix-teal-bright/25
        rounded-2xl
        shadow-[0_8px_30px_rgba(16,42,67,0.06)]
        ${hoverEffect ? 'hover:bg-white/82 hover:shadow-[0_12px_36px_rgba(16,42,67,0.08)] hover:-translate-y-1.5 hover:border-acrovix-teal-primary/22 transition-all duration-300' : ''}
        ${glow ? 'relative overflow-hidden before:absolute before:inset-0 before:bg-acrovix-teal-primary/5 before:pointer-events-none' : ''}
        ${padding}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
