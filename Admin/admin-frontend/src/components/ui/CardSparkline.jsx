import React, { useId } from 'react';

export default function CardSparkline({ data = [], color = 'currentColor', isDecorative = false }) {
    const uniqueId = useId();
    const gradientId = `sparkline-fade-${uniqueId}`;

    const renderDefs = () => (
        <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.15" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
        </defs>
    );

    if (isDecorative || !data || data.length === 0) {
        // Render a smooth decorative wave
        const wavePath = "M 0 25 C 20 15, 35 25, 50 15 C 65 5, 80 20, 100 15";
        const fillPath = `${wavePath} L 100 40 L 0 40 Z`;

        return (
            <div className="absolute right-0 bottom-0 pointer-events-none overflow-hidden h-[60px] w-[45%] max-w-[140px] opacity-80">
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                    {renderDefs()}
                    <path d={fillPath} fill={`url(#${gradientId})`} stroke="none" />
                    <path d={wavePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        );
    }

    // Render real sparkline with Catmull-Rom or simple smooth curves
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    
    const height = 30;
    const width = 100;
    
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height * 0.7) - (height * 0.15);
        return { x, y };
    });

    // Create a smooth path using bezier curves
    let pathData = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cp1x = prev.x + (curr.x - prev.x) / 3;
        const cp1y = prev.y;
        const cp2x = prev.x + (curr.x - prev.x) * 2 / 3;
        const cp2y = curr.y;
        pathData += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
    }

    const fillPathData = `${pathData} L ${width},40 L 0,40 Z`;

    return (
        <div className="absolute right-0 bottom-0 pointer-events-none overflow-hidden h-[60px] w-[45%] max-w-[140px] opacity-80">
            <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                {renderDefs()}
                <path d={fillPathData} fill={`url(#${gradientId})`} stroke="none" />
                <path d={pathData} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>
    );
}
