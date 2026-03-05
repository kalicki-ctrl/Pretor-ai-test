// Performance monitoring utilities
export const performanceMonitor = {
  // Monitor frame rate
  monitorFPS: () => {
    let frames = 0;
    let lastTime = performance.now();
    
    const checkFPS = () => {
      frames++;
      const now = performance.now();
      
      if (now >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (now - lastTime));
        if (fps < 30) {
          console.warn(`🐌 Low FPS detected: ${fps}fps`);
        }
        frames = 0;
        lastTime = now;
      }
      
      requestAnimationFrame(checkFPS);
    };
    
    if (process.env.NODE_ENV === 'development') {
      requestAnimationFrame(checkFPS);
    }
  },

  // Optimize animations based on device performance
  getOptimizedAnimationSettings: () => {
    const isLowEnd = navigator.hardwareConcurrency <= 2 || 
                     /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    return {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      animationDuration: isLowEnd ? 0.15 : 0.3,
      enableBlur: !isLowEnd,
      enableShadows: !isLowEnd
    };
  }
};

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development') {
  performanceMonitor.monitorFPS();
}