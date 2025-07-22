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
      // Use requestAnimationFrame to ensure the canvas has been laid out
      const initSimulation = () => {
        // Initialize the fluid simulation
        simulationRef.current = createFluidSimulation(canvasRef.current);
      };
      
      // Wait for next frame to ensure canvas dimensions are set
      requestAnimationFrame(initSimulation);
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
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%'
      }}
    />
  );
});

FluidCanvas.displayName = 'FluidCanvas';

export default FluidCanvas; 