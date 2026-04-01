import React from "react";

export default function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-[#0b0f19] font-['Lexend_Deca'] transition-colors duration-300 dark:[color-scheme:dark] overflow-hidden relative">
      
      {/* Ambient Background Glow */}
      <div className="absolute w-64 h-64 bg-[#06D6A0] rounded-full blur-[80px] opacity-10 dark:opacity-20 animate-pulse"></div>

      {/* Loader Container */}
      <div className="relative flex flex-col items-center z-10">
        
        <div className="relative flex items-center justify-center w-24 h-24 mb-8">
          {/* Static Track Ring */}
          <div className="absolute inset-0 border-[4px] border-gray-200 dark:border-gray-800 rounded-full"></div>
          
          {/* Spinning Teal Ring */}
          <div className="absolute inset-0 border-[4px] border-[#06D6A0] rounded-full border-t-transparent animate-spin shadow-[0_0_15px_rgba(6,214,160,0.3)]"></div>
          
          {/* Center Pulsing Icon */}
          <img 
            src="/FundFlow-Favicon.png" 
            alt="FundFlow Logo" 
            className="w-10 h-10 object-contain animate-pulse" 
          />
        </div>

        {/* Brand Text */}
        <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white mb-2">
          <span className="text-[#06D6A0]">Fund</span>Flow
        </h2>
        
        {/* Loading Subtitle */}
        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 tracking-wide uppercase flex items-center gap-1">
          Crunching numbers
          <span className="flex gap-0.5">
            <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </span>
        </p>

      </div>
    </div>
  );
}