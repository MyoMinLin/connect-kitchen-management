import React from 'react';

interface IconProps {
    width?: number | string;
    height?: number | string;
    className?: string;
}

export const QRIcon: React.FC<IconProps> = ({ width = 32, height = 32, className }) => (
    <svg viewBox="0 0 24 24" width={width} height={height} className={className}>
        <path fill="currentColor" d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2v-2zm0 4h2v2h-2v-2zm2 2h2v2h-2v-2zm2-2h2v2h-2v-2zm0-4h2v2h-2v-2zm2 2h2v2h-2v-2z" />
    </svg>
);
