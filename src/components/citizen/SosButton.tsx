'use client';

import React from 'react';
import { AlertCircle, Radio } from 'lucide-react';

interface SosButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export function SosButton({ onPress, disabled = false }: SosButtonProps) {
  return (
    <div className="flex flex-col items-center justify-center my-6 relative">
      {/* Ambient Pulsating Rings */}
      <div className="absolute w-72 h-72 rounded-full bg-red-600/10 animate-ping pointer-events-none" style={{ animationDuration: '3.5s' }} />
      <div className="absolute w-60 h-60 rounded-full bg-red-500/20 animate-pulse pointer-events-none" />

      {/* Main Tactical Glass SOS Button */}
      <button
        id="citizen-sos-trigger"
        onClick={onPress}
        disabled={disabled}
        aria-label="Emergency SOS — Press to report an emergency immediately"
        className="relative z-10 w-52 h-52 sm:w-60 sm:h-60 rounded-full sos-button-glow flex flex-col items-center justify-center text-white focus:outline-none focus:ring-4 focus:ring-red-400/80 focus:ring-offset-4 focus:ring-offset-background active:scale-95 transition-all duration-300 group cursor-pointer"
      >
        {/* Subtle Glass Inner Highlight */}
        <div className="absolute inset-2 rounded-full border border-white/30 pointer-events-none" />
        <div className="absolute top-4 w-32 h-16 rounded-full bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />

        <Radio className="w-8 h-8 sm:w-10 sm:h-10 mb-1 text-white/90 animate-pulse" />
        <span className="text-4xl sm:text-5xl font-black tracking-wider text-white drop-shadow-md">
          SOS
        </span>
        <span className="text-xs sm:text-sm font-semibold tracking-widest text-red-100 uppercase mt-1 opacity-90 group-hover:opacity-100 transition-opacity">
          Emergency
        </span>
      </button>

      <p className="mt-8 text-base sm:text-lg font-medium text-slate-300 text-center max-w-xs">
        Press <strong className="text-white font-bold">SOS</strong> to report an emergency.
      </p>

      <div className="flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
        <AlertCircle className="w-3.5 h-3.5 text-cyan-400" />
        <span>One-tap instant AI emergency dispatch</span>
      </div>
    </div>
  );
}
