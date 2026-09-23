import { useState, useEffect } from 'react';

/**
 * Type definition for responsive screen sizes
 */
interface ScreenSize {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

/**
 * Custom hook to detect responsive screen size
 * Returns boolean flags for mobile, tablet, and desktop
 */
export function useResponsive(): ScreenSize {
  const [screenSize, setScreenSize] = useState<ScreenSize>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  });

  useEffect(() => {
    // Function to check and update screen size
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setScreenSize({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
      });
    };

    // Initial check
    checkScreenSize();

    // Listen for window resize events
    window.addEventListener('resize', checkScreenSize);

    // Cleanup listener on unmount
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return screenSize;
}
