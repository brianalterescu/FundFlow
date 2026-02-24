import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft, Check, X } from "lucide-react";

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  const steps = [
    {
      img: "./transactions.png",
      title: "Add Transactions 📊",
      description: "Quickly log your income and expenses to keep track of your finances in real time."
    },
    {
      img: "./goals.png",
      title: "Set Up Goals 🎯",
      description: "Create financial goals like savings, emergency funds, or vacations, and track your progress easily."
    },
    {
      img: "./social.png",
      title: "Social Feed 📝",
      description: "Post updates, share tips, or insights with other Fund Flow users in our community."
    },
    {
      img: "./follow.png",
      title: "Connect 👥",
      description: "Follow friends or financial gurus to see their public posts and share financial insights."
    },
    {
      img: "./csv.png",
      title: "Easy Imports 📂",
      description: "Easily import your bank statements via CSV to keep all transactions in one place."
    },
    {
      img: "./wrapped.png",
      title: "Insights 📈",
      description: "Visual charts and your annual 'Wrapped' report help you understand spending trends."
    },
  ];

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      navigate("/dashboard");
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex]);

  const currentStep = steps[currentIndex];
  const isLastStep = currentIndex === steps.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center p-4 font-['Lexend_Deca'] relative overflow-hidden">
      
      {/* Background Decorative Blob */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#06D6A0]/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

      {/* Skip Button */}
      <button 
        onClick={handleSkip}
        className="absolute top-6 right-6 text-gray-500 hover:text-gray-900 dark:hover:text-white transition font-medium z-20"
      >
        Skip
      </button>

      {/* Main Card Container */}
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 relative z-10 animate-in fade-in zoom-in duration-500">
        
        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
          {steps.map((_, index) => (
            <div 
              key={index}
              className={`h-1.5 rounded-full flex-1 transition-colors duration-300 ${
                index <= currentIndex ? "bg-[#06D6A0]" : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>

        {/* Content Area */}
        <div className="flex flex-col items-center text-center min-h-[400px]">
          
          {/* Image */}
          <div className="w-full h-64 mb-8 bg-gray-100 dark:bg-gray-700/50 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner">
            {currentStep.img ? (
              <img 
                src={currentStep.img} 
                alt={currentStep.title} 
                className="w-full h-full object-contain p-4 transition-transform duration-500 hover:scale-105"
              />
            ) : (
              <div className="text-6xl">✨</div>
            )}
          </div>

          {/* Text */}
          <h2 key={currentStep.title + "title"} className="text-3xl font-black mb-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
            {currentStep.title}
          </h2>
          <p key={currentStep.title + "desc"} className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed animate-in slide-in-from-bottom-3 fade-in duration-500">
            {currentStep.description}
          </p>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
          
          {/* Prev Button (Hidden on first step) */}
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition ${currentIndex === 0 ? 'opacity-0 cursor-default' : 'opacity-100'}`}
          >
            <ChevronLeft size={24} />
          </button>

          {/* Indicators text */}
          <span className="text-sm font-medium text-gray-400">
            {currentIndex + 1} / {steps.length}
          </span>

          {/* Next / Finish Button */}
          <button 
            onClick={handleNext}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95
              ${isLastStep ? "bg-[#06D6A0]" : "bg-black dark:bg-white dark:text-black"}
            `}
          >
            {isLastStep ? (
              <>Get Started <Check size={20} /></>
            ) : (
              <>Next <ChevronRight size={20} /></>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Onboarding;