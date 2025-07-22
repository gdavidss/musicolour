import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import FluidCanvas from './FluidCanvas';
import { createFluidSimulation } from './webgl-fluid-wrapper';
import MusicalityEngine, { MODEL_PARAMS } from './musicalityEngine';
import { useAutoplayer, AutoplayerPanel } from './Autoplayer.jsx';

// Initialize Tone.js
Tone.start();

// Piano key data
const PIANO_KEYS = [
  // Octave 4
  { note: 'C4', type: 'white', keyCode: 'KeyQ', color: '#ff6b6b' },
  { note: 'C#4', type: 'black', keyCode: 'Digit2', color: '#4ecdc4' },
  { note: 'D4', type: 'white', keyCode: 'KeyW', color: '#45b7d1' },
  { note: 'D#4', type: 'black', keyCode: 'Digit3', color: '#96ceb4' },
  { note: 'E4', type: 'white', keyCode: 'KeyE', color: '#feca57' },
  { note: 'F4', type: 'white', keyCode: 'KeyR', color: '#ff9ff3' },
  { note: 'F#4', type: 'black', keyCode: 'Digit5', color: '#54a0ff' },
  { note: 'G4', type: 'white', keyCode: 'KeyT', color: '#5f27cd' },
  { note: 'G#4', type: 'black', keyCode: 'Digit6', color: '#00d2d3' },
  { note: 'A4', type: 'white', keyCode: 'KeyY', color: '#ff6348' },
  { note: 'A#4', type: 'black', keyCode: 'Digit7', color: '#ff9ff3' },
  { note: 'B4', type: 'white', keyCode: 'KeyU', color: '#7bed9f' },
  // Octave 5
  { note: 'C5', type: 'white', keyCode: 'KeyI', color: '#70a1ff' },
  { note: 'C#5', type: 'black', keyCode: 'Digit9', color: '#dda0dd' },
  { note: 'D5', type: 'white', keyCode: 'KeyO', color: '#ff7675' },
  { note: 'D#5', type: 'black', keyCode: 'Digit0', color: '#fdcb6e' },
  { note: 'E5', type: 'white', keyCode: 'KeyP', color: '#6c5ce7' }
];

// Piano Component
function PianoKey({ keyData, isPressed, onPress, onRelease }) {
  const isBlack = keyData.type === 'black';
  
  return (
    <div
      className={`
        piano-key cursor-pointer transition-all duration-75 select-none relative
        ${isBlack 
          ? 'bg-gray-900 text-white h-24 w-8 z-20' 
          : 'bg-white text-gray-800 h-36 w-11 border border-gray-300'
        }
        ${isPressed ? (isBlack ? 'bg-gray-700' : 'bg-gray-100') : ''}
        hover:${isBlack ? 'bg-gray-700' : 'bg-gray-50'}
        flex flex-col justify-end items-center pb-2
        shadow-lg hover:shadow-xl
      `}
      onMouseDown={onPress}
      onMouseUp={onRelease}
      onMouseLeave={onRelease}
      style={{
        borderBottomColor: keyData.color,
        borderBottomWidth: isPressed ? '6px' : '3px',
        boxShadow: isBlack 
          ? '0 4px 12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)'
          : '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.8)'
      }}
    >
      <div className="text-xs font-mono opacity-70 font-black">
        {keyData.note}
      </div>
      <div className="text-xs opacity-50 font-bold">
        {keyData.keyCode.replace('Key', '').replace('Digit', '')}
      </div>
    </div>
  );
}

// Helper function to interpolate between two colors
const interpolateColor = (color1, color2, factor) => {
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);
  
  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;
  
  const r2 = (c2 >> 16) & 0xff;
  const g2 = (c2 >> 8) & 0xff;
  const b2 = c2 & 0xff;
  
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

// Smooth color interpolation based on excitement level
const getInterpolatedColor = (level) => {
  // Create a smooth gradient from gray to rainbow spectrum
  // Gray -> Red -> Orange -> Yellow -> Green -> Blue -> Purple
  
  if (level === 0) return '#6c757d'; // Gray when completely bored
  
  // Define rainbow spectrum colors
  const rainbowColors = [
    { pos: 0, color: '#6c757d' },     // Gray
    { pos: 0.16, color: '#ff0000' },  // Red
    { pos: 0.33, color: '#ff8800' },  // Orange
    { pos: 0.5, color: '#ffff00' },   // Yellow
    { pos: 0.66, color: '#00ff00' },  // Green
    { pos: 0.83, color: '#0088ff' },  // Blue
    { pos: 1, color: '#8800ff' }      // Purple
  ];
  
  // Find which two colors we're between
  let color1, color2, localT;
  
  for (let i = 0; i < rainbowColors.length - 1; i++) {
    if (level >= rainbowColors[i].pos && level <= rainbowColors[i + 1].pos) {
      color1 = rainbowColors[i];
      color2 = rainbowColors[i + 1];
      // Calculate local t value between these two colors
      localT = (level - color1.pos) / (color2.pos - color1.pos);
      break;
    }
  }
  
  // If we didn't find a range (shouldn't happen), use the last color
  if (!color1 || !color2) {
    return rainbowColors[rainbowColors.length - 1].color;
  }
  
  return interpolateColor(color1.color, color2.color, localT);
};

// Thermometer Power Bar Component
function PowerBar({ excitement = 0 }) {
  const [displayExcitement, setDisplayExcitement] = useState(excitement);
  const [targetExcitement, setTargetExcitement] = useState(excitement);
  const animationRef = useRef();
  const lastUpdateTime = useRef(Date.now());
  const recentGainRef = useRef(Date.now()); // Initialize to now to prevent immediate red
  const lastExcitementRef = useRef(excitement);
  
  // Constants for animation
  const ANIMATION_SPEED = 0.3; // Units per second (0 to 1 scale)
  
  // Update target when excitement changes
  useEffect(() => {
    setTargetExcitement(excitement);
    
    // Track if we gained excitement
    if (excitement > lastExcitementRef.current) {
      recentGainRef.current = Date.now();
    }
    lastExcitementRef.current = excitement;
  }, [excitement]);
  
  // Smooth animation loop
  useEffect(() => {
    let animationId;
    
    const animate = () => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateTime.current) / 1000; // Convert to seconds
      lastUpdateTime.current = now;
      
      setDisplayExcitement(current => {
        const diff = targetExcitement - current;
        
        // If we're close enough, snap to target
        if (Math.abs(diff) < 0.001) {
          return targetExcitement;
        }
        
        // Calculate movement based on constant speed
        const maxMove = ANIMATION_SPEED * deltaTime;
        const move = Math.sign(diff) * Math.min(Math.abs(diff), maxMove);
        
        return Math.max(0, Math.min(1, current + move));
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
      }, [targetExcitement]);
    
    // Calculate fill height as percentage
    const fillHeight = displayExcitement * 100;
  
  // Determine background color based on delta
  let backgroundTint = 'rgba(0, 0, 0, 0.3)'; // default neutral
  const delta = targetExcitement - displayExcitement;
  const timeSinceGain = Date.now() - recentGainRef.current;
  
  // Color logic
  if (displayExcitement < 0.01) {
    // Gray when excitement is essentially zero
    backgroundTint = 'rgba(100, 100, 100, 0.2)';
  } else if (timeSinceGain < 300) {
    // Show green for 300ms after any gain
    backgroundTint = 'rgba(0, 255, 0, 0.5)';
  } else if (delta < 0 && timeSinceGain > 350) {
    // Show red if we haven't gained in the last 350ms
    backgroundTint = 'rgba(255, 0, 0, 0.3)';
  } else {
    // Default - very subtle black
    backgroundTint = 'rgba(0, 0, 0, 0.2)';
  }

  return (
    <div className="fixed left-0 top-0 h-full z-20" style={{ width: '8px' }}>
      {/* Minimal excitement bar */}
      <div className="relative w-full h-full bg-black bg-opacity-30">
        {/* Negative space indicator */}
        <div
          className="absolute top-0 left-0 right-0"
          style={{
            height: `${100 - fillHeight}%`,
            backgroundColor: backgroundTint,
            transition: 'background-color 0.5s ease-out'
          }}
        />
        {/* Main fill */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: `${fillHeight}%`,
            backgroundColor: 'white'
          }}
        />
      </div>
    </div>
  );
}

function Piano({ onKeyPress, onKeyRelease, pressedKeys }) {
  return (
    <div className="piano-container flex justify-center items-end bg-transparent overflow-visible">
      <div className="relative inline-flex" style={{
        transform: 'perspective(800px) rotateX(5deg)',
        transformStyle: 'preserve-3d'
      }}>
        {PIANO_KEYS.filter(k => k.type === 'white').map((key, index) => (
          <PianoKey
            key={key.note}
            keyData={key}
            isPressed={pressedKeys.has(key.note)}
            onPress={() => onKeyPress(key)}
            onRelease={() => onKeyRelease(key)}
          />
        ))}
        <div className="absolute top-0 left-0 right-0" style={{ pointerEvents: 'none' }}>
          {PIANO_KEYS.filter(k => k.type === 'black').map((key, index) => {
            // Map each black key to the white key it appears after
            const blackKeyAfterWhite = {
              'C#4': 'C4',
              'D#4': 'D4',
              'F#4': 'F4',
              'G#4': 'G4',
              'A#4': 'A4',
              'C#5': 'C5',
              'D#5': 'D5',
            };
            
            const whiteKeys = PIANO_KEYS.filter(k => k.type === 'white');
            const afterWhiteKey = blackKeyAfterWhite[key.note];
            const whiteKeyIndex = whiteKeys.findIndex(wk => wk.note === afterWhiteKey);
            
            // Position black key between white keys
            // Black keys are 32px wide (w-8 = 2rem = 32px), white keys are 44px wide (w-11)
            const offset = (whiteKeyIndex + 1) * 44 - 16; // Position at right edge of white key minus half black key width
            
            return (
              <div
                key={key.note}
                style={{ 
                  left: `${offset}px`, 
                  pointerEvents: 'auto'
                }}
                className="absolute top-0 z-20"
              >
                <PianoKey
                  keyData={key}
                  isPressed={pressedKeys.has(key.note)}
                  onPress={() => onKeyPress(key)}
                  onRelease={() => onKeyRelease(key)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Fluid simulation will replace the 3D effects

function MusicolourApp() {
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const fluidCanvasRef = useRef(null);
  const musicalityEngineRef = useRef(new MusicalityEngine());
  
  // ---------------- TUNABLE PARAMETERS ----------------
  // Simplified parameters for musicality-based system
  const [showDebug, setShowDebug] = useState(false);
  const [showParams, setShowParams] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(true);

  // Autoplayer visibility
  const [showAutoplayer, setShowAutoplayer] = useState(false);
  const [showToggleButton, setShowToggleButton] = useState(false);
  const [showBottomButton, setShowBottomButton] = useState(false);
  const hideButtonTimeout = useRef(null);
  const showButtonTimeout = useRef(null);
  
  const [paramsState, setParamsState] = useState({ ...MODEL_PARAMS });

  const updateParam = (key, value) => {
    MODEL_PARAMS[key] = value;
    setParamsState(prev => ({ ...prev, [key]: value }));
    // Reset only the moving baseline so new parameters take effect smoothly
    if (musicalityEngineRef.current) {
      musicalityEngineRef.current.ema = null;
    }
  };
  
  // MIDI support
  const [midiEnabled, setMidiEnabled] = useState(false);
  const [midiDevices, setMidiDevices] = useState([]);
  const [showMidiStatus, setShowMidiStatus] = useState(false);
  const midiAccessRef = useRef(null);
  const midiStatusTimeout = useRef(null);
  
  const [systemState, setSystemState] = useState({
    excitement: 0, // 0 to 1 scale
    lastKeyPressTime: null,
    musicalityScore: 0,
    musicalityMetrics: {
      melodicCoherence: 0,
      harmonicProgression: 0,
      rhythmicConsistency: 0,
      scaleAdherence: 0,
      phraseStructure: 0,
      dynamicVariation: 0
    }
  });
  
  // Use ref to access current state in callbacks
  const systemStateRef = useRef(systemState);
  useEffect(() => {
    systemStateRef.current = systemState;
  }, [systemState]);

  const pianoRef = useRef(null);

  // MIDI note number to piano key mapping
  // Map all MIDI notes to our available piano keys using modulo
  const getMidiKeyMapping = (noteNumber) => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const noteName = noteNames[noteNumber % 12];
    
    // Map to our available octaves (4 and 5)
    // MIDI notes 48-71 map to octave 4, 72+ map to octave 5
    let octave;
    if (noteNumber < 72) {
      octave = 4;
    } else {
      octave = 5;
    }
    
    const mappedNote = `${noteName}${octave}`;
    
    // Check if this note exists in our piano
    if (PIANO_KEYS.find(k => k.note === mappedNote)) {
      return mappedNote;
    }
    
    // If not (like E5+), wrap back to octave 4
    if (octave === 5 && !PIANO_KEYS.find(k => k.note === mappedNote)) {
      return `${noteName}4`;
    }
    
    return null;
  };

  // Initialize piano with better sound
  useEffect(() => {
    pianoRef.current = new Tone.Sampler({
      urls: {
        C4: "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        A4: "A4.mp3",
      },
      release: 1,
      baseUrl: "https://tonejs.github.io/audio/salamander/",
    }).toDestination();

    // Fallback to synthetic piano if samples don't load
    const synthPiano = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 }
    }).toDestination();

    if (!pianoRef.current.loaded) {
      pianoRef.current = synthPiano;
    }

    return () => {
      if (pianoRef.current) {
        pianoRef.current.dispose();
      }
    };
  }, []);

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Toggle debug with 'D' key
      if (event.code === 'KeyD' && event.shiftKey) {
        setShowDebug(prev => !prev);
        return;
      }
      
      // Toggle keyboard with 'K' key
      if (event.code === 'KeyK' && event.shiftKey) {
        setShowKeyboard(prev => !prev);
        return;
      }

      // Toggle parameters panel with Shift + L
      if (event.code === 'KeyL' && event.shiftKey) {
        setShowParams(prev => !prev);
        return;
      }

      // Toggle autoplayer panel with Shift + ;
      if (event.code === 'Semicolon' && event.shiftKey) {
        setShowAutoplayer(prev => !prev);
        return;
      }
      
      const key = PIANO_KEYS.find(k => k.keyCode === event.code);
      if (key && !pressedKeys.has(key.note)) {
        handleKeyPress(key);
      }
    };

    const handleKeyUp = (event) => {
      const key = PIANO_KEYS.find(k => k.keyCode === event.code);
      if (key) {
        handleKeyRelease(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  });



  // New musicality-based update system
  const updateSystemExcitement = useCallback((noteIndex, velocity = 0.5) => {
    const timestamp = Date.now();
    
    // Process note through musicality engine
    const musicalityResult = musicalityEngineRef.current.processNote(noteIndex, timestamp, velocity);
    
    console.log('Update system excitement:', {
      noteIndex,
      musicalityResult,
      currentExcitement: systemState.excitement,
      timestamp
    });
    
    setSystemState(prev => {
      // Add excitement based on musicality
      const excitementIncrease = musicalityResult.excitement;
      const newExcitement = Math.max(0, Math.min(1, prev.excitement + excitementIncrease));
      
      console.log('State update:', {
        prevExcitement: prev.excitement,
        excitementIncrease,
        newExcitement,
        musicalityScore: musicalityResult.score
      });
      
      return {
        ...prev,
        excitement: newExcitement,
        lastKeyPressTime: timestamp,
        musicalityScore: musicalityResult.score,
        musicalityMetrics: musicalityResult.metrics
      };
    });
  }, []);

  // Simple decay system
  useEffect(() => {
    const decayInterval = setInterval(() => {
      setSystemState(prev => {
        // Decay rate: 0.002 per second, but we're running at 60 FPS
        const decayRatePerSecond = 0.002;
        const decayRatePerFrame = decayRatePerSecond / 60; // Divide by FPS
        const newExcitement = Math.max(0, prev.excitement - decayRatePerFrame);
        
        return {
          ...prev,
          excitement: newExcitement
        };
      });
    }, 16); // 60 FPS

    return () => clearInterval(decayInterval);
  }, []);

  const handleKeyPress = useCallback((key, midiVelocity = null) => {
    if (pressedKeys.has(key.note)) return;
    
    setPressedKeys(prev => new Set([...prev, key.note]));
    
    if (pianoRef.current) {
      pianoRef.current.triggerAttack(key.note);
    }

    const noteIndex = PIANO_KEYS.findIndex(k => k.note === key.note);
    const velocity = midiVelocity || (0.5 + Math.random() * 0.5); // Use MIDI velocity if available, otherwise simulate
    
    // Update system with Pask's adaptive algorithm first
    updateSystemExcitement(noteIndex, velocity);
    
    // Trigger fluid splats based on excitement level
    if (fluidCanvasRef.current) {
      const currentState = systemStateRef.current;
      
      // Determine number of splats based on excitement level
      let numSplats = 1;
      if (currentState.excitement > 0.9) {
        numSplats = 8;
      } else if (currentState.excitement > 0.75) {
        numSplats = 4;
      } else if (currentState.excitement > 0.5) {
        numSplats = 3;
      } else if (currentState.excitement > 0.25) {
        numSplats = 2;
      }
      
      console.log('Triggering splats:', {
        excitement: currentState.excitement,
        numSplats,
        musicalityScore: currentState.musicalityScore
      });
      
      // Trigger multiple splats
      for (let i = 0; i < numSplats; i++) {
        fluidCanvasRef.current.triggerSplat(currentState.excitement);
      }
    } else {
      console.warn('fluidCanvasRef.current is null');
    }
  }, [pressedKeys, updateSystemExcitement]);

  const handleKeyRelease = useCallback((key) => {
    setPressedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(key.note);
      return newSet;
    });
    
    if (pianoRef.current) {
      pianoRef.current.triggerRelease(key.note);
    }
  }, []);

  // Hold latest handler references so MIDI listeners remain valid
  const handleKeyPressRef = useRef(handleKeyPress);
  const handleKeyReleaseRef = useRef(handleKeyRelease);

  // Update refs whenever the callbacks change
  useEffect(() => {
    handleKeyPressRef.current = handleKeyPress;
  }, [handleKeyPress]);

  useEffect(() => {
    handleKeyReleaseRef.current = handleKeyRelease;
  }, [handleKeyRelease]);

  // Initialize MIDI
  useEffect(() => {
    const initMIDI = async () => {
      try {
        if (navigator.requestMIDIAccess) {
          const midiAccess = await navigator.requestMIDIAccess();
          midiAccessRef.current = midiAccess;
          
          // Get connected MIDI devices
          const devices = [];
          for (const input of midiAccess.inputs.values()) {
            devices.push(input.name);
            
            // Set up MIDI event listeners
            input.onmidimessage = (event) => {
              const [status, noteNumber, velocity] = event.data;
              const channel = status & 0x0F;
              const command = status & 0xF0;
              
              // Note on
              if (command === 0x90 && velocity > 0) {
                const noteName = getMidiKeyMapping(noteNumber);
                if (noteName) {
                  const key = PIANO_KEYS.find(k => k.note === noteName);
                  if (key && handleKeyPressRef.current) {
                    handleKeyPressRef.current(key, velocity / 127); // Normalize velocity to 0-1 using latest handler
                  }
                }
              }
              // Note off (or note on with velocity 0)
              else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
                const noteName = getMidiKeyMapping(noteNumber);
                if (noteName) {
                  const key = PIANO_KEYS.find(k => k.note === noteName);
                  if (key && handleKeyReleaseRef.current) {
                    handleKeyReleaseRef.current(key);
                  }
                }
              }
            };
          }
          
          setMidiDevices(devices);
          setMidiEnabled(devices.length > 0);
          
          // Show MIDI status if devices found
          if (devices.length > 0) {
            setShowMidiStatus(true);
            
            // Clear any existing timeout
            if (midiStatusTimeout.current) {
              clearTimeout(midiStatusTimeout.current);
            }
            
            // Hide after 5 seconds
            midiStatusTimeout.current = setTimeout(() => {
              setShowMidiStatus(false);
            }, 5000);
          }
          
          // Listen for device changes
          midiAccess.onstatechange = (event) => {
            console.log('MIDI device state changed:', event.port.name, event.port.state);

            // If a new input is connected, attach the listener
            if (event.port.type === 'input' && event.port.state === 'connected') {
              const input = event.port;
              if (input) {
                input.onmidimessage = (event) => {
                  const [status, noteNumber, velocity] = event.data;
                  const command = status & 0xF0;

                  // Note on
                  if (command === 0x90 && velocity > 0) {
                    const noteName = getMidiKeyMapping(noteNumber);
                    if (noteName) {
                      const key = PIANO_KEYS.find(k => k.note === noteName);
                      if (key && handleKeyPressRef.current) {
                        handleKeyPressRef.current(key, velocity / 127);
                      }
                    }
                  }
                  // Note off
                  else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
                    const noteName = getMidiKeyMapping(noteNumber);
                    if (noteName) {
                      const key = PIANO_KEYS.find(k => k.note === noteName);
                      if (key && handleKeyReleaseRef.current) {
                        handleKeyReleaseRef.current(key);
                      }
                    }
                  }
                };
              }
            }

            // Update device list & status
            const devices = Array.from(midiAccess.inputs.values()).map(input => input.name);
            setMidiDevices(devices);
            setMidiEnabled(devices.length > 0);
          };
        } else {
          console.log('Web MIDI API not supported');
        }
      } catch (error) {
        console.error('Failed to initialize MIDI:', error);
      }
    };
    
    initMIDI();
    
    return () => {
      // Clean up MIDI listeners
      if (midiAccessRef.current) {
        for (const input of midiAccessRef.current.inputs.values()) {
          input.onmidimessage = null;
        }
      }
    };
  }, []); // Run only once on mount

  // ---------------- AUTOPLAYER HOOK ----------------
  // Reuse existing handler refs declared later in the file

  const { autoPlaying, playSong, stopSong } = useAutoplayer(
    handleKeyPressRef,
    handleKeyReleaseRef,
    PIANO_KEYS
  );

  // Clean up any scheduled timeouts on unmount
  useEffect(() => {
    return () => {
      stopSong();
    };
  }, [stopSong]);

  const getMoodData = () => {
    const excitement = systemState.excitement;
    
    if (excitement > 0.7) {
      return { color: getInterpolatedColor(excitement), mood: 'excited' };
    } else if (excitement < 0.2) {
      return { color: getInterpolatedColor(excitement), mood: 'bored' };
    } else {
      return { color: getInterpolatedColor(excitement), mood: 'neutral' };
    }
  };

  // Handle hover for show button
  const handleShowButtonHover = useCallback(() => {
    if (hideButtonTimeout.current) {
      clearTimeout(hideButtonTimeout.current);
    }
    setShowToggleButton(true);
  }, []);

  const handleShowButtonLeave = useCallback(() => {
    if (hideButtonTimeout.current) {
      clearTimeout(hideButtonTimeout.current);
    }
    hideButtonTimeout.current = setTimeout(() => {
      setShowToggleButton(false);
    }, 3000); // 3 seconds delay
  }, []);

  // Show button briefly when keyboard is hidden
  useEffect(() => {
    if (!showKeyboard) {
      // Wait for keyboard animation to complete before showing bottom button
      if (showButtonTimeout.current) {
        clearTimeout(showButtonTimeout.current);
      }
      showButtonTimeout.current = setTimeout(() => {
        setShowBottomButton(true);
        setShowToggleButton(true);
        if (hideButtonTimeout.current) {
          clearTimeout(hideButtonTimeout.current);
        }
        hideButtonTimeout.current = setTimeout(() => {
          setShowToggleButton(false);
        }, 3000);
      }, 1000); // Wait 1 second for keyboard to collapse
    } else {
      // Immediately hide bottom button when keyboard is shown
      setShowBottomButton(false);
      if (showButtonTimeout.current) {
        clearTimeout(showButtonTimeout.current);
      }
    }
  }, [showKeyboard]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hideButtonTimeout.current) {
        clearTimeout(hideButtonTimeout.current);
      }
      if (showButtonTimeout.current) {
        clearTimeout(showButtonTimeout.current);
      }
      if (midiStatusTimeout.current) {
        clearTimeout(midiStatusTimeout.current);
      }
    };
  }, []);

  // Animated tab title
  useEffect(() => {
    const title = "MUSICOLOUR";
    let position = -2; // Start before the wave enters
    
    const animateTitle = () => {
      const titleArray = title.toLowerCase().split('');
      
      // Create wave effect - capitalize 2-3 letters at the wave position
      for (let i = 0; i < titleArray.length; i++) {
        // Create a wave that's 2 letters wide
        if (i === position || i === position + 1) {
          titleArray[i] = titleArray[i].toUpperCase();
        }
      }
      
      document.title = titleArray.join('');
      
      // Move wave position
      position++;
      
      // Reset when wave has passed through
      if (position > title.length) {
        position = -2;
      }
    };
    
    // Initial title
    document.title = title;
    
    // Update every second
    const intervalId = setInterval(animateTitle, 1000);
    
    return () => {
      clearInterval(intervalId);
      document.title = "MUSICOLOUR"; // Reset to normal on unmount
    };
  }, []);

  return (
    <div className="w-full h-screen bg-black relative">
      {/* Header */}
      <div className="absolute top-6 left-20 z-10 text-white">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">MUSICOLOUR</h1>
        <h3 className="font-light tracking-tight">
          By <a href="https://www.linkedin.com/in/gdavidss/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300">Gui Dávid</a>. Inspired by Gordon Pask.
        </h3>
        <div className="text-xs text-gray-300 mt-1">
          Made for the <span className="italic">
            <a
              href="https://partiful.com/e/KAyicRaedj3ORP1WfCsk"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-300"
            >
              San Francisco Cybernetics Symposium
            </a>
          </span>
        </div>
      </div>
      
      {/* Power Bar */}
      <PowerBar excitement={systemState.excitement} />

      {/* MIDI Status */}
      {midiEnabled && (
        <div className={`fixed right-4 top-4 bg-black bg-opacity-70 text-white p-2 rounded-lg z-30 text-xs font-mono transition-opacity duration-1000 ${
          showMidiStatus ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            <span>MIDI Connected</span>
          </div>
          {midiDevices.length > 0 && (
            <div className="text-gray-400 mt-1">
              {midiDevices.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Debug info */}
      {showDebug && (
        <div className={`fixed right-4 ${showMidiStatus ? 'top-24' : 'top-4'} bg-black bg-opacity-70 text-white p-4 rounded-lg z-30 text-xs font-mono transition-all duration-300`}>
          <h3 className="font-bold mb-2">Musicality Metrics</h3>
          <div>Score: {(systemState.musicalityScore || 0).toFixed(3)}</div>
          {Object.entries(systemState.musicalityMetrics).map(([key, value]) => (
            <div key={key}>{key}: {(value || 0).toFixed(3)}</div>
          ))}
        </div>
      )}

      {/* Parameters Panel */}
      {showParams && (
        <div className="fixed right-4 top-4 bg-gray-800 bg-opacity-90 text-white p-4 rounded-lg z-40 text-xs font-mono w-64 max-h-[90vh] overflow-y-auto">
          <h3 className="font-bold mb-3 text-sm">Model Parameters</h3>
          {Object.entries(paramsState).map(([key, val]) => {
            const sliderProps = {
              HISTORY: { min: 8, max: 64, step: 1 },
              IOI_WIN: { min: 4, max: 32, step: 1 },
              VEL_WIN: { min: 4, max: 32, step: 1 },
              CHORD_WINDOW: { min: 50, max: 1000, step: 50 },
              EMA_ALPHA: { min: 0.01, max: 0.5, step: 0.01 },
              BOOST_POS: { min: 0.01, max: 0.2, step: 0.005 },
              BOOST_NEG: { min: 0.005, max: 0.1, step: 0.005 }
            }[key];

            if (!sliderProps) return null;

            return (
              <div key={key} className="mb-3">
                <label className="flex justify-between items-center mb-1">
                  <span>{key}</span>
                  <span className="ml-2 text-right">
                    {typeof val === 'number' ? val.toFixed(2) : val}
                  </span>
                </label>
                <input
                  type="range"
                  className="w-full"
                  value={val}
                  min={sliderProps.min}
                  max={sliderProps.max}
                  step={sliderProps.step}
                  onChange={e => {
                    const num = parseFloat(e.target.value);
                    if (['EMA_ALPHA', 'BOOST_POS', 'BOOST_NEG'].includes(key)) {
                      updateParam(key, num);
                    } else {
                      updateParam(key, Math.round(num));
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Autoplayer Panel */}
      <AutoplayerPanel
        visible={showAutoplayer}
        autoPlaying={autoPlaying}
        playSong={playSong}
        stopSong={stopSong}
      />

      {/* Fluid Canvas */}
      <div className="absolute inset-0" style={{ overflow: 'hidden' }}>
        <FluidCanvas 
          ref={fluidCanvasRef}
          className=""
        />
      </div>

      {/* Piano Interface */}
      <div className={`fixed bottom-0 left-0 right-0 z-20 transition-transform duration-1000 overflow-visible ${showKeyboard ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="p-4 overflow-visible">
          {/* Keyboard Toggle Button */}
          <div className="flex justify-center mb-2">
                          <button
                onClick={() => {
                  setShowKeyboard(!showKeyboard);
                }}
                className="bg-black bg-opacity-50 text-white w-10 h-6 rounded border border-white border-opacity-20 hover:bg-opacity-70 transition-all duration-200 flex items-center justify-center relative group"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 12l-4-4h8z"/>
                </svg>
                {/* Tooltip - hidden when keyboard is hiding */}
                {showKeyboard && (
                  <span className="absolute bottom-full mb-2 px-2 py-1 bg-black bg-opacity-80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    Shift + K
                  </span>
                )}
              </button>
          </div>
          <Piano
            onKeyPress={handleKeyPress}
            onKeyRelease={handleKeyRelease}
            pressedKeys={pressedKeys}
          />
        </div>
      </div>

      {/* Hover area for showing toggle button */}
      {!showKeyboard && showBottomButton && (
        <div 
          className="fixed bottom-0 left-0 right-0 h-32 z-20"
          onMouseEnter={handleShowButtonHover}
          onMouseLeave={handleShowButtonLeave}
        />
      )}

      {/* Show Piano Button (visible when keyboard is hidden) */}
      {!showKeyboard && showBottomButton && (
        <div 
          className="fixed bottom-4 left-0 right-0 flex justify-center z-30"
          onMouseEnter={handleShowButtonHover}
          onMouseLeave={handleShowButtonLeave}
        >
          <button
            onClick={() => setShowKeyboard(true)}
            className={`bg-black bg-opacity-50 text-white w-10 h-6 rounded border border-white border-opacity-20 hover:bg-opacity-70 flex items-center justify-center relative group transition-all duration-300 ${
              showToggleButton ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4l4 4H4z"/>
            </svg>
            {/* Tooltip */}
            <span className="absolute bottom-full mb-2 px-2 py-1 bg-black bg-opacity-80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              Shift + K
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

export default MusicolourApp;