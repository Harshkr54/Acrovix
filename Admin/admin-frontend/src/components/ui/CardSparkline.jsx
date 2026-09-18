import React from 'react';

export default function CardSparkline({ data = [], color = 'currentColor', isDecorative = false }) {
    if (isDecorative || !data || data.length === 0) {
        // Render a simple decorative wave
        return (
            <div className="absolute right-0 bottom-0 pointer-events-none overflow-hidden h-16 w-32 opacity-30">
                <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full" style={{ fill: 'none', stroke: color, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                    <path d="M 0 20 C 10 10, 20 10, 30 20 C 40 30, 50 30, 60 20 C 70 10, 80 10, 90 20 C 100 30, 110 30, 120 20" />
                    <path d="M 0 20 C 10 10, 20 10, 30 20 C 40 30, 50 30, 60 20 C 70 10, 80 10, 90 20 C 100 30, 110 30, 120 20" fill={color} fillOpacity="0.1" stroke="none" />
                </svg>
            </div>
        );
    }

    // Render real sparkline
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min;
    
    const height = 30;
    const width = 100;
    
    // Normalize data points
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / (range || 1)) * height * 0.8 - (height * 0.1); // Add 10% padding
        return `${x},${y}`;
    }).join(' ');

    const pathData = `M ${points}`;
    const fillPathData = `M 0,${height} L ${points} L ${width},${height} Z`;

    return (
        <div className="absolute right-0 bottom-0 pointer-events-none overflow-hidden h-16 w-32 opacity-40">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
                <path d={fillPathData} fill={color} fillOpacity="0.1" stroke="none" />
                <path d={pathData} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>
    );
}
