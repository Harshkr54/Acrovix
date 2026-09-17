import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export default function ActionMenu({
    items = [],
    ariaLabel = 'More actions',
    icon: CustomIcon = MoreVertical,
    buttonClassName = '',
    renderContent = null,
    onOpen = null
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({});
    const buttonRef = useRef(null);
    const menuRef = useRef(null);

    const calculatePosition = () => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const menuWidth = 216; // w-[216px]
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        const pos = {
            position: 'fixed',
            zIndex: 9999,
        };

        // Vertical positioning: open upward if space below is limited
        if (spaceBelow < 280 && spaceAbove > spaceBelow) {
            pos.bottom = window.innerHeight - rect.top + 6;
        } else {
            pos.top = rect.bottom + 6;
        }

        // Horizontal positioning: right align to button, bound by viewport margins
        const idealLeft = rect.right - menuWidth;
        if (idealLeft < 16) {
            pos.left = Math.max(16, rect.left);
        } else if (rect.right + 16 > window.innerWidth) {
            pos.left = window.innerWidth - menuWidth - 16;
        } else {
            pos.left = idealLeft;
        }

        setPosition(pos);
    };

    const toggleMenu = (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (isOpen) {
            setIsOpen(false);
        } else {
            calculatePosition();
            if (onOpen) onOpen();
            setIsOpen(true);
        }
    };

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (
                menuRef.current && !menuRef.current.contains(e.target) &&
                buttonRef.current && !buttonRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        const handleScroll = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', calculatePosition);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', calculatePosition);
        };
    }, [isOpen]);

    return (
        <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
            <button
                ref={buttonRef}
                type="button"
                onClick={toggleMenu}
                aria-label={ariaLabel}
                aria-expanded={isOpen}
                className={buttonClassName || `p-1.5 rounded-xl border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 ${
                    isOpen
                        ? 'bg-bg-hover border-border-subtle text-text-primary shadow-sm'
                        : 'bg-bg-card border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-hover hover:border-border-subtle/80'
                }`}
            >
                <CustomIcon className="w-4 h-4 pointer-events-none" />
            </button>

            {isOpen && typeof document !== 'undefined' && document.body && createPortal(
                <div
                    ref={menuRef}
                    style={position}
                    className="w-[216px] bg-bg-acx-card border border-border-subtle rounded-[14px] shadow-xl p-1.5 z-[9999] animate-in fade-in-50 zoom-in-95 duration-150 text-left"
                    onClick={(e) => e.stopPropagation()}
                >
                    {renderContent ? (
                        renderContent(() => setIsOpen(false))
                    ) : (
                        <div className="space-y-0.5">
                            {items.map((item, idx) => {
                                if (item.type === 'divider') {
                                    return <div key={`div-${idx}`} className="my-1 border-t border-border-subtle/60" />;
                                }
                                if (item.type === 'header') {
                                    return (
                                        <div key={`head-${idx}`} className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                            {item.label}
                                        </div>
                                    );
                                }

                                const Icon = item.icon;
                                const colorClass = item.variant === 'danger'
                                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
                                    : item.variant === 'success'
                                    ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                    : item.variant === 'accent'
                                    ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                                    : item.variant === 'brand'
                                    ? 'text-brand-teal dark:text-[#2DD4BF] hover:bg-brand-teal/10'
                                    : 'text-text-primary hover:bg-bg-hover';

                                return (
                                    <button
                                        key={item.label || idx}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsOpen(false);
                                            item.onClick && item.onClick();
                                        }}
                                        disabled={item.disabled}
                                        className={`flex items-center w-full px-3 py-2 text-xs font-semibold rounded-xl transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none ${colorClass}`}
                                    >
                                        {Icon && <Icon className="w-3.5 h-3.5 mr-2.5 flex-shrink-0" />}
                                        <span className="truncate">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}
