import { Loader2, TrendingUp } from "lucide-react";

export default function LoadingScreen({ text = "Loading your financial data…" }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      
      {/* Outer Ring */}
      <div className="relative w-36 h-36">
        <div className="absolute inset-0 rounded-full border-8 border-gray-200 dark:border-gray-700" />
        
        <div className="absolute inset-0 rounded-full border-8 border-transparent border-t-[#06D6A0] border-r-[#118ab2] animate-spin" />
        
        {/* Center Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <TrendingUp className="w-10 h-10 text-[#06D6A0] animate-pulse" />
        </div>
      </div>

      {/* Text */}
      <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base tracking-wide">
        {text}
      </p>
    </div>
  );
}