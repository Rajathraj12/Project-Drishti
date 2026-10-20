import React from 'react';

interface DrishtiLoaderProps {
  title?: string;
  subtitle?: string;
  fullScreen?: boolean;
}

export default function DrishtiLoader({
  title = "Loading official project data...",
  subtitle = "National Infrastructure Oversight Platform",
  fullScreen = false,
}: DrishtiLoaderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        fullScreen ? "min-h-[70vh] w-full" : "py-20 px-6 w-full"
      }`}
    >
      <div className="relative flex items-center justify-center w-24 h-24 mb-5">
        {/* Animated outer spinning ring */}
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            border: "3.5px solid #dce8f5",
            borderTopColor: "#1a3068",
            borderRightColor: "#2b4fa0",
          }}
        />

        {/* Soft centered circular background backdrop */}
        <div 
          className="absolute rounded-full bg-white shadow-inner"
          style={{ width: 62, height: 62 }}
        />

        {/* Centered Drishti Emblem Logo */}
        <img
          src="/logo.png"
          alt="Project Drishti"
          className="relative z-10 w-12 h-12 object-contain select-none rounded-xl"
        />
      </div>

      <div className="text-base font-bold text-navy-900 tracking-tight mb-1">
        {title}
      </div>
      {subtitle && (
        <div className="text-xs text-slate-500 font-medium tracking-wide">
          {subtitle}
        </div>
      )}
    </div>
  );
}
