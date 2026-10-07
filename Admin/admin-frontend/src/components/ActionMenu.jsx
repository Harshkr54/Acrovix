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
                <CustomIcon className="w-[18px] h-[18px]" />
            </button>

            {isOpen && typeof document !== 'undefined' && document.body && createPortal(
                <div
                    ref={menuRef}
                    style={position}
                    className="w-[216px] bg-bg-card border border-border-subtle rounded-[14px] shadow-xl p-1.5 z-[9999] animate-modal-entrance text-left"
                    onClick={(e) => e.stopPropagation()}
                >
                    {renderContent ? (
                        renderContent(() => setIsOpen(false))
                    ) : (
                        <div className="space-y-0">
                            {items.map((item, idx) => {
                                if (item.type === 'divider') {
                                    return <div key={`div-${idx}`} className="my-1 border-t border-[#E5E7EB]" />;
                                }
                                if (item.type === 'header') {
                                    return (
                                        <div key={`head-${idx}`} className="px-[10px] py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                            {item.label}
                                        </div>
                                    );
                                }

                                const Icon = item.icon;
                                
                                const hoverBg = item.disabled ? 'hover:bg-transparent' : 
                                                (item.variant === 'danger' ? 'hover:bg-[#DC2626]/[0.08]' : 
                                                 (item.variant === 'success' || item.variant === 'brand') ? 'hover:bg-[rgba(13,148,136,0.08)]' : 
                                                 item.variant === 'accent' ? 'hover:bg-[#6D28D9]/[0.08]' : 
                                                 'hover:bg-[#F3F7FA]');

                                const activeBg = item.disabled ? '' : 'active:bg-[rgba(37,99,235,0.10)]';

                                const textColor = item.variant === 'danger' ? 'text-[#DC2626]' :
                                                  (item.variant === 'success' || item.variant === 'brand') ? 'text-[#0D9488]' :
                                                  item.variant === 'accent' ? 'text-[#6D28D9]' :
                                                  'text-[#0B192C]';

                                const colorClass = `${textColor} ${hoverBg} ${activeBg}`;

                                return (
                                    <button
                                        key={item.label || idx}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (item.disabled) return;
                                            setIsOpen(false);
                                            item.onClick && item.onClick();
                                        }}
                                        disabled={item.disabled}
                                        className={`flex items-center w-full px-[10px] py-[8px] min-h-[38px] gap-[10px] rounded-[8px] text-[13px] font-semibold bg-transparent transition-colors duration-150 ease-in-out disabled:opacity-[0.45] disabled:cursor-not-allowed focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(37,99,235,0.35)] focus-visible:-outline-offset-2 ${colorClass}`}
                                    >
                                        {Icon && <Icon className="w-[18px] h-[18px] flex-shrink-0" />}
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
