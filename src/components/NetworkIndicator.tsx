import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetwork } from '../hooks/useNetwork';

export const NetworkIndicator = () => {
  const { isOnline, isSlow } = useNetwork();

  if (isOnline && !isSlow) return null;

  return (
    <div className={`fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all ${
      !isOnline 
        ? 'bg-red-500/90 text-white border border-red-400' 
        : 'bg-amber-500/90 text-white border border-amber-400'
    }`}>
      {!isOnline ? (
        <>
          <WifiOff size={14} />
          Hors ligne
        </>
      ) : (
        <>
          <Wifi size={14} className="animate-pulse" />
          Connexion faible
        </>
      )}
    </div>
  );
};
