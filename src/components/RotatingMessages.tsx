import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { useAdaptive } from '../hooks/useAdaptive';

const MESSAGES = [
  "La transparence est une responsabilité spirituelle",
  "La solidarité est une force, la rigueur est une bénédiction",
  "Servir la communauté est un acte de foi",
  "La discipline dans la gestion est une forme de respect",
  "La transparence est une responsabilité", // From user prompt
  "Système de Gestion – Daara M." // From user prompt
];

export const RotatingMessages = () => {
  const { performance, isMobile } = useAdaptive();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Slower interval for low-end devices to conserve CPU
    const delay = performance === 'low' ? 10000 : 6000;
    
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % MESSAGES.length);
        setIsVisible(true);
      }, 500);
    }, delay);

    return () => clearInterval(interval);
  }, [performance]);

  return (
    <div className={`bg-white border border-dmn-green-200 rounded-[2rem] sm:rounded-3xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8 relative overflow-hidden ${isMobile ? 'mx-4' : ''}`}>
      {/* Decorative background pattern */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-dmn-green-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-dmn-gold-light/10 rounded-full -ml-12 -mb-12 opacity-50"></div>
      
      <div className="flex flex-col items-center justify-center text-center relative z-10 min-h-[50px] sm:min-h-[60px]">
        <Star size={isMobile ? 16 : 20} className="text-dmn-gold-light mb-2 sm:mb-3 opacity-80" />
        <div className={`transition-opacity duration-500 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-[13px] sm:text-lg md:text-xl font-heading italic font-black text-dmn-green-900 px-2 uppercase tracking-tight">
            "{MESSAGES[currentIndex]}"
          </p>
        </div>
      </div>
    </div>
  );
};
