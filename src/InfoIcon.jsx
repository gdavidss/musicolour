import React, { useState } from 'react';
import { SHORTCUTS_CARD } from './TutorialCards';

export function InfoIcon({ showParams, showDebug }) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [hovering, setHovering] = useState(false);

  // Don't show icon when params or debug are visible
  if (showParams || showDebug) {
    return null;
  }

  return (
    <>
      {/* Hover area in top-right corner */}
      <div 
        className="fixed top-0 right-0 w-24 h-24"
        style={{ zIndex: 99 }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      />
      
      {/* Info button - same style and position as tutorial X button */}
      <button
        onClick={() => setShowShortcuts(!showShortcuts)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className={`fixed top-8 right-8 text-white text-4xl transition-all duration-200 hover:scale-110 ${
          hovering ? 'opacity-100' : 'opacity-0'
        } hover:text-gray-300`}
        style={{ 
          zIndex: 100,
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '12px',
          fontFamily: 'Arial, sans-serif',
          lineHeight: '1',
          textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
          fontSize: '32px', // Slightly smaller than X to fit 'i'
          pointerEvents: hovering ? 'auto' : 'none'
        }}
        aria-label="Show keyboard shortcuts"
      >
        i
      </button>

      {/* Shortcuts card - same style as tutorial cards */}
      {showShortcuts && SHORTCUTS_CARD && (
        <>
          {/* Invisible backdrop to capture clicks */}
          <div 
            className="fixed inset-0" 
            style={{ zIndex: 98 }}
            onClick={() => setShowShortcuts(false)}
          />
          
          {/* The shortcuts card */}
          <div 
            className="fixed text-white"
            style={{ 
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              zIndex: 99,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              padding: '48px',
              maxWidth: '800px',
              textAlign: 'center',
              textShadow: '0 2px 20px rgba(0, 0, 0, 0.8), 0 1px 3px rgba(0, 0, 0, 0.9)',
              opacity: 1,
              animation: 'fadeInNoMove 0.3s ease-out'
            }}
          >
            <div>
              {SHORTCUTS_CARD.title && (
                <h3 className="text-xl font-medium mb-6 text-gray-300 uppercase tracking-wider">{SHORTCUTS_CARD.title}</h3>
              )}
              {SHORTCUTS_CARD.content}
            </div>
          </div>
        </>
      )}
    </>
  );
} 