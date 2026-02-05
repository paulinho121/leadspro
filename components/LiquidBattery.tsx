
import React from 'react';

interface LiquidBatteryProps {
    percentage: number;
    isScanning?: boolean;
    label?: string;
    subLabel?: string;
}

const LiquidBattery: React.FC<LiquidBatteryProps> = ({ percentage, isScanning = false, label, subLabel }) => {
    // Ensure percentage is between 0 and 100
    const fillLevel = Math.max(0, Math.min(100, percentage));

    return (
        <div className="relative w-full h-full min-h-[160px] flex items-center justify-center overflow-hidden rounded-[2rem] glass border border-white/5 group">
            {/* Liquid Container */}
            <div className="absolute inset-x-0 bottom-0 top-0 overflow-hidden rounded-[2rem]">
                {/* Liquid Wave Background */}
                <div
                    className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-primary/80 to-cyan-400/60 transition-all duration-700 ease-out"
                    style={{ height: `${fillLevel}%` }}
                >
                    {/* Wave Animation */}
                    <div className="absolute top-[-10px] left-0 w-[200%] h-6 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjAwIDEyMCIgcHJlc2VydmVBc3BlY3RSYXRpbz0ibm9uZSI+PHBhdGggZD0iTTAgMGw0OCAzMGM0OCAzMCA5NiAzMCAxNDQgMHMxNDQtMzAgMTkyIDAgMTkyIDMwIDI0MCAwIDI0MC0zMCAyODgtMzAgbDQ4IDMwVjE1MEgwVjB6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuNCkiLz48L3N2Zz4=')] bg-repeat-x bg-[length:50%_100%] animate-wave opacity-70"></div>
                </div>
            </div>

            {/* Content Overlay */}
            <div className="relative z-10 text-center mix-blend-plus-lighter">
                {isScanning && (
                    <div className="mb-2 animate-bounce">
                        <span className="inline-block w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white]"></span>
                    </div>
                )}
                <div className="text-4xl font-black text-white drop-shadow-lg tracking-tighter">
                    {Math.floor(fillLevel)}%
                </div>
                {label && (
                    <div className="text-xs font-bold text-white/90 uppercase tracking-widest mt-1 drop-shadow-md">
                        {label}
                    </div>
                )}
                {subLabel && (
                    <div className="text-[10px] font-mono text-white/70 mt-1 uppercase">
                        {subLabel}
                    </div>
                )}
            </div>

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        </div>
    );
};

export default LiquidBattery;
