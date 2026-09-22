import React from 'react';

export default function Skeleton({ variant = 'text', className = '', ...props }) {
    const baseClasses = 'bg-bg-muted rounded-md relative overflow-hidden';
    
    // Add the shimmer effect via CSS, but respect prefers-reduced-motion
    const shimmerClasses = 'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent dark:before:via-white/5';
    
    const variants = {
        text: 'h-4 w-3/4',
        title: 'h-6 w-1/2 rounded-lg',
        card: 'h-32 w-full rounded-2xl',
        rectangle: 'h-full w-full',
        avatar: 'h-10 w-10 rounded-full',
        'table-row': 'h-12 w-full rounded-xl',
    };

    const combinedClasses = `${baseClasses} ${shimmerClasses} ${variants[variant] || variants.text} ${className}`;

    return (
        <div className={combinedClasses} {...props} aria-hidden="true" />
    );
}
