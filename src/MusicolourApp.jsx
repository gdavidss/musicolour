import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import * as Tone from 'tone';

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
          ? 'bg-gray-900 text-white h-24 w-7 mx-0 z-10 -ml-3 -mr-3' 
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
      <div className="text-xs font-mono opacity-70">
        {keyData.note}
      </div>
      <div className="text-xs opacity-50">
        {keyData.keyCode.replace('Key', '').replace('Digit', '')}
      </div>
    </div>
  );
}

// Thermometer Power Bar Component
function PowerBar({ excitement = 0 }) {
  const getMoodData = (excitementLevel) => {
    if (excitementLevel > 0.7) {
      return { color: '#ff6b6b', label: 'EXCITED' };
    } else if (excitementLevel < 0.2) {
      return { color: '#6c757d', label: 'BORED' };
    } else {
      return { color: '#4ecdc4', label: 'NEUTRAL' };
    }
  };

  const moodData = getMoodData(excitement);
  const fillHeight = Math.max(5, excitement * 95); // 5% minimum, 95% max

  return (
    <div className="fixed left-6 top-1/2 transform -translate-y-1/2 z-20">
      <div className="text-white text-xs font-mono mb-2 text-center opacity-70">
        SYSTEM
      </div>
      
      {/* Thermometer container */}
      <div className="relative w-6 h-64 bg-black bg-opacity-30 rounded-full border border-white border-opacity-20 overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 h-px bg-white opacity-10"
              style={{ top: `${i * 12.5}%` }}
            />
          ))}
        </div>
        
        {/* Fill */}
        <div
          className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out rounded-full"
          style={{
            height: `${fillHeight}%`,
            backgroundColor: moodData.color,
            boxShadow: `0 0 20px ${moodData.color}40`
          }}
        />
        
        {/* Glow effect */}
        <div
          className="absolute bottom-0 left-0 right-0 opacity-60 rounded-full blur-sm"
          style={{
            height: `${fillHeight}%`,
            backgroundColor: moodData.color
          }}
        />
      </div>
      
      {/* Label */}
      <div 
        className="text-xs font-mono mt-2 text-center transition-colors duration-1000"
        style={{ color: moodData.color }}
      >
        {moodData.label}
      </div>
    </div>
  );
}

function Piano({ onKeyPress, onKeyRelease, pressedKeys }) {
  return (
    <div className="piano-container flex justify-center items-end bg-gradient-to-t from-gray-900 to-gray-800 p-6 rounded-lg shadow-2xl border border-gray-600" style={{
      boxShadow: '0 10px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)'
    }}>
      <div className="flex relative" style={{
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
        <div className="absolute top-0 left-0 flex">
          {PIANO_KEYS.filter(k => k.type === 'black').map((key, index) => {
            const whiteKeyIndex = PIANO_KEYS.filter(k => k.type === 'white').findIndex(wk => 
              PIANO_KEYS.indexOf(wk) < PIANO_KEYS.indexOf(key)
            );
            const offset = (whiteKeyIndex + 1) * 44 - 14; // 44px = white key width, adjust for black key positioning
            
            return (
              <div
                key={key.note}
                style={{ marginLeft: `${offset}px` }}
                className="absolute"
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

// Enhanced Visual Effects
function RippleEffect({ position, color, intensity = 1, note }) {
  const mesh = useRef();
  const [scale, setScale] = useState(0);
  
  useFrame((state, delta) => {
    if (mesh.current) {
      setScale(prev => prev + delta * 5);
      mesh.current.scale.set(scale, scale, 1);
      mesh.current.material.opacity = Math.max(0, 1 - scale / 3);
      
      // Add subtle rotation based on note
      const noteIndex = PIANO_KEYS.findIndex(k => k.note === note);
      mesh.current.rotation.z = (noteIndex * 0.2) + state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <mesh ref={mesh} position={position}>
      <ringGeometry args={[0.5, 1.5, 32]} />
      <meshBasicMaterial color={color} transparent />
    </mesh>
  );
}

function ColorWave({ color, intensity, note }) {
  const mesh = useRef();
  
  useFrame((state) => {
    if (mesh.current) {
      const noteIndex = PIANO_KEYS.findIndex(k => k.note === note);
      const frequency = (noteIndex + 1) * 0.1;
      mesh.current.material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.2 * intensity;
      mesh.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * frequency * 5) * 0.5 * intensity;
      mesh.current.rotation.y = state.clock.elapsedTime * frequency;
    }
  });

  const noteIndex = PIANO_KEYS.findIndex(k => k.note === note);
  const height = 2 + noteIndex * 0.1;

  return (
    <mesh ref={mesh} position={[0, 0, -5]}>
      <cylinderGeometry args={[3, 3, height, 32]} />
      <meshBasicMaterial color={color} transparent />
    </mesh>
  );
}

function NoteParticles({ note, color, position }) {
  const particles = useRef();
  const particleCount = 50;
  
  useFrame((state) => {
    if (particles.current) {
      const positions = particles.current.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3 + 1] += 0.02; // Y movement
        
        // Reset particle if it goes too high
        if (positions[i3 + 1] > 5) {
          positions[i3] = (Math.random() - 0.5) * 2;
          positions[i3 + 1] = -2;
          positions[i3 + 2] = (Math.random() - 0.5) * 2;
        }
      }
      particles.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 2;
    positions[i * 3 + 1] = Math.random() * -2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
  }

  return (
    <points ref={particles}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={particleCount}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.05} />
    </points>
  );
}

function MusicolourApp() {
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const [activeEffects, setActiveEffects] = useState([]);
  const [systemState, setSystemState] = useState({
    excitement: 0, // 0 to 1 scale
    lastNoteIndex: null,
    lastKeyPressTime: null,
    keyRepetitionCounters: {}, // Track repetition per key
    currentRepetitionFactor: 1.0 // Multiplication factor for current key
  });

  const pianoRef = useRef(null);
  const keyTimeouts = useRef(new Map());

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
  }, [pressedKeys]);

  // Calculate base excitement increase based on note distance
  const calculateBaseExcitementIncrease = useCallback((currentNoteIndex, lastNoteIndex) => {
    if (lastNoteIndex === null) return 0.3; // Base excitement for first note
    
    const distance = Math.abs(currentNoteIndex - lastNoteIndex);
    // Excitement factor f(distance) - exponential increase with distance
    const maxDistance = PIANO_KEYS.length - 1;
    const normalizedDistance = distance / maxDistance;
    
    // f(a) = base + (max - base) * (1 - e^(-k*distance))
    const base = 0.1;
    const max = 0.8;
    const k = 3; // Controls how quickly excitement increases
    
    return base + (max - base) * (1 - Math.exp(-k * normalizedDistance));
  }, []);

  // Calculate distance-based multiplication factor
  const calculateDistanceMultiplier = useCallback((currentNoteIndex, lastNoteIndex) => {
    if (lastNoteIndex === null) return 1.0;
    
    const distance = Math.abs(currentNoteIndex - lastNoteIndex);
    const maxDistance = PIANO_KEYS.length - 1;
    
    // Distance multiplier: close notes get lower multiplier
    // Adjacent keys (distance=1) get ~0.5, far keys get ~0.9
    const normalizedDistance = distance / maxDistance;
    return 0.3 + 0.6 * normalizedDistance; // Range from 0.3 to 0.9
  }, []);

  const updateSystemExcitement = useCallback((noteIndex) => {
    setSystemState(prev => {
      const baseIncrease = calculateBaseExcitementIncrease(noteIndex, prev.lastNoteIndex);
      const distanceMultiplier = calculateDistanceMultiplier(noteIndex, prev.lastNoteIndex);
      
      // Check if we're repeating the same key
      const isSameKey = prev.lastNoteIndex === noteIndex;
      let newRepetitionFactor;
      let newRepetitionCounters = { ...prev.keyRepetitionCounters };
      
      if (isSameKey) {
        // Same key: compound the repetition factor
        const alpha = distanceMultiplier; // Use same multiplier as alpha
        newRepetitionFactor = prev.currentRepetitionFactor * alpha;
        newRepetitionCounters[noteIndex] = (newRepetitionCounters[noteIndex] || 0) + 1;
      } else {
        // Different key: reset repetition factor to distance multiplier
        newRepetitionFactor = distanceMultiplier;
        // Reset counter for previous key
        if (prev.lastNoteIndex !== null) {
          newRepetitionCounters[prev.lastNoteIndex] = 0;
        }
        newRepetitionCounters[noteIndex] = 1;
      }
      
      // Apply both distance and repetition penalties
      const finalIncrease = baseIncrease * newRepetitionFactor;
      const newExcitement = Math.min(1, prev.excitement + finalIncrease);
      
      return {
        ...prev,
        excitement: newExcitement,
        lastNoteIndex: noteIndex,
        lastKeyPressTime: Date.now(),
        keyRepetitionCounters: newRepetitionCounters,
        currentRepetitionFactor: newRepetitionFactor
      };
    });
  }, [calculateBaseExcitementIncrease, calculateDistanceMultiplier]);

  // Constant boredom decay system (5 seconds from max to 0)
  useEffect(() => {
    const decayInterval = setInterval(() => {
      setSystemState(prev => {
        // Decay rate: 1.0 excitement level in 5000ms = 0.2 per second = 0.0033 per 16.67ms
        const decayRate = 0.2 / 60; // 60fps decay rate
        const newExcitement = Math.max(0, prev.excitement - decayRate);
        
        // Reset repetition factor gradually when no keys are pressed
        const timeSinceLastKey = Date.now() - (prev.lastKeyPressTime || 0);
        let newRepetitionFactor = prev.currentRepetitionFactor;
        if (timeSinceLastKey > 1000) { // After 1 second of no input
          newRepetitionFactor = Math.min(1.0, newRepetitionFactor + 0.01); // Gradual recovery
        }
        
        return {
          ...prev,
          excitement: newExcitement,
          currentRepetitionFactor: newRepetitionFactor
        };
      });
    }, 16); // ~60fps for smooth decay

    return () => clearInterval(decayInterval);
  }, []);

  const handleKeyPress = useCallback((key) => {
    if (pressedKeys.has(key.note)) return;
    
    setPressedKeys(prev => new Set([...prev, key.note]));
    
    if (pianoRef.current) {
      pianoRef.current.triggerAttack(key.note);
    }

    // Create visual effect with wider spread and random positioning
    const noteIndex = PIANO_KEYS.findIndex(k => k.note === key.note);
    const intensity = 0.3 + (systemState.excitement * 0.7); // Scale with excitement
    
    // Create multiple effects for richer visuals
    const baseX = (noteIndex - 8) * 1.2; // Wider spread
    const randomOffset = (Math.random() - 0.5) * 4; // Random positioning
    const randomY = (Math.random() - 0.5) * 3;
    
    const newEffect = {
      id: Date.now() + Math.random(),
      type: 'ripple',
      position: [baseX + randomOffset, randomY, (Math.random() - 0.5) * 2],
      color: key.color,
      intensity,
      note: key.note,
      timestamp: Date.now()
    };

    setActiveEffects(prev => [...prev, newEffect]);
    updateSystemExcitement(noteIndex);

    // Auto-release after timeout if not manually released
    keyTimeouts.current.set(key.note, setTimeout(() => {
      handleKeyRelease(key);
    }, 500));
  }, [pressedKeys, systemState.excitement, updateSystemExcitement]);

  const handleKeyRelease = useCallback((key) => {
    setPressedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(key.note);
      return newSet;
    });
    
    if (pianoRef.current) {
      pianoRef.current.triggerRelease(key.note);
    }

    // Clear timeout
    if (keyTimeouts.current.has(key.note)) {
      clearTimeout(keyTimeouts.current.get(key.note));
      keyTimeouts.current.delete(key.note);
    }
  }, []);

  // Clean up old effects
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveEffects(prev => 
        prev.filter(effect => Date.now() - effect.timestamp < 3000)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getMoodData = () => {
    const excitement = systemState.excitement;
    
    if (excitement > 0.7) {
      return { color: '#ff6b6b', mood: 'excited' };
    } else if (excitement < 0.2) {
      return { color: '#6c757d', mood: 'bored' };
    } else {
      return { color: '#4ecdc4', mood: 'neutral' };
    }
  };

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      {/* Header */}
      <div className="absolute top-6 left-20 z-10 text-white">
        <h1 className="text-3xl font-bold mb-2">Musicolour</h1>
      </div>
      
      {/* Power Bar */}
      <PowerBar excitement={systemState.excitement} />

      {/* Instructions */}
      <div className="absolute top-6 right-6 z-10 text-white text-right">
        <div className="text-sm opacity-75 space-y-1">
          <div>Play the piano to create visual music</div>
          <div>Use keyboard: Q-P (white keys), 2-0 (black keys)</div>
          <div>System adapts to your musical patterns</div>
          <div className="text-xs opacity-50 mt-2">
            Repetition Factor: {systemState.currentRepetitionFactor.toFixed(3)}
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="relative h-2/3">
        <Canvas
          camera={{ position: [0, 2, 8], fov: 75 }}
          className="w-full h-full"
        >
          <color attach="background" args={['#0f0f0f']} />
          
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <pointLight position={[5, 5, 5]} intensity={0.8} color="#4ecdc4" />
          <pointLight position={[-5, 5, 5]} intensity={0.8} color="#ff6b6b" />

          {/* Active visual effects */}
          {activeEffects.map(effect => (
            <group key={effect.id}>
              <RippleEffect
                position={effect.position}
                color={effect.color}
                intensity={effect.intensity}
                note={effect.note}
              />
              <NoteParticles
                note={effect.note}
                color={effect.color}
                position={effect.position}
              />
            </group>
          ))}

          {/* Background waves for currently pressed keys */}
          {Array.from(pressedKeys).map(note => {
            const key = PIANO_KEYS.find(k => k.note === note);
            return (
              <ColorWave
                key={note}
                color={key.color}
                intensity={1}
                note={note}
              />
            );
          })}

          {/* System status text */}
          <Text
            position={[0, -1, 0]}
            fontSize={0.3}
            color={getMoodData().color}
            anchorX="center"
            anchorY="middle"
          >
            {pressedKeys.size > 0 ? '♪ Playing ♪' : `♪ ${getMoodData().mood.toUpperCase()} ♪`}
          </Text>

          <OrbitControls enableZoom={false} enablePan={false} />
        </Canvas>
      </div>

      {/* Piano Interface */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <Piano
          onKeyPress={handleKeyPress}
          onKeyRelease={handleKeyRelease}
          pressedKeys={pressedKeys}
        />
      </div>
    </div>
  );
}

export default MusicolourApp;