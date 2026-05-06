import React, { createContext, useContext, useState, useEffect } from 'react';

type ScreenSize = 'mobile' | 'tablet' | 'desktop';
type ConnectionType = 'slow' | 'normal' | 'fast';
type PerformanceLevel = 'low' | 'normal' | 'high';

interface AdaptiveContextProps {
  screenSize: ScreenSize;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  connection: ConnectionType;
  performance: PerformanceLevel;
  orientation: 'portrait' | 'landscape';
  isLowEndDevice: boolean;
  shouldReduceMotion: boolean;
}

const AdaptiveContext = createContext<AdaptiveContextProps | undefined>(undefined);

export const AdaptiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');
  const [connection, setConnection] = useState<ConnectionType>('normal');
  const [performance, setPerformance] = useState<PerformanceLevel>('normal');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    // 1. Detect Screen Size
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) setScreenSize('mobile');
      else if (width < 1024) setScreenSize('tablet');
      else setScreenSize('desktop');

      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    // 2. Detect Network (Experimental API)
    const detectNetwork = () => {
      const conn = (navigator as any).connection;
      if (conn) {
        if (conn.saveData || conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g') {
          setConnection('slow');
        } else if (conn.effectiveType === '3g') {
          setConnection('normal');
        } else {
          setConnection('fast');
        }
      }
    };

    // 3. Detect Performance
    const detectPerformance = () => {
      const cores = navigator.hardwareConcurrency || 4;
      const memory = (navigator as any).deviceMemory || 4;
      
      if (cores <= 2 || memory <= 2) {
        setPerformance('low');
      } else if (cores >= 8 && memory >= 8) {
        setPerformance('high');
      } else {
        setPerformance('normal');
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    detectNetwork();
    detectPerformance();

    const conn = (navigator as any).connection;
    if (conn) conn.addEventListener('change', detectNetwork);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (conn) conn.removeEventListener('change', detectNetwork);
    };
  }, []);

  const value: AdaptiveContextProps = {
    screenSize,
    isMobile: screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    isDesktop: screenSize === 'desktop',
    connection,
    performance,
    orientation,
    isLowEndDevice: performance === 'low' || connection === 'slow',
    shouldReduceMotion: performance === 'low' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  };

  return <AdaptiveContext.Provider value={value}>{children}</AdaptiveContext.Provider>;
};

export const useAdaptive = () => {
  const context = useContext(AdaptiveContext);
  if (!context) throw new Error('useAdaptive must be used within an AdaptiveProvider');
  return context;
};
