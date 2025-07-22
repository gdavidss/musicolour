// WebGL Fluid Simulation Wrapper for React Integration
// This wraps the original webgl-fluid.js to work with React and piano interactions

import { initializeFluidSimulation } from './webgl-fluid';

export function createFluidSimulation(canvas, onSplat) {
  const { splat,splatStack, destroy } = initializeFluidSimulation(canvas);

  return {
    triggerSplat: (excitement, velocity = 0.75) => {
      const x = Math.random();
      const y = Math.random();
      
      const dx = (Math.random() - 0.5) * 800 * (0.5 + excitement * 0.5) * velocity;
      const dy = (Math.random() - 0.5) * 800 * (0.5 + excitement * 0.5) * velocity;
      
      const r = Math.floor(128 + excitement * 127);
      const g = Math.floor(100 + Math.random() * 100);
      const b = Math.floor(200 - excitement * 150);
      
      splat(x, y, dx, dy, { r: r / 255, g: g / 255, b: b / 255 });

      if (onSplat) {
        onSplat({ x, y, dx, dy, excitement });
      }
    },
    destroy: () => {
      if (destroy) {
        destroy();
      }
    }
  };
} 