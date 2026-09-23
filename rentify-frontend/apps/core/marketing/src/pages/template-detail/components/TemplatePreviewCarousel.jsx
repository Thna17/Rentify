import React, { useState, useEffect } from 'react';
import { Button } from "@rentify/shared/ui/button";
import { Badge } from "@rentify/shared/ui/badge";
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TemplatePreviewCarousel = ({ baseUrl, pages, className = '' }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [containerHeight, setContainerHeight] = useState(400);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || !pages?.length) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev === pages.length - 1 ? 0 : prev + 1));
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, pages?.length]);

  // Set initial height based on container
  useEffect(() => {
    const updateHeight = () => {
      const height = window.innerWidth < 768 ? 250 : 450;
      setContainerHeight(height);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const handleNext = () => {
    if (pages?.length) {
      setActiveIndex((prev) => (prev === pages.length - 1 ? 0 : prev + 1));
    }
  };

  const handlePrev = () => {
    if (pages?.length) {
      setActiveIndex((prev) => (prev === 0 ? pages.length - 1 : prev - 1));
    }
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  if (!pages?.length) {
    return (
      <div 
        className="w-full bg-muted/20 rounded-lg flex items-center justify-center text-muted-foreground border border-dashed"
        style={{ height: `${containerHeight}px` }}
      >
        <div className="text-center">
          <div className="text-lg font-medium mb-2">No pages available</div>
          <div className="text-sm text-muted-foreground">
            Add pages to see the preview
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      {/* Main Carousel Container */}
      <div 
        className="relative w-full overflow-hidden rounded-xl border border-border/50 bg-background shadow-lg mb-4" // Added mb-4 for margin bottom
        style={{ height: `${containerHeight}px` }}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="relative w-full h-full"
          >
            {/* Iframe Container */}
            <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
              <div 
                className="absolute inset-0"
                style={{
                  transform: 'scale(0.7)',
                  transformOrigin: 'top left',
                  width: '142.857%',
                  height: '142.857%'
                }}
              >
                <iframe
                  src={`${baseUrl}${pages[activeIndex]?.route}`}
                  className="w-full h-full border-none"
                  title={`Template Preview - ${pages[activeIndex]?.page}`}
                  loading="lazy"
                  sandbox="allow-scripts allow-same-origin"
                  style={{ 
                    pointerEvents: 'auto'
                  }}
                />
              </div>
            </div>

            {/* Page Label */}
            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-sm font-medium border border-white/20">
              {pages[activeIndex]?.page}
            </div>

            {/* Progress Indicator */}
            {isAutoPlaying && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                <motion.div
                  className="h-full bg-blue-600"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 5, ease: "linear" }}
                  key={activeIndex}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Overlay Navigation Arrows */}
        <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            className="w-12 h-12 bg-black/40 backdrop-blur-sm border border-white/20 hover:bg-black/60 hover:border-white/40 text-white rounded-full shadow-lg pointer-events-auto"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="w-12 h-12 bg-black/40 backdrop-blur-sm border border-white/20 hover:bg-black/60 hover:border-white/40 text-white rounded-full shadow-lg pointer-events-auto"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Enhanced Controls - Now always visible and properly positioned */}
      <div className="w-full flex items-center justify-between px-2 bg-transparent">
        {/* Page Info & Dots */}
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="font-normal">
            {activeIndex + 1} / {pages.length}
          </Badge>
          
          <div className="flex items-center gap-1.5">
            {pages?.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  activeIndex === index 
                    ? 'bg-blue-600 scale-125' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to ${pages[index]?.page}`}
              />
            ))}
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleAutoPlay}
            className="w-8 h-8"
            title={isAutoPlaying ? "Pause auto-play" : "Start auto-play"}
          >
            {isAutoPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrev}
              className="w-8 h-8"
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              className="w-8 h-8"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreviewCarousel;