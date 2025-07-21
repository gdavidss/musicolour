import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

// Import the adapted fluid simulation
import { createFluidSimulation } from './webgl-fluid-wrapper';

const FluidCanvas = forwardRef(({ className }, ref) => {
  const canvasRef = useRef(null);
  const simulationRef = useRef(null);

  useImperativeHandle(ref, () => ({
    triggerSplat: (excitementLevel) => {
      if (simulationRef.current) {
        simulationRef.current.triggerSplat(excitementLevel);
      }
    }
  }));

  useEffect(() => {
    if (canvasRef.current) {
      // Initialize the fluid simulation
      simulationRef.current = createFluidSimulation(canvasRef.current);
    }

    return () => {
      // Cleanup
      if (simulationRef.current) {
        simulationRef.current.destroy();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%' }}
    />
  );
});

FluidCanvas.displayName = 'FluidCanvas';

export default FluidCanvas; 