import React, { useState, useEffect, useRef } from 'react';

const CARDS = [
  {
    id: 'welcome',
    content: (
      <div className="space-y-4">
        <p className="text-4xl font-light">Welcome to Musicolour</p>
        <p className="text-xl text-gray-300 animate-pulse">Click anywhere or press any key to start</p>
      </div>
    )
  },
  {
    id: 'behavior1',
    content: (
      <div className="space-y-4">
        <p className="text-3xl font-light leading-relaxed">
          The better you play,<br />the more colorful it gets
        </p>
        <p className="text-lg text-gray-400">A demo is now playing</p>
      </div>
    )
  },
  {
    id: 'behavior2',
    content: (
      <div className="space-y-4">
        <p className="text-2xl font-light">
          The bar shows the machine's excitement
        </p>
        <div className="flex items-center gap-4 text-xl">
          <span className="text-green-400">Green</span>
          <span className="text-gray-400">=</span>
          <span>You're playing something good</span>
        </div>
        <div className="flex items-center gap-4 text-xl">
          <span className="text-red-400">Red</span>
          <span className="text-gray-400">=</span>
          <span>Try something different</span>
        </div>
      </div>
    )
  },
  {
    id: 'feedback',
    content: (
      <p className="text-3xl font-light leading-relaxed">
        It learns from your rhythm<br />and responds with movement
      </p>
    )
  },
  {
    id: 'conversation',
    content: (
      <p className="text-3xl font-light leading-relaxed">
        You're having a <a href="https://en.wikipedia.org/wiki/Conversation_theory" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300">conversation</a><br />with a machine through music
      </p>
    )
  },
  {
    id: 'shortcuts',
    title: 'Quick shortcuts',
    content: (
      <div className="space-y-2 text-lg">
        <div className="flex items-center gap-3">
          <kbd className="px-2 py-1 bg-white bg-opacity-20 rounded text-base font-mono">Shift + K</kbd>
          <span>Toggle keyboard</span>
        </div>
        <div className="flex items-center gap-3">
          <kbd className="px-2 py-1 bg-white bg-opacity-20 rounded text-base font-mono">Shift + M</kbd>
          <span>Replay tutorial</span>
        </div>
        <div className="flex items-center gap-3">
          <kbd className="px-2 py-1 bg-white bg-opacity-20 rounded text-base font-mono">Shift + L</kbd>
          <span>Model parameters</span>
        </div>
        <div className="flex items-center gap-3">
          <kbd className="px-2 py-1 bg-white bg-opacity-20 rounded text-base font-mono">Shift + P</kbd>
          <span>Load MIDI file</span>
        </div>
      </div>
    )
  },
  {
    id: 'credits',
    title: 'Credits',
    content: (
      <div className="space-y-3 text-xl">
        <div className="text-gray-300">
          <span className="text-white">Built by</span> Gui Dávid
        </div>
        <div className="text-gray-300">
          <span className="text-white">Improved by</span> Igor Rocha
        </div>
        <div className="text-gray-300">
          <span className="text-white">Fluids by</span> Pavel Dobryakov
        </div>
        <div className="text-gray-300">
          <span className="text-white">Inspired by</span> Gordon Pask
        </div>
      </div>
    )
  }
];

// Export shortcuts card for reuse
export const SHORTCUTS_CARD = CARDS.find(card => card.id === 'shortcuts');

export function TutorialCards({ onComplete, onSkip }) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const mountTimeRef = useRef(Date.now());
  const completedRef = useRef(false);

  // Mark tutorial as seen in localStorage
  const markTutorialAsSeen = () => {
    try {
      localStorage.setItem('musicolour-tutorial-seen', 'true');
    } catch (e) {
      console.error('Failed to save tutorial state:', e);
    }
  };

  useEffect(() => {
    // Component initialization
    
    // Initial fade in
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    // Card rotation
    const rotateCards = () => {
      const elapsed = Date.now() - mountTimeRef.current;
      const totalDuration = CARDS.length * 7300; // 7s per card + 300ms transition
      
      if (elapsed >= totalDuration && !completedRef.current) {
        completedRef.current = true;
        setIsActive(false);
        markTutorialAsSeen(); // Save to localStorage
        if (onComplete) {
          onComplete();
        }
        return;
      }

      const currentCard = Math.floor(elapsed / 7300);
      const timeInCurrentCard = elapsed % 7300;
      
      if (currentCard < CARDS.length) {
        setCurrentCardIndex(currentCard);
        setIsVisible(timeInCurrentCard < 7000); // Show for 7s, hide for 300ms
      }
    };

    const animationFrame = setInterval(rotateCards, 50);

    return () => {
      clearTimeout(showTimer);
      clearInterval(animationFrame);
    };
  }, []); // Empty dependency array - only run once

  if (!isActive || currentCardIndex >= CARDS.length) return null;

  const currentCard = CARDS[currentCardIndex];

  return (
    <>
      {/* Skip button */}
      <button
        onClick={() => {
          markTutorialAsSeen(); // Save to localStorage when skipped
          onSkip();
        }}
        className="fixed top-8 right-8 text-white text-4xl hover:text-gray-300 transition-all duration-200 hover:scale-110"
        style={{ 
          zIndex: 100000,
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '12px',
          fontFamily: 'Arial, sans-serif',
          lineHeight: '1',
          textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
        }}
        aria-label="Skip tutorial"
      >
        ×
      </button>
      
      {/* Tutorial card */}
      <div 
        className={`fixed text-white transition-all duration-500 ${
          isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-4'
        }`}
        style={{ 
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          zIndex: 99999,
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) ${isVisible ? 'translateY(0)' : 'translateY(-16px)'}`,
          padding: '48px',
          maxWidth: '800px',
          textAlign: 'center',
          textShadow: '0 2px 20px rgba(0, 0, 0, 0.8), 0 1px 3px rgba(0, 0, 0, 0.9)'
        }}
      >
      <div>
        {currentCard.title && (
          <h3 className="text-xl font-medium mb-6 text-gray-300 uppercase tracking-wider">{currentCard.title}</h3>
        )}
        {currentCard.content}
        
        {/* Progress dots */}
        <div className="flex justify-center gap-3 mt-16">
          {CARDS.map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-full transition-all duration-500 ${
                index === currentCardIndex 
                  ? 'bg-white w-12' 
                  : index < currentCardIndex 
                    ? 'bg-white bg-opacity-40 w-3' 
                    : 'bg-white bg-opacity-20 w-3'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
    </>
  );
} 