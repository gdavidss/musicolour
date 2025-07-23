// WebGL Fluid Simulation Wrapper for React Integration
// This wraps the original webgl-fluid.js to work with React and piano interactions

import { initializeFluidSimulation } from './webgl-fluid.js';

export function createFluidSimulation(canvas) {
  // Initialize the fluid simulation with our canvas
  const fluidSim = initializeFluidSimulation(canvas);
  
  // Store the splat function reference
  const splatFunction = fluidSim.splat;

  // Track recent splats for brightness adjustment
  const recentSplats = [];
  const SPLAT_WINDOW = 500; // Track splats within last 500ms
  const MAX_SPLATS_BEFORE_DIMMING = 5; // Start dimming after 5 splats
  const MIN_BRIGHTNESS_MULTIPLIER = 0.3; // Minimum brightness when many splats

  // Clean up old splats from tracking
  function cleanupRecentSplats() {
    const now = Date.now();
    const cutoffTime = now - SPLAT_WINDOW;
    
    // Remove splats older than the window
    while (recentSplats.length > 0 && recentSplats[0] < cutoffTime) {
      recentSplats.shift();
    }
  }

  // Calculate brightness multiplier based on recent splat activity
  function calculateBrightnessMultiplier() {
    cleanupRecentSplats();
    
    const splatCount = recentSplats.length;
    
    if (splatCount <= MAX_SPLATS_BEFORE_DIMMING) {
      return 1.0; // Full brightness
    }
    
    // Linear interpolation between 1.0 and MIN_BRIGHTNESS_MULTIPLIER
    // based on splat count between MAX_SPLATS_BEFORE_DIMMING and 3x that value
    const excessSplats = splatCount - MAX_SPLATS_BEFORE_DIMMING;
    const maxExcess = MAX_SPLATS_BEFORE_DIMMING * 2; // When we reach 15 splats
    const dimFactor = Math.min(excessSplats / maxExcess, 1.0);
    
    return 1.0 - (dimFactor * (1.0 - MIN_BRIGHTNESS_MULTIPLIER));
  }

  // Generate color based on excitement level
  function generateExcitementColor(excitementLevel) {
    const hue = Math.random();
    const saturation = excitementLevel; // Direct mapping: 0 = gray, 1 = vibrant
    const brightness = 1.0; // Always max brightness
    
    const c = HSVtoRGB(hue, saturation, brightness);
    
    // First apply the base intensity like the original (0.15)
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;
    
    // Calculate brightness multiplier based on recent splat activity
    const brightnessMultiplier = calculateBrightnessMultiplier();
    
    // Then apply the multiplier like multipleSplats does (10.0)
    // But scale it based on excitement for visibility AND recent activity
    const baseMultiplier = 8.0 + (excitementLevel * 4.0); // Range: 8.0 to 12.0
    const finalMultiplier = baseMultiplier * brightnessMultiplier;
    
    c.r *= finalMultiplier;
    c.g *= finalMultiplier;
    c.b *= finalMultiplier;
    
    return c;
  }

  function HSVtoRGB(h, s, v) {
    let r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);

    switch (i % 6) {
      case 0: r = v, g = t, b = p; break;
      case 1: r = q, g = v, b = p; break;
      case 2: r = p, g = v, b = t; break;
      case 3: r = p, g = q, b = v; break;
      case 4: r = t, g = p, b = v; break;
      case 5: r = v, g = p, b = q; break;
    }

    return { r, g, b };
  }

  // Public API
  return {
    triggerSplat: (excitementLevel) => {
      if (!splatFunction) return;
      
      // Track this splat
      recentSplats.push(Date.now());
      
      // Generate random position and direction
      const x = Math.random();
      const y = Math.random();
      const dx = 1000 * (Math.random() - 0.5);
      const dy = 1000 * (Math.random() - 0.5);
      
      // Generate color based on excitement
      const color = generateExcitementColor(excitementLevel);
      
      // Call the original splat function
      splatFunction(x, y, dx, dy, color);
    },
    
    destroy: () => {
      // Clean up WebGL resources if needed
      // The fluid simulation will handle its own cleanup
    }
  };
} 