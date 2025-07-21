// WebGL Fluid Simulation Wrapper for React Integration
// This wraps the original webgl-fluid.js to work with React and piano interactions

import { initializeFluidSimulation } from './webgl-fluid.js';

export function createFluidSimulation(canvas) {
  // Initialize the fluid simulation with our canvas
  const fluidSim = initializeFluidSimulation(canvas);
  
  // Store the splat function reference
  const splatFunction = fluidSim.splat;

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
    
    // Then apply the multiplier like multipleSplats does (10.0)
    // But scale it based on excitement for visibility
    const multiplier = 8.0 + (excitementLevel * 4.0); // Range: 8.0 to 12.0
    c.r *= multiplier;
    c.g *= multiplier;
    c.b *= multiplier;
    
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