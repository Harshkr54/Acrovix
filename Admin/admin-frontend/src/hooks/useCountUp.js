import { useState, useEffect } from 'react';

/**
 * useCountUp hook for smoothly animating a number from 0 to a target value.
 * Safely handles null, undefined, zero, decimals, and respects prefers-reduced-motion.
 * @param {number} end - The target number.
 * @param {number} duration - Animation duration in milliseconds.
 * @returns {number} The current animating number.
 */
export function useCountUp(end, duration = 600) {
    const safeEnd = parseFloat(end);
    const target = isNaN(safeEnd) ? 0 : safeEnd;
    
    const [count, setCount] = useState(0);

    useEffect(() => {
        // Respect prefers-reduced-motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (target === 0 || prefersReducedMotion) {
            setCount(target);
            return;
        }

        let startTime = null;
        let animationFrameId;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);
            
            // Ease out cubic
            const easeOutProgress = 1 - Math.pow(1 - percentage, 3);
            
            setCount(target * easeOutProgress);

            if (progress < duration) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                setCount(target);
            }
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [target, duration]);

    return count;
}
