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
          ? 'bg-gray-900 text-white h-20 w-6 mx-0 z-10 -ml-3 -mr-3' 
          : 'bg-white text-gray-800 h-32 w-10 border border-gray-200'
        }
        ${isPressed ? (isBlack ? 'bg-gray-700' : 'bg-gray-100') : ''}
        hover:${isBlack ? 'bg-gray-700' : 'bg-gray-50'}
        flex flex-col justify-end items-center pb-2
        shadow-md hover:shadow-lg
      `}
      onMouseDown={onPress}
      onMouseUp={onRelease}
      onMouseLeave={onRelease}
      style={{
        borderBottomColor: keyData.color,
        borderBottomWidth: isPressed ? '4px' : '2px'
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

function Piano({ onKeyPress, onKeyRelease, pressedKeys }) {
  return (
    <div className="piano-container flex justify-center items-end bg-gradient-to-t from-gray-800 to-gray-700 p-4 rounded-lg shadow-xl">
      <div className="flex relative">
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
            const offset = (whiteKeyIndex + 1) * 40 - 12; // 40px = white key width, adjust for black key positioning
            
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
    mood: 'neutral',
    recentNotes: [],
    boredomCounters: {}
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

  const updateSystemMood = useCallback((note) => {
    setSystemState(prev => {
      const newRecentNotes = [...prev.recentNotes, note].slice(-10);
      const uniqueNotes = new Set(newRecentNotes);
      const repetitionRatio = newRecentNotes.length / uniqueNotes.size;
      
      let newMood = 'neutral';
      if (repetitionRatio > 3) {
        newMood = 'bored';
      } else if (uniqueNotes.size > 5) {
        newMood = 'excited';
      }

      return {
        ...prev,
        mood: newMood,
        recentNotes: newRecentNotes
      };
    });
  }, []);

  const handleKeyPress = useCallback((key) => {
    if (pressedKeys.has(key.note)) return;
    
    setPressedKeys(prev => new Set([...prev, key.note]));
    
    if (pianoRef.current) {
      pianoRef.current.triggerAttack(key.note);
    }

    // Create visual effect
    const noteIndex = PIANO_KEYS.findIndex(k => k.note === key.note);
    const intensity = systemState.mood === 'bored' ? 0.3 : 1.0;
    
    const newEffect = {
      id: Date.now() + Math.random(),
      type: 'ripple',
      position: [(noteIndex - 8) * 0.5, 0, 0],
      color: key.color,
      intensity,
      note: key.note,
      timestamp: Date.now()
    };

    setActiveEffects(prev => [...prev, newEffect]);
    updateSystemMood(key.note);

    // Auto-release after timeout if not manually released
    keyTimeouts.current.set(key.note, setTimeout(() => {
      handleKeyRelease(key);
    }, 500));
  }, [pressedKeys, systemState.mood, updateSystemMood]);

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

  const getMoodColor = () => {
    switch (systemState.mood) {
      case 'excited': return '#ff6b6b';
      case 'bored': return '#6c757d';
      default: return '#4ecdc4';
    }
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 overflow-hidden relative">
      {/* Header */}
      <div className="absolute top-6 left-6 z-10 text-white">
        <h1 className="text-3xl font-bold mb-2">Musicolour</h1>
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full transition-colors duration-1000"
            style={{ backgroundColor: getMoodColor() }}
          />
          <span className="text-sm opacity-75">System: {systemState.mood}</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-6 right-6 z-10 text-white text-right">
        <div className="text-sm opacity-75 space-y-1">
          <div>Play the piano to create visual music</div>
          <div>Use keyboard: Q-P (white keys), 2-0 (black keys)</div>
          <div>System adapts to your musical patterns</div>
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
            color={getMoodColor()}
            anchorX="center"
            anchorY="middle"
          >
            {pressedKeys.size > 0 ? '♪ Playing ♪' : '♪ Ready ♪'}
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