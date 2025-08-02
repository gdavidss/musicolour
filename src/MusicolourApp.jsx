import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import FluidCanvas from './FluidCanvas';
// import { createFluidSimulation } from './webgl-fluid-wrapper';
import MusicalityEngine, { MODEL_PARAMS } from './musicalityEngine';
import { useAutoplayer, AutoplayerPanel } from './Autoplayer.jsx';
import { TutorialCards } from './TutorialCards.jsx';
import { InfoIcon } from './InfoIcon.jsx';

// Initialize Tone.js
Tone.start();

// Piano key data – generate a fixed 61-key range (C2-C7).
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const START_MIDI = 36; // C2
const KEY_COUNT = 61;   // Up to C7 inclusive

const QWERTY_MAPPING = {
  C4: 'KeyQ', 'C#4': 'Digit2', D4: 'KeyW', 'D#4': 'Digit3', E4: 'KeyE',
  F4: 'KeyR', 'F#4': 'Digit5', G4: 'KeyT', 'G#4': 'Digit6', A4: 'KeyY',
  'A#4': 'Digit7', B4: 'KeyU', C5: 'KeyI', 'C#5': 'Digit9', D5: 'KeyO',
  'D#5': 'Digit0', E5: 'KeyP'
};

const generatePianoKeys = () => {
  const keys = [];
  for (let i = 0; i < KEY_COUNT; i++) {
    const midi = START_MIDI + i;
    const octave = Math.floor(midi / 12) - 1;
    const name = NOTE_NAMES[midi % 12];
    const note = `${name}${octave}`;
    const isBlack = name.includes('#');
    keys.push({
      note,
      type: isBlack ? 'black' : 'white',
      keyCode: QWERTY_MAPPING[note] || '',
      color: isBlack ? '#444' : '#ccc'
    });
  }
  return keys;
};

const PIANO_KEYS = generatePianoKeys();

// Piano Component
function PianoKey({ keyData, isPressed, onPress, onRelease, midiEnabled }) {
  const isBlack = keyData.type === 'black';

  // Dimensions change based on whether MIDI is connected
  const WHITE_KEY_WIDTH = midiEnabled ? 24 : 36;
  const BLACK_KEY_WIDTH = midiEnabled ? 14 : 24;
  const WHITE_KEY_HEIGHT = midiEnabled ? 140 : 180;
  const BLACK_KEY_HEIGHT = midiEnabled ? 90 : 120;

  return (
    <div
      className={`piano-key cursor-pointer transition-all duration-75 select-none relative flex flex-col justify-end items-center pb-1 shadow-md hover:shadow-lg ${isBlack ? 'z-20' : ''}`}
      onMouseDown={onPress}
      onMouseUp={onRelease}
      onMouseLeave={onRelease}
      style={{
        width: isBlack ? `${BLACK_KEY_WIDTH}px` : `${WHITE_KEY_WIDTH}px`,
        height: isBlack ? `${BLACK_KEY_HEIGHT}px` : `${WHITE_KEY_HEIGHT}px`,
        backgroundColor: isBlack ? (isPressed ? '#333' : '#111') : (isPressed ? '#eee' : '#fff'),
        color: isBlack ? '#fff' : '#000',
        border: isBlack ? '1px solid #000' : '1px solid #ccc',
        borderBottomColor: keyData.color,
        borderBottomWidth: isPressed ? '4px' : '2px',
        boxShadow: isBlack
          ? '0 2px 6px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)'
          : '0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.8)'
      }}
    >
      <div className={`${midiEnabled ? 'text-[8px]' : 'text-xs'} font-mono opacity-70 font-bold select-none`}>
        {keyData.note}
      </div>
      {keyData.keyCode && (
        <div className={`${midiEnabled ? 'text-[8px]' : 'text-[10px]'} opacity-50 font-bold select-none`}>
          {keyData.keyCode.replace('Key', '').replace('Digit', '')}
        </div>
      )}
    </div>
  );
}

// Unused color interpolation functions - might be useful for future color features
// const interpolateColor = (color1, color2, factor) => {
//   const c1 = parseInt(color1.slice(1), 16);
//   const c2 = parseInt(color2.slice(1), 16);
//   
//   const r1 = (c1 >> 16) & 0xff;
//   const g1 = (c1 >> 8) & 0xff;
//   const b1 = c1 & 0xff;
//   
//   const r2 = (c2 >> 16) & 0xff;
//   const g2 = (c2 >> 8) & 0xff;
//   const b2 = c2 & 0xff;
//   
//   const r = Math.round(r1 + (r2 - r1) * factor);
//   const g = Math.round(g1 + (g2 - g1) * factor);
//   const b = Math.round(b1 + (b2 - b1) * factor);
//   
//   return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
// };

// const getInterpolatedColor = (level) => {
//   // Create a smooth gradient from gray to rainbow spectrum
//   // Gray -> Red -> Orange -> Yellow -> Green -> Blue -> Purple
//   
//   if (level === 0) return '#6c757d'; // Gray when completely bored
//   
//   // Define rainbow spectrum colors
//   const rainbowColors = [
//     { pos: 0, color: '#6c757d' },     // Gray
//     { pos: 0.16, color: '#ff0000' },  // Red
//     { pos: 0.33, color: '#ff8800' },  // Orange
//     { pos: 0.5, color: '#ffff00' },   // Yellow
//     { pos: 0.66, color: '#00ff00' },  // Green
//     { pos: 0.83, color: '#0088ff' },  // Blue
//     { pos: 1, color: '#8800ff' }      // Purple
//   ];
//   
//   // Find which two colors we're between
//   let color1, color2, localT;
//   
//   for (let i = 0; i < rainbowColors.length - 1; i++) {
//     if (level >= rainbowColors[i].pos && level <= rainbowColors[i + 1].pos) {
//       color1 = rainbowColors[i];
//       color2 = rainbowColors[i + 1];
//       // Calculate local t value between these two colors
//       localT = (level - color1.pos) / (color2.pos - color1.pos);
//       break;
//     }
//   }
//   
//   // If we didn't find a range (shouldn't happen), use the last color
//   if (!color1 || !color2) {
//     return rainbowColors[rainbowColors.length - 1].color;
//   }
//   
//   return interpolateColor(color1.color, color2.color, localT);
// };

// Thermometer Power Bar Component
function PowerBar({ excitement = 0 }) {
  const [displayExcitement, setDisplayExcitement] = useState(excitement);
  const [targetExcitement, setTargetExcitement] = useState(excitement);
  // const animationRef = useRef();
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
            transition: 'background-color 0.5s ease-out',
            borderRadius: '999px'
          }}
        />
        {/* Main fill */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: `${fillHeight}%`,
            backgroundColor: 'white',
            borderRadius: '999px'
          }}
        />
      </div>
    </div>
  );
}

function Piano({ onKeyPress, onKeyRelease, pressedKeys, midiEnabled }) {
  // Use larger dimensions when showing only QWERTY keys
  const WHITE_KEY_WIDTH = midiEnabled ? 24 : 36;
  const BLACK_KEY_WIDTH = midiEnabled ? 14 : 24;

  // If no MIDI is connected, show only keys with QWERTY mappings
  const keysToShow = midiEnabled ? PIANO_KEYS : PIANO_KEYS.filter(k => k.keyCode !== '');
  
  const whiteKeys = keysToShow.filter(k => k.type === 'white');
  const blackKeys = keysToShow.filter(k => k.type === 'black');

  return (
    <div className="piano-container flex justify-center items-end bg-transparent overflow-visible">
      <div className="relative inline-flex" style={{
        transform: 'perspective(800px) rotateX(5deg)',
        transformStyle: 'preserve-3d'
      }}>
        {whiteKeys.map((key) => (
          <PianoKey
            key={key.note}
            keyData={key}
            isPressed={pressedKeys.has(key.note)}
            onPress={() => onKeyPress(key)}
            onRelease={() => onKeyRelease(key)}
            midiEnabled={midiEnabled}
          />
        ))}
        {/* Render black keys using absolute positioning */}
        <div className="absolute top-0 left-0" style={{ pointerEvents: 'none' }}>
          {blackKeys.map((key) => {
            // Count white keys that come before this black key in the filtered set
            const indexInAll = keysToShow.findIndex(k => k.note === key.note);
            const whiteBefore = keysToShow.slice(0, indexInAll).filter(k => k.type === 'white').length;
            const offset = whiteBefore * WHITE_KEY_WIDTH - (BLACK_KEY_WIDTH / 2);

            return (
              <div
                key={key.note}
                style={{ left: `${offset}px`, pointerEvents: 'auto' }}
                className="absolute top-0 z-20"
              >
                <PianoKey
                  keyData={key}
                  isPressed={pressedKeys.has(key.note)}
                  onPress={() => onKeyPress(key)}
                  onRelease={() => onKeyRelease(key)}
                  midiEnabled={midiEnabled}
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
  
  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(false);
  
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
  const fileInputRef = useRef(null);
  
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

  /* ---------------- MIDI Sustain Pedal Support ---------------- */
  // Whether the pedal is currently held (CC 64 >= 64)
  const sustainActiveRef = useRef(false);
  // Notes that have received a Note Off while the pedal was held. They will be
  // released en-masse once the pedal is lifted.
  const sustainedNotesRef = useRef(new Set());

  // Simpler MIDI file parser focused on extracting notes
  const parseMidiFile = async (file) => {
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    
    // Basic MIDI file validation
    const header = String.fromCharCode(...data.slice(0, 4));
    if (header !== 'MThd') {
      throw new Error('Invalid MIDI file');
    }
    
    // Read header info
    const format = (data[8] << 8) | data[9];
    const numTracks = (data[10] << 8) | data[11];
    const division = (data[12] << 8) | data[13];
    
    console.log('MIDI format:', format, 'tracks:', numTracks, 'division:', division);
    
    // Simple approach: look for all Note On events (0x9n) in the file
    const notes = [];
    let ticksPerQuarter = division & 0x7FFF;
    let microsecondsPerQuarter = 500000; // Default 120 BPM
    
    // Scan entire file for note events
    let i = 14; // Skip header
    let currentTime = 0;
    
    while (i < data.length - 4) {
      // Look for MTrk
      if (data[i] === 0x4D && data[i+1] === 0x54 && data[i+2] === 0x72 && data[i+3] === 0x6B) {
        i += 4;
        const trackLen = (data[i] << 24) | (data[i+1] << 16) | (data[i+2] << 8) | data[i+3];
        i += 4;
        
        const trackEnd = i + trackLen;
        let trackTime = 0;
        let lastStatus = 0;
        
        while (i < trackEnd && i < data.length) {
          // Read variable length delta time
          let delta = 0;
          let byte;
          do {
            if (i >= data.length) break;
            byte = data[i++];
            delta = (delta << 7) | (byte & 0x7F);
          } while (byte & 0x80);
          
          trackTime += delta;
          
          if (i >= data.length) break;
          
          // Get status byte
          let status = data[i];
          if (status < 0x80) {
            // Running status
            status = lastStatus;
          } else {
            lastStatus = status;
            i++;
          }
          
          // Check for Note On
          if ((status & 0xF0) === 0x90 && i + 1 < data.length) {
            const note = data[i++];
            const velocity = data[i++];
            
            if (velocity > 0) {
              // Calculate time in milliseconds
              const timeMs = (trackTime / ticksPerQuarter) * (microsecondsPerQuarter / 1000);
              notes.push({
                note: note,
                time: Math.round(timeMs),
                velocity: velocity / 127,
                channel: status & 0x0F
              });
            }
          }
          // Note Off
          else if ((status & 0xF0) === 0x80 && i + 1 < data.length) {
            i += 2;
          }
          // Other channel messages
          else if ((status & 0xF0) >= 0x80 && (status & 0xF0) <= 0xE0) {
            // Skip parameters based on message type
            if ((status & 0xF0) === 0xC0 || (status & 0xF0) === 0xD0) {
              i += 1;
            } else {
              i += 2;
            }
          }
          // Meta event
          else if (status === 0xFF && i + 1 < data.length) {
            const metaType = data[i++];
            if (i >= data.length) break;
            const len = data[i++];
            
            // Tempo change
            if (metaType === 0x51 && len === 3 && i + 2 < data.length) {
              microsecondsPerQuarter = (data[i] << 16) | (data[i+1] << 8) | data[i+2];
            }
            
            i += len;
          }
          // SysEx
          else if (status === 0xF0 || status === 0xF7) {
            // Skip to end of SysEx
            while (i < data.length && data[i] !== 0xF7) i++;
            if (i < data.length) i++;
          }
          else {
            // Unknown status, try to continue
            i++;
          }
        }
      } else {
        i++;
      }
    }
    
    console.log('Found', notes.length, 'notes');
    
    // If still no notes found, try a different approach - just scan for 0x90 patterns
    if (notes.length === 0) {
      console.log('Trying alternate parsing method...');
      for (let j = 0; j < data.length - 2; j++) {
        if ((data[j] & 0xF0) === 0x90 && data[j + 2] > 0) {
          notes.push({
            note: data[j + 1],
            time: notes.length * 100, // Fake timing
            velocity: data[j + 2] / 127,
            channel: data[j] & 0x0F
          });
        }
      }
      console.log('Alternate method found', notes.length, 'notes');
    }
    
    return notes.sort((a, b) => a.time - b.time);
  };

  // Handle MIDI file loading
  const handleMidiFileLoad = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      console.log('Loading MIDI file:', file.name);
      const notes = await parseMidiFile(file);
      
      console.log('Parsed notes:', notes.length, 'notes');
      if (notes.length > 0) {
        console.log('First few notes:', notes.slice(0, 5));
      }
      
      if (notes.length === 0) {
        console.warn('No notes found in MIDI file');
        alert('No notes found in the MIDI file. Please try a different file.');
        return;
      }
      
      // Stop any current playback
      stopSong();
      
      // Clean up any existing MIDI file playback
      if (window.midiFileCleanup) {
        window.midiFileCleanup.forEach(cleanup => cleanup());
        window.midiFileCleanup = [];
      }
      
      // Play the MIDI file after a short delay to ensure handlers are ready
      setTimeout(() => {
        playMidiFile(notes);
      }, 100);
      
    } catch (error) {
      console.error('Error loading MIDI file:', error);
      alert('Error loading MIDI file: ' + error.message);
    }
    
    // Reset input
    event.target.value = '';
  };

  // Play loaded MIDI file
  const playMidiFile = (notes) => {
    if (notes.length === 0) return;
    
    console.log('Starting MIDI playback with', notes.length, 'notes');
    
    let noteIndex = 0;
    const startTime = Date.now();
    let timeoutIds = [];
    
    const playNextNote = () => {
      if (noteIndex >= notes.length) {
        console.log('MIDI playback completed, looping...');
        // Loop the MIDI file
        noteIndex = 0;
        playMidiFile(notes);
        return;
      }
      
      const note = notes[noteIndex];
      const currentTime = Date.now() - startTime;
      const delay = Math.max(0, note.time - currentTime);
      

      
      const timeoutId = setTimeout(() => {
        // Map MIDI note to piano key
        const keyMapping = getMidiKeyMapping(note.note);
        
        if (keyMapping) {
          const pianoKey = PIANO_KEYS.find(k => k.note === keyMapping);
          if (pianoKey) {
            // Simulate key press
            if (handleKeyPressRef.current) {
              handleKeyPressRef.current(pianoKey);
              
              // Release after a short duration
              const releaseDuration = 100 + note.velocity * 200;
              setTimeout(() => {
                if (handleKeyReleaseRef.current) {
                  handleKeyReleaseRef.current(pianoKey);
                }
              }, releaseDuration);
            }
          }
        }
        
        noteIndex++;
        playNextNote();
      }, delay);
      
      timeoutIds.push(timeoutId);
    };
    
    // Store cleanup function
    const cleanup = () => {
      timeoutIds.forEach(id => clearTimeout(id));
      timeoutIds = [];
    };
    
    // Add to active notes for cleanup on stop
    if (!window.midiFileCleanup) {
      window.midiFileCleanup = [];
    }
    window.midiFileCleanup.push(cleanup);
    
    playNextNote();
  };

  // MIDI note number → note-name mapping with dynamic key creation.
  // This now supports the full 0–127 MIDI range instead of wrapping to one octave.
  const getMidiKeyMapping = (noteNumber) => {
    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    // Convert to scientific pitch notation (e.g. 60 → C4)
    const octave = Math.floor(noteNumber / 12) - 1;
    const noteIndex = noteNumber % 12;
    const noteName = NOTE_NAMES[noteIndex];
    const fullNote = `${noteName}${octave}`;

    // No dynamic key addition – onscreen keyboard is fixed to 61 keys.
    return fullNote;
  };

  // Initialize piano: start with a 16-voice fallback synth, then swap in the
  // higher-quality sampler once its samples finish loading. This avoids the
  // early "loaded === false" check that previously forced the app to stay on
  // the low-polyphony fallback and lose notes when playing chords.
  useEffect(() => {
    // 1) Create a 16-voice fallback synth so users can play immediately.
    const fallbackSynth = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 16,
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.4, sustain: 0.4, release: 1 }
    }).toDestination();
    fallbackSynth.volume.value = -16;

    // Set as the current instrument.
    pianoRef.current = fallbackSynth;

    // 2) Begin loading the multi-sample piano. When ready, swap it in and
    // dispose the fallback to free resources.
    const sampler = new Tone.Sampler({
      urls: {
        C4: "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        A4: "A4.mp3",
      },
      release: 1,
      baseUrl: "https://tonejs.github.io/audio/salamander/",
      onload: () => {
        sampler.volume.value = -16;

        // Swap instruments
        if (pianoRef.current) {
          pianoRef.current.dispose();
        }
        pianoRef.current = sampler;
      }
    }).toDestination();

    // Clean-up: dispose whichever instrument is active on unmount.
    return () => {
      if (pianoRef.current) {
        pianoRef.current.dispose();
      }
      // Ensure both are disposed in case the sampler never loaded.
      fallbackSynth.dispose();
      sampler.dispose();
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

      // Replay tutorial with Shift + M
      if (event.code === 'KeyM' && event.shiftKey) {
        setShowTutorial(true);
        setShowKeyboard(true); // Show keyboard during tutorial replay
        playSong(0, false); // Play demo without looping
        return;
      }

      // Open MIDI file with Shift + P
      if (event.code === 'KeyP' && event.shiftKey) {
        event.preventDefault();
        fileInputRef.current?.click();
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
    
    // console.log('Update system excitement:', {
    //   noteIndex,
    //   musicalityResult,
    //   currentExcitement: systemState.excitement,
    //   timestamp
    // });
    
    setSystemState(prev => {
      // Add excitement based on musicality
      const excitementIncrease = musicalityResult.excitement;
      const newExcitement = Math.max(0, Math.min(1, prev.excitement + excitementIncrease));
      
      // console.log('State update:', {
      //   prevExcitement: prev.excitement,
      //   excitementIncrease,
      //   newExcitement,
      //   musicalityScore: musicalityResult.score
      // });
      
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
      
      // console.log('Triggering splats:', {
      //   excitement: currentState.excitement,
      //   numSplats,
      //   musicalityScore: currentState.musicalityScore
      // });
      
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
          
          // Helper that we can attach to any MIDIInput
          const midiMessageHandler = (event) => {
            const [status, data1, data2] = event.data; // data1: note or CC#, data2: velocity/value
            const command = status & 0xF0;

            // ---------------- NOTE ON ----------------
            if (command === 0x90 && data2 > 0) {
              const noteName = getMidiKeyMapping(data1);
              if (noteName) {
                // If this note was previously being sustained, remove it so we don't double-release later.
                sustainedNotesRef.current.delete(noteName);

                const key = PIANO_KEYS.find(k => k.note === noteName);
                if (key && handleKeyPressRef.current) {
                  handleKeyPressRef.current(key, data2 / 127); // velocity normalised 0-1
                }
              }
            }
            // ---------------- NOTE OFF ----------------
            else if (command === 0x80 || (command === 0x90 && data2 === 0)) {
              const noteName = getMidiKeyMapping(data1);
              if (!noteName) return;

              if (sustainActiveRef.current) {
                // Defer release until pedal lifted
                sustainedNotesRef.current.add(noteName);
              } else {
                const key = PIANO_KEYS.find(k => k.note === noteName);
                if (key && handleKeyReleaseRef.current) {
                  handleKeyReleaseRef.current(key);
                }
              }
            }
            // ---------------- SUSTAIN PEDAL (CC 64) ----------------
            else if (command === 0xB0 && data1 === 64) {
              const pedalDown = data2 >= 64;
              if (pedalDown) {
                sustainActiveRef.current = true;
              } else {
                sustainActiveRef.current = false;
                // Release all deferred notes
                sustainedNotesRef.current.forEach((noteName) => {
                  const key = PIANO_KEYS.find(k => k.note === noteName);
                  if (key && handleKeyReleaseRef.current) {
                    handleKeyReleaseRef.current(key);
                  }
                });
                sustainedNotesRef.current.clear();
              }
            }
          };

          // Get connected MIDI devices
          const devices = [];
          for (const input of midiAccess.inputs.values()) {
            devices.push(input.name);
            input.onmidimessage = midiMessageHandler;
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
                input.onmidimessage = midiMessageHandler;
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
  
  // Store playSong in a ref to avoid dependency issues
  const playSongRef = useRef(playSong);
  useEffect(() => {
    playSongRef.current = playSong;
  }, [playSong]);

  // Show tutorial on load (only once)
  useEffect(() => {
    // Check if user has already seen the tutorial
    const hasSeenTutorial = localStorage.getItem('musicolour-tutorial-seen') === 'true';
    
    if (!hasSeenTutorial) {
      setShowTutorial(true);
      setShowKeyboard(true); // Show keyboard during tutorial
      // Start demo song without looping after a short delay
      const timer = setTimeout(() => {
        playSongRef.current(0, false); // Play demo song once, no loop
      }, 2000); // Wait 2 seconds before starting the demo
      
      return () => clearTimeout(timer);
    }
  }, []); // Empty dependency array - run only once on mount

  // Clean up any scheduled timeouts on unmount
  useEffect(() => {
    return () => {
      stopSong();
    };
  }, [stopSong]);

  // Unused function - might be useful for future mood visualization features
  // const getMoodData = () => {
  //   const excitement = systemState.excitement;
  //   
  //   if (excitement > 0.7) {
  //     return { color: getInterpolatedColor(excitement), mood: 'excited' };
  //   } else if (excitement < 0.2) {
  //     return { color: getInterpolatedColor(excitement), mood: 'bored' };
  //   } else {
  //     return { color: getInterpolatedColor(excitement), mood: 'neutral' };
  //   }
  // };

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
          By <a href="https://www.linkedin.com/in/gdavidss/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300">Gui Dávid</a>. Inspired by <a href="https://en.wikipedia.org/wiki/Gordon_Pask" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300">Gordon Pask</a>.
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
        <div className="fixed right-4 top-4 bg-gray-800 bg-opacity-90 text-white p-4 pb-2 rounded-lg z-40 text-xs font-mono w-64 max-h-[90vh] overflow-y-auto overflow-x-clip">
          <h3 className="font-bold mb-3 text-sm mt-2">Model Parameters</h3>
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

            // Human-readable parameter names
            const readableNames = {
              HISTORY: 'Memory Length',
              IOI_WIN: 'Note Timing Window',
              VEL_WIN: 'Velocity Window',
              CHORD_WINDOW: 'Chord Detection Time',
              EMA_ALPHA: 'Smoothing Factor',
              BOOST_POS: 'Excitement Boost',
              BOOST_NEG: 'Decay Rate'
            };

            // Tooltips explaining each parameter
            const tooltips = {
              HISTORY: 'How many notes the system remembers',
              IOI_WIN: 'Time window for rhythm detection',
              VEL_WIN: 'Sensitivity to volume changes',
              CHORD_WINDOW: 'Time to detect chords',
              EMA_ALPHA: 'How quickly system adapts (lower=slower)',
              BOOST_POS: 'How much excitement increases',
              BOOST_NEG: 'How fast excitement fades'
            };

            return (
              <div key={key} className="mb-4 relative">
                <label className="flex justify-between items-center mb-1 group">
                  <span className="cursor-help flex items-center gap-1 relative group/title">
                    {readableNames[key] || key}
                    <span className="text-gray-500 text-xs">ⓘ</span>
                    {/* Custom tooltip */}
                    <div className="absolute left-0 bottom-full mb-1 opacity-0 group-hover/title:opacity-100 transition-opacity duration-200 z-50 pointer-events-none">
                      <div className="bg-black text-gray-200 text-xs rounded px-3 py-2 shadow-xl border border-gray-600 w-56 whitespace-normal">
                        {tooltips[key]}
                        <div className="absolute top-full left-4 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                      </div>
                    </div>
                  </span>
                  <span className="ml-2 text-right">
                    {(() => {
                      if (key === 'CHORD_WINDOW') return `${val}ms`;
                      if (key === 'HISTORY') return `${val} notes`;
                      if (typeof val === 'number') return val.toFixed(2);
                      return val;
                    })()}
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

      {/* Tutorial Cards */}
      {showTutorial && (
        <TutorialCards 
          key="tutorial-cards"
          onComplete={() => {
            setShowTutorial(false);
            setShowKeyboard(false); // Collapse keyboard after tutorial
          }}
          onSkip={() => {
            setShowTutorial(false);
            setShowKeyboard(false); // Collapse keyboard when skipping
            stopSong(); // Stop the demo song
            // Clean up any MIDI file playback
            if (window.midiFileCleanup) {
              window.midiFileCleanup.forEach(cleanup => cleanup());
              window.midiFileCleanup = [];
            }
          }}
        />
      )}

      {/* Info Icon */}
      {!showTutorial && <InfoIcon showParams={showParams} showDebug={showDebug} />}

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
            midiEnabled={midiEnabled}
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

      {/* Hidden file input for MIDI files */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".mid,.midi"
        onChange={handleMidiFileLoad}
        style={{ display: 'none' }}
      />
    </div>
  );
}

export default MusicolourApp;