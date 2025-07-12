import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import * as Tone from 'tone';

// Initialize Tone.js
Tone.start();

// Regional repetition tracking helpers
const getKeyRegion = (keyIndex) => {
  // Divide 17 keys into overlapping regions of ~4 keys each
  return Math.floor(keyIndex / 3); // Creates regions: 0-2=0, 3-5=1, 6-8=2, etc.
};

const getInfluencedRegions = (keyIndex) => {
  // A key influences its own region and adjacent regions
  const baseRegion = getKeyRegion(keyIndex);
  const regions = [];
  for (let r = baseRegion - 1; r <= baseRegion + 1; r++) {
    if (r >= 0 && r <= Math.floor((PIANO_KEYS.length - 1) / 3)) {
      regions.push(r);
    }
  }
  return regions;
};

const getRegionalHeat = (regionCounters, keyIndex) => {
  // Sum up repetition counts from all regions this key influences
  const influencedRegions = getInfluencedRegions(keyIndex);
  return influencedRegions.reduce((total, region) => {
    return total + (regionCounters[region] || 0);
  }, 0);
};

// Pask's Adaptive Band-Pass Filter
class AdaptiveBandPassFilter {
  constructor(centerFreq, bandwidth = 0.5) {
    this.centerFreq = centerFreq; // MIDI note number
    this.bandwidth = bandwidth; // octaves
    this.lastRetune = Date.now();
    this.retuneHistory = [];
  }

  // Calculate filter response with overlapping skirts
  getResponse(inputFreq) {
    const freqDistance = Math.abs(inputFreq - this.centerFreq);
    const normalizedDistance = freqDistance / this.bandwidth;
    
    // Gaussian-like response with overlapping skirts (~½ octave each side)
    return Math.exp(-0.5 * Math.pow(normalizedDistance, 2));
  }

  // Retune filter based on novelty competition
  retune(targetFreq, maxShift = 2) {
    const shift = Math.min(maxShift, Math.abs(targetFreq - this.centerFreq));
    const direction = targetFreq > this.centerFreq ? 1 : -1;
    
    this.centerFreq += direction * shift * 0.1; // Gradual retuning
    this.centerFreq = Math.max(0, Math.min(127, this.centerFreq)); // MIDI range
    
    this.retuneHistory.push({
      timestamp: Date.now(),
      oldFreq: this.centerFreq - direction * shift * 0.1,
      newFreq: this.centerFreq
    });
    
    this.lastRetune = Date.now();
  }
}

// Pask's Adaptive Threshold Units (A-T cells)
class AdaptiveThresholdCell {
  constructor(id, initialThreshold = 0.5) {
    this.id = id;
    this.threshold = initialThreshold;
    this.envelope = 0;
    this.lastFiring = 0;
    this.tau = 1000; // Time constant for threshold integration (ms)
    this.k = 0.8; // Gain factor
    this.lastUpdateTime = Date.now();
    this.filter = new AdaptiveBandPassFilter(id * 7 + 60); // Spread filters across frequency range
  }

  // Threshold integrator: τ(dT/dt) = k[E(t) - T(t)]
  updateThreshold(envelopeValue) {
    const now = Date.now();
    const dt = (now - this.lastUpdateTime) / 1000; // Convert to seconds
    
    if (dt > 0) {
      const dT_dt = this.k * (envelopeValue - this.threshold);
      this.threshold += (dT_dt * dt) / (this.tau / 1000);
      this.threshold = Math.max(0.1, Math.min(1.0, this.threshold)); // Clamp
    }
    
    this.envelope = envelopeValue;
    this.lastUpdateTime = now;
  }

  // Check if cell fires (envelope exceeds adaptive threshold)
  checkFiring() {
    const fires = this.envelope > this.threshold;
    if (fires) {
      this.lastFiring = Date.now();
    }
    return fires;
  }

  // Get 1-bit output
  getBitOutput() {
    return this.checkFiring() ? 1 : 0;
  }

  // Get time since last firing (for boredom calculation)
  getTimeSinceLastFiring() {
    return Date.now() - this.lastFiring;
  }
}

const isDistantRegion = (region1, region2, threshold = 2) => {
  // Check if two regions are far enough apart to reset penalties
  return region1 === null || Math.abs(region1 - region2) >= threshold;
};

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
      <div className="text-xs font-mono opacity-70 font-black">
        {keyData.note}
      </div>
      <div className="text-xs opacity-50 font-bold">
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
      {/* Thermometer container - 35% taller */}
      <div className="relative w-8 h-80 bg-black bg-opacity-30 rounded-full border border-white border-opacity-20 overflow-hidden shadow-lg">
        {/* Background grid */}
        <div className="absolute inset-0">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 h-px bg-white opacity-10"
              style={{ top: `${i * 10}%` }}
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
        className="text-xs font-mono mt-2 text-center transition-colors duration-1000 font-black tracking-wide"
        style={{ color: moodData.color, fontWeight: 900 }}
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
  
  // Initialize Pask's adaptive system
  const [adaptiveSystem] = useState(() => {
    const cells = {};
    PIANO_KEYS.forEach((key, index) => {
      cells[index] = new AdaptiveThresholdCell(index, 0.3 + Math.random() * 0.2);
    });
    return {
      cells,
      noveltyScores: {},
      lastWheelPosition: 0,
      boredomBias: 0,
      colorWheelMappings: {}, // Dynamic color mappings
      wheelUsageHistory: new Array(8).fill(0), // Track wheel position usage
    };
  });
  
  const [systemState, setSystemState] = useState({
    excitement: 0, // 0 to 1 scale
    lastNoteIndex: null,
    lastKeyPressTime: null,
    regionRepetitionCounters: {}, // Track repetition per region
    currentRepetitionFactor: 1.0, // Multiplication factor for current region
    lastRegion: null, // Track which region was last played
    adaptiveThresholds: {}, // Store current adaptive thresholds
    noveltyEngine: {
      activeCell: null,
      maxNoveltyScore: 0,
      wheelPosition: 0
    },
    recentNotes: [], // Track recent note sequence for pattern detection
    patternBoredom: 0 // Track boredom from repetitive patterns
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

  // Pask's Novelty Engine - calculates novelty scores for each cell
  const calculateNoveltyScores = useCallback((triggeredCellIndex, envelopeValue) => {
    const scores = {};
    const K = PIANO_KEYS.length - 1; // Number of other cells
    const lambda = 0.0001; // Penalty factor for recent usage
    
    PIANO_KEYS.forEach((_, i) => {
      const cell = adaptiveSystem.cells[i];
      
      // Update cell threshold based on current envelope
      const normalizedEnvelope = i === triggeredCellIndex ? envelopeValue : 0;
      cell.updateThreshold(normalizedEnvelope);
      
      // Calculate novelty score: N_i(t) = (1/K)Σ|b_i(t) - b_j(t)| - λ(t - t_last_i)
      let differenceSum = 0;
      const currentBit = cell.getBitOutput();
      
      // Sum differences with all other cells
      PIANO_KEYS.forEach((_, j) => {
        if (i !== j) {
          const otherBit = adaptiveSystem.cells[j].getBitOutput();
          differenceSum += Math.abs(currentBit - otherBit);
        }
      });
      
      const avgDifference = differenceSum / K;
      const timePenalty = lambda * cell.getTimeSinceLastFiring();
      
      scores[i] = avgDifference - timePenalty;
    });
    
    return scores;
  }, [adaptiveSystem]);

  // Calculate base excitement increase based on novelty
  const calculateBaseExcitementIncrease = useCallback((currentNoteIndex, lastNoteIndex, noveltyScore) => {
    if (lastNoteIndex === null) return 0.08; // Moderate initial excitement
    
    // Base excitement now influenced by novelty score
    const distance = Math.abs(currentNoteIndex - lastNoteIndex);
    const maxDistance = PIANO_KEYS.length - 1;
    const normalizedDistance = distance / maxDistance;
    
    // Combine distance-based excitement with novelty - balanced gains
    const distanceExcitement = 0.04 + 0.15 * (1 - Math.exp(-3 * normalizedDistance)); // Moderate gains
    const noveltyMultiplier = 1 + Math.max(0, noveltyScore) * 1.5; // Moderate novelty amplification
    
    return distanceExcitement * noveltyMultiplier;
  }, []);

  // Calculate distance-based multiplication factor
  const calculateDistanceMultiplier = useCallback((currentNoteIndex, lastNoteIndex) => {
    if (lastNoteIndex === null) return 1.0;
    
    const distance = Math.abs(currentNoteIndex - lastNoteIndex);
    const maxDistance = PIANO_KEYS.length - 1;
    
    // Distance multiplier: close notes get much gentler penalty
    // Adjacent keys (distance=1) get ~0.75, far keys get ~0.95
    const normalizedDistance = distance / maxDistance;
    return 0.7 + 0.25 * normalizedDistance; // Range from 0.7 to 0.95 (much gentler)
  }, []);

  // Detect repetitive patterns in note sequences
  const detectPatternBoredom = useCallback((noteIndex, recentNotes) => {
    const newRecentNotes = [...recentNotes, noteIndex].slice(-8); // Keep last 8 notes
    
    // Check for repeating patterns
    let patternScore = 0;
    
    // Check for simple alternating patterns (A-B-A-B)
    if (newRecentNotes.length >= 4) {
      const last4 = newRecentNotes.slice(-4);
      if (last4[0] === last4[2] && last4[1] === last4[3] && last4[0] !== last4[1]) {
        patternScore += 0.3; // QWE-type patterns
      }
    }
    
    // Check for sequential runs (1-2-3-1-2-3)
    if (newRecentNotes.length >= 6) {
      const last6 = newRecentNotes.slice(-6);
      const first3 = last6.slice(0, 3);
      const second3 = last6.slice(3, 6);
      if (JSON.stringify(first3) === JSON.stringify(second3)) {
        patternScore += 0.4; // Repeated sequences
      }
    }
    
    // Check for same note repetition
    if (newRecentNotes.length >= 3) {
      const last3 = newRecentNotes.slice(-3);
      if (last3.every(note => note === last3[0])) {
        patternScore += 0.5; // Same key mashing
      }
    }
    
    return { newRecentNotes, patternScore };
  }, []);

  const updateSystemExcitement = useCallback((noteIndex, velocity = 0.5) => {
    setSystemState(prev => {
      // Detect pattern boredom
      const { newRecentNotes, patternScore } = detectPatternBoredom(noteIndex, prev.recentNotes);
      const newPatternBoredom = Math.min(1, prev.patternBoredom + patternScore);
      
      // Calculate novelty scores for all cells
      const noveltyScores = calculateNoveltyScores(noteIndex, velocity);
      const currentNoveltyScore = noveltyScores[noteIndex] || 0;
      
      // Find the cell with highest novelty score
      let maxNoveltyCell = null;
      let maxNoveltyScore = -Infinity;
      Object.entries(noveltyScores).forEach(([cellIndex, score]) => {
        if (score > maxNoveltyScore && score > adaptiveSystem.boredomBias) {
          maxNoveltyScore = score;
          maxNoveltyCell = parseInt(cellIndex);
        }
      });
      
      // Update color wheel position based on novelty winner
      let newWheelPosition = prev.noveltyEngine.wheelPosition;
      if (maxNoveltyCell !== null) {
        // Find least recently used wheel position
        const leastUsedPosition = adaptiveSystem.wheelUsageHistory.indexOf(
          Math.min(...adaptiveSystem.wheelUsageHistory)
        );
        
        newWheelPosition = leastUsedPosition;
        adaptiveSystem.wheelUsageHistory[leastUsedPosition]++;
        
        // Create dynamic color mapping for this note
        adaptiveSystem.colorWheelMappings[noteIndex] = {
          wheelPosition: newWheelPosition,
          timestamp: Date.now(),
          noveltyScore: maxNoveltyScore
        };
        
        // Reset boredom bias after successful competition
        adaptiveSystem.boredomBias = 0;
      } else {
        // Increase boredom bias when no cell wins competition
        adaptiveSystem.boredomBias = Math.min(1, adaptiveSystem.boredomBias + 0.01);
      }
      
      const baseIncrease = calculateBaseExcitementIncrease(noteIndex, prev.lastNoteIndex, currentNoveltyScore);
      const distanceMultiplier = calculateDistanceMultiplier(noteIndex, prev.lastNoteIndex);
      
      // Apply pattern boredom penalty
      const patternPenalty = 1 - (newPatternBoredom * 0.8); // Up to 80% reduction for patterns
      
      // Get current region and check regional repetition
      const currentRegion = getKeyRegion(noteIndex);
      const influencedRegions = getInfluencedRegions(noteIndex);
      const regionalHeat = getRegionalHeat(prev.regionRepetitionCounters, noteIndex);
      
      // Apply Pask's boredom: reduce repetition factor based on adaptive thresholds
      const currentCell = adaptiveSystem.cells[noteIndex];
      const thresholdFactor = 1 - Math.min(0.6, (currentCell.threshold - 0.1) / 0.9 * 0.6); // Stronger threshold influence
      
      const isStayingInRegion = !isDistantRegion(prev.lastRegion, currentRegion);
      let newRepetitionFactor;
      let newRegionCounters = { ...prev.regionRepetitionCounters };
      
      if (isStayingInRegion && regionalHeat > 0) {
        // More aggressive boredom - heat builds up and penalizes strongly
        const heatPenalty = Math.min(0.6, regionalHeat * 0.15); // Cap penalty at 60%, stronger rate
        const alpha = Math.max(0.3, distanceMultiplier - heatPenalty) * Math.max(0.7, thresholdFactor);
        newRepetitionFactor = Math.max(0.2, prev.currentRepetitionFactor * alpha); // Lower floor at 20%
        
        // Faster heat accumulation for boredom
        influencedRegions.forEach(region => {
          newRegionCounters[region] = (newRegionCounters[region] || 0) + 1.0; // Build heat faster
        });
      } else {
        newRepetitionFactor = Math.max(0.8, distanceMultiplier * Math.max(0.9, thresholdFactor));
        
        // Faster heat decay when moving regions
        Object.keys(newRegionCounters).forEach(region => {
          newRegionCounters[region] = Math.max(0, newRegionCounters[region] - 1.5);
        });
        
        // Start fresh heat in new regions
        influencedRegions.forEach(region => {
          newRegionCounters[region] = (newRegionCounters[region] || 0) + 0.5;
        });
      }
      
      const finalIncrease = baseIncrease * newRepetitionFactor * patternPenalty;
      const newExcitement = Math.min(1, prev.excitement + finalIncrease);
      
      // Update adaptive thresholds state for UI display
      const adaptiveThresholds = {};
      Object.entries(adaptiveSystem.cells).forEach(([index, cell]) => {
        adaptiveThresholds[index] = cell.threshold;
      });
      
      return {
        ...prev,
        excitement: newExcitement,
        lastNoteIndex: noteIndex,
        lastKeyPressTime: Date.now(),
        regionRepetitionCounters: newRegionCounters,
        currentRepetitionFactor: newRepetitionFactor,
        lastRegion: currentRegion,
        adaptiveThresholds,
        noveltyEngine: {
          activeCell: maxNoveltyCell,
          maxNoveltyScore: maxNoveltyScore,
          wheelPosition: newWheelPosition
        },
        recentNotes: newRecentNotes,
        patternBoredom: newPatternBoredom
      };
    });
  }, [calculateBaseExcitementIncrease, calculateDistanceMultiplier, calculateNoveltyScores, detectPatternBoredom, adaptiveSystem]);

  // Pask's adaptive boredom decay system with threshold updates
  useEffect(() => {
    const decayInterval = setInterval(() => {
      setSystemState(prev => {
        const decayRate = 0.12 / 60; // Moderate decay - takes ~8.3 seconds to decay from max to 0
        const newExcitement = Math.max(0, prev.excitement - decayRate);
        
        const timeSinceLastKey = Date.now() - (prev.lastKeyPressTime || 0);
        let newRepetitionFactor = prev.currentRepetitionFactor;
        let newRegionCounters = { ...prev.regionRepetitionCounters };
        
        // Update all adaptive threshold cells even when idle
        Object.values(adaptiveSystem.cells).forEach(cell => {
          cell.updateThreshold(0); // No envelope input when idle
        });
        
        // Decay wheel usage history over time (forgetting mechanism)
        adaptiveSystem.wheelUsageHistory = adaptiveSystem.wheelUsageHistory.map(usage => 
          Math.max(0, usage - 0.001)
        );
        
        // Increase boredom bias gradually when no input
        if (timeSinceLastKey > 500) {
          adaptiveSystem.boredomBias = Math.min(0.5, adaptiveSystem.boredomBias + 0.002);
        }
        
        if (timeSinceLastKey > 800) { // Faster recovery
          newRepetitionFactor = Math.min(1.0, newRepetitionFactor + 0.02); // Faster factor recovery
          
          // Faster heat cooling
          Object.keys(newRegionCounters).forEach(region => {
            newRegionCounters[region] = Math.max(0, newRegionCounters[region] - 0.05);
          });
        }
        
        // Decay pattern boredom over time
        const newPatternBoredom = Math.max(0, prev.patternBoredom - 0.01);
        
        // Update adaptive thresholds for UI
        const adaptiveThresholds = {};
        Object.entries(adaptiveSystem.cells).forEach(([index, cell]) => {
          adaptiveThresholds[index] = cell.threshold;
        });
        
        return {
          ...prev,
          excitement: newExcitement,
          currentRepetitionFactor: newRepetitionFactor,
          regionRepetitionCounters: newRegionCounters,
          adaptiveThresholds,
          patternBoredom: newPatternBoredom
        };
      });
    }, 16);

    return () => clearInterval(decayInterval);
  }, [adaptiveSystem]);

  // Pask's adaptive color wheel - 8 segment color wheel
  const getAdaptiveColor = useCallback((noteIndex, wheelPosition, excitementLevel, boredomBias) => {
    const colorWheel = [
      '#ff0000', // red
      '#ffbf00', // amber  
      '#80ff00', // yellow-green
      '#00ff00', // green
      '#00ffff', // cyan
      '#0080ff', // blue
      '#8000ff', // violet
      '#ffffff'  // open-white
    ];
    
    // Use wheel position to select color, with some randomness for emergent behavior
    let baseColor = colorWheel[wheelPosition % 8];
    
    // Check if this note has a recent dynamic mapping
    const mapping = adaptiveSystem.colorWheelMappings[noteIndex];
    if (mapping && Date.now() - mapping.timestamp < 10000) { // 10 second memory
      baseColor = colorWheel[mapping.wheelPosition % 8];
    }
    
    // Apply boredom desaturation - when bored, colors become muted
    const boredomFactor = Math.max(0.1, 1 - boredomBias * 2); // Higher boredom = more muted
    const excitementFactor = Math.max(0.3, excitementLevel); // Low excitement = more muted
    const colorIntensity = boredomFactor * excitementFactor;
    
    // Convert hex to RGB and apply intensity
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // When bored, blend towards gray
    const gray = 128;
    const newR = Math.round(r * colorIntensity + gray * (1 - colorIntensity));
    const newG = Math.round(g * colorIntensity + gray * (1 - colorIntensity));
    const newB = Math.round(b * colorIntensity + gray * (1 - colorIntensity));
    
    return `rgb(${newR}, ${newG}, ${newB})`;
  }, [adaptiveSystem]);

  const handleKeyPress = useCallback((key) => {
    if (pressedKeys.has(key.note)) return;
    
    setPressedKeys(prev => new Set([...prev, key.note]));
    
    if (pianoRef.current) {
      pianoRef.current.triggerAttack(key.note);
    }

    const noteIndex = PIANO_KEYS.findIndex(k => k.note === key.note);
    const velocity = 0.5 + Math.random() * 0.5; // Simulate velocity
    
    // Update system with Pask's adaptive algorithm first
    updateSystemExcitement(noteIndex, velocity);
    
    // Get adaptive color based on current wheel position, excitement, and boredom
    const adaptiveColor = getAdaptiveColor(
      noteIndex, 
      systemState.noveltyEngine.wheelPosition,
      systemState.excitement,
      adaptiveSystem.boredomBias
    );
    
    // Reduce intensity when bored - fewer effects, dimmer colors
    const boredomIntensityReduction = Math.max(0.1, 1 - adaptiveSystem.boredomBias);
    const excitementIntensity = 0.2 + (systemState.excitement * 0.6);
    const intensity = excitementIntensity * boredomIntensityReduction;
    
    // Create effects based on excitement and boredom level
    // When bored, create fewer, simpler effects
    const shouldCreateEffect = Math.random() < boredomIntensityReduction;
    
    if (shouldCreateEffect) {
      const baseX = (noteIndex - 8) * 1.2; // Wider spread
      const randomOffset = (Math.random() - 0.5) * 4 * boredomIntensityReduction; // Less random when bored
      const randomY = (Math.random() - 0.5) * 3 * boredomIntensityReduction;
      
      const newEffect = {
        id: Date.now() + Math.random(),
        type: 'ripple',
        position: [baseX + randomOffset, randomY, (Math.random() - 0.5) * 2],
        color: adaptiveColor, // Use Pask's adaptive color with boredom desaturation
        intensity,
        note: key.note,
        timestamp: Date.now(),
        wheelPosition: systemState.noveltyEngine.wheelPosition,
        boredomLevel: adaptiveSystem.boredomBias
      };

      setActiveEffects(prev => [...prev, newEffect]);
    }

    // Auto-release after timeout if not manually released
    keyTimeouts.current.set(key.note, setTimeout(() => {
      handleKeyRelease(key);
    }, 500));
  }, [pressedKeys, systemState.excitement, systemState.noveltyEngine.wheelPosition, updateSystemExcitement, getAdaptiveColor]);

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
        <h1 className="text-3xl font-black tracking-tight mb-2" style={{ fontWeight: 900 }}>MUSICOLOUR</h1>
        <h3 className=" font-black tracking-tight mb-2">by Gordon Pask</h3>
      </div>
      
      {/* Power Bar */}
      <PowerBar excitement={systemState.excitement} />

      {/* Instructions */}
      <div className="absolute top-6 right-6 z-10 text-white text-right">
        <div className="text-sm opacity-75 space-y-1 font-bold">
          <div>Play the piano to create visual music</div>
          <div>Use keyboard: Q-P (white keys), 2-0 (black keys)</div>
          <div>System adapts to your musical patterns</div>
          <div className="text-xs opacity-50 mt-2 space-y-1 font-extrabold">
            <div>Repetition Factor: {systemState.currentRepetitionFactor.toFixed(3)}</div>
            <div>Current Region: {systemState.lastRegion !== null ? systemState.lastRegion : 'None'}</div>
            <div>Regional Heat: {systemState.lastRegion !== null ? 
              getRegionalHeat(systemState.regionRepetitionCounters, systemState.lastNoteIndex || 0).toFixed(1) : '0.0'
            }</div>
            <div className="border-t border-white border-opacity-20 pt-1 mt-2">
              <div>Active A-T Cell: {systemState.noveltyEngine.activeCell !== null ? systemState.noveltyEngine.activeCell : 'None'}</div>
              <div>Max Novelty: {systemState.noveltyEngine.maxNoveltyScore.toFixed(3)}</div>
              <div>Wheel Position: {systemState.noveltyEngine.wheelPosition}</div>
              <div>Boredom Bias: {adaptiveSystem.boredomBias.toFixed(3)}</div>
              {systemState.lastNoteIndex !== null && systemState.adaptiveThresholds[systemState.lastNoteIndex] && (
                <div>Last Threshold: {systemState.adaptiveThresholds[systemState.lastNoteIndex].toFixed(3)}</div>
              )}
            </div>
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
          
          {/* Lighting - dimmer when bored */}
          <ambientLight intensity={0.2 + 0.2 * (1 - adaptiveSystem.boredomBias)} />
          <pointLight 
            position={[5, 5, 5]} 
            intensity={0.4 + 0.4 * (1 - adaptiveSystem.boredomBias)} 
            color="#4ecdc4" 
          />
          <pointLight 
            position={[-5, 5, 5]} 
            intensity={0.4 + 0.4 * (1 - adaptiveSystem.boredomBias)} 
            color="#ff6b6b" 
          />

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
            const noteIndex = PIANO_KEYS.findIndex(k => k.note === note);
            
            // Apply boredom-aware coloring and intensity to background waves too
            const adaptiveColor = getAdaptiveColor(
              noteIndex,
              systemState.noveltyEngine.wheelPosition,
              systemState.excitement,
              adaptiveSystem.boredomBias
            );
            
            const boredomIntensityReduction = Math.max(0.1, 1 - adaptiveSystem.boredomBias);
            const waveIntensity = systemState.excitement * boredomIntensityReduction;
            
            return (
              <ColorWave
                key={note}
                color={adaptiveColor}
                intensity={waveIntensity}
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