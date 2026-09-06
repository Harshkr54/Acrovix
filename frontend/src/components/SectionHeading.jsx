import React from 'react';

const SectionHeading = ({
  badge,
  title,
  subtitle,
  align = 'center',
  className = '',
  titleClassName = ''
}) => {
  const alignmentClasses = {
    center: 'text-center mx-auto max-w-3xl',
    left: 'text-left max-w-3xl',
    right: 'text-right ml-auto max-w-3xl'
  };

  const defaultTitleClass = "text-3xl md:text-4xl lg:text-5xl font-semibold text-acrovix-heading tracking-tight [word-spacing:0.18em] leading-[1.14] mb-4";

  return (
    <div className={`mb-12 md:mb-16 ${alignmentClasses[align] || alignmentClasses.center} ${className}`}>
      {badge && (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-acrovix-card border border-acrovix-teal-primary/20 text-acrovix-teal-primary mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-acrovix-teal-primary animate-pulse"></span>
          {badge}
        </span>
      )}
      {title && (
        <h2 className={titleClassName || defaultTitleClass}>
          {title}
        </h2>
      )}
      {subtitle && (
        <p className="text-base md:text-lg text-acrovix-body leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default SectionHeading;
