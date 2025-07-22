import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import FluidCanvas from './FluidCanvas';
import { createFluidSimulation } from './webgl-fluid-wrapper';
import SettingsPanel from './SettingsPanel';
import MidiInputSelector from './MidiInputSelector';

// Initialize Tone.js - REMOVED from here, will be started by user gesture.
// Tone.start();

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
  
  // Constants for animation
  const ANIMATION_SPEED = 0.3; // Units per second (0 to 1 scale)
  
  // Update target when excitement changes
  useEffect(() => {
    setTargetExcitement(excitement);
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
  
  const getMoodLabel = (level) => {
    if (level > 0.7) return 'EXCITED';
    if (level < 0.2) return 'BORED';
    return 'NEUTRAL';
  };

  const currentColor = getInterpolatedColor(displayExcitement);
  const moodLabel = getMoodLabel(displayExcitement);
  
  // Calculate fill heights
  const fillHeight = Math.max(2, displayExcitement * 98 + 2);
  const targetHeight = Math.max(2, targetExcitement * 98 + 2);

  return (
    <div className="fixed left-6 top-1/2 transform -translate-y-1/2 z-20">
      {/* Thermometer container */}
      <div className="relative w-8 h-96 bg-black bg-opacity-30 rounded-full border border-white border-opacity-20 overflow-hidden shadow-lg">
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
        
        {/* Main fill with smooth color transition */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-full"
          style={{
            height: `${fillHeight}%`,
            backgroundColor: currentColor,
            boxShadow: `0 0 20px ${currentColor}40`
          }}
        />
        
        {/* Gain/Loss indicator with gradient */}
        {Math.abs(targetExcitement - displayExcitement) > 0.01 && (
          <>
            {/* Soft gradient fill between current and target */}
            <div
              className="absolute left-0 right-0 rounded-full pointer-events-none"
              style={{
                bottom: Math.min(fillHeight, targetHeight) + '%',
                height: Math.abs(targetHeight - fillHeight) + '%',
                background: `linear-gradient(${targetExcitement > displayExcitement ? 'to top' : 'to bottom'}, 
                  ${currentColor}00 0%, 
                  ${currentColor}20 20%, 
                  ${currentColor}30 50%, 
                  ${currentColor}20 80%, 
                  ${currentColor}00 100%)`,
                opacity: Math.min(0.8, Math.abs(targetExcitement - displayExcitement) * 2),
                transition: 'opacity 0.3s ease-out'
              }}
            />
            
            {/* Target position indicator */}
            <div
              className="absolute left-0 right-0 h-0.5 rounded-full"
              style={{
                bottom: `${targetHeight}%`,
                backgroundColor: getInterpolatedColor(targetExcitement),
                opacity: Math.min(0.9, Math.abs(targetExcitement - displayExcitement) * 3),
                boxShadow: `0 0 8px ${getInterpolatedColor(targetExcitement)}`,
                transform: 'translateY(50%)',
                transition: 'opacity 0.2s ease-out',
                animation: Math.abs(targetExcitement - displayExcitement) > 0.05 ? 'subtlePulse 1.5s ease-in-out infinite' : 'none'
              }}
            />
          </>
        )}
        
        {/* Glow effect */}
        <div
          className="absolute bottom-0 left-0 right-0 opacity-60 rounded-full blur-sm"
          style={{
            height: `${fillHeight}%`,
            backgroundColor: currentColor
          }}
        />
      </div>
      
      {/* Label */}
      <div 
        className="text-xs font-mono mt-2 text-center font-black tracking-wide transition-all duration-300"
        style={{ 
          color: currentColor, 
          fontWeight: 900
        }}
      >
        {moodLabel}
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

// Fluid simulation will replace the 3D effects

function MusicolourApp() {
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const fluidCanvasRef = useRef(null);
  const [selectedMidiInput, setSelectedMidiInput] = useState(null);
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // ---------------- TUNABLE PARAMETERS ----------------
  const paramDefs = {
    baseExcitementBase: { label: 'Base Excitement', min: 0, max: 0.05, step: 0.001, default: 0.01 },
    baseExcitementDistanceScale: { label: 'Distance Scale', min: 0, max: 0.05, step: 0.001, default: 0.015 },
    noveltyMultiplier: { label: 'Novelty Multiplier', min: 0, max: 1, step: 0.01, default: 0.2 },
    distanceMultiplierMin: { label: 'Dist Mult Min', min: 0.4, max: 1, step: 0.01, default: 0.7 },
    distanceMultiplierScale: { label: 'Dist Mult Scale', min: 0, max: 1, step: 0.01, default: 0.25 },
    patternPenaltyWeight: { label: 'Pattern Penalty', min: 0, max: 2, step: 0.01, default: 0.8 },
    speedPenaltyWeight: { label: 'Speed Penalty', min: 0, max: 2, step: 0.01, default: 1 },
    excitementDecayRate: { label: 'Decay Rate', min: 0.05, max: 0.5, step: 0.01, default: 0.15 },
    repetitionHeatPenaltyFactor: { label: 'Heat Penalty', min: 0, max: 0.5, step: 0.01, default: 0.15 }
  };

  const [params, setParams] = useState(() => {
    const initial = {};
    Object.entries(paramDefs).forEach(([key, def]) => {
      initial[key] = def.default;
    });
    return initial;
  });

  const handleParamChange = useCallback((key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  // Initialize Pask's adaptive system (restored)
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
  // ----------------------------------------------------
  
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
    patternBoredom: 0, // Track boredom from repetitive patterns
    lastKeyTimes: [], // Track timing of recent key presses
    speedPenalty: 0 // Penalty for playing too fast
  });

  const pianoRef = useRef(null);
  const keyTimeouts = useRef(new Map());

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
    if (lastNoteIndex === null) return params.baseExcitementBase; // Tunable initial value
    
    // Base excitement now influenced by novelty score
    const distance = Math.abs(currentNoteIndex - lastNoteIndex);
    const maxDistance = PIANO_KEYS.length - 1;
    const normalizedDistance = distance / maxDistance;
    
    // Combine distance-based excitement with novelty - tuned for 60-second goal
    const distanceExcitement = params.baseExcitementBase + params.baseExcitementDistanceScale * (1 - Math.exp(-3 * normalizedDistance));
    const noveltyMultiplier = 1 + Math.max(0, noveltyScore) * params.noveltyMultiplier;
    
    return distanceExcitement * noveltyMultiplier;
  }, [params]);

  // Calculate distance-based multiplication factor
  const calculateDistanceMultiplier = useCallback((currentNoteIndex, lastNoteIndex) => {
    if (lastNoteIndex === null) return 1.0;
    
    const distance = Math.abs(currentNoteIndex - lastNoteIndex);
    const maxDistance = PIANO_KEYS.length - 1;
    
    // Distance multiplier: close notes get much gentler penalty
    // Adjacent keys (distance=1) get ~0.75, far keys get ~0.95
    const normalizedDistance = distance / maxDistance;
    return params.distanceMultiplierMin + params.distanceMultiplierScale * normalizedDistance;
  }, [params]);

  // Detect speed punishment - playing too fast reduces excitement
  const detectSpeedPunishment = useCallback((lastKeyTimes) => {
    const now = Date.now();
    const newKeyTimes = [...lastKeyTimes, now].slice(-10); // Keep last 10 key times for better analysis
    
    let speedPenalty = 0;
    let speedBonus = 0;
    
    if (newKeyTimes.length >= 3) {
      // Calculate intervals between recent keys
      const intervals = [];
      for (let i = 1; i < newKeyTimes.length; i++) {
        intervals.push(newKeyTimes[i] - newKeyTimes[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      
      // Check interval consistency (musical rhythm vs random mashing)
      const intervalVariance = intervals.reduce((sum, interval) => {
        return sum + Math.pow(interval - avgInterval, 2);
      }, 0) / intervals.length;
      const intervalStdDev = Math.sqrt(intervalVariance);
      
      // Punish if average interval is less than 100ms (very fast)
      if (avgInterval < 100) {
        speedPenalty = Math.min(0.8, (100 - avgInterval) / 100 * 0.8); // Increased penalty
        
        // Extra penalty for inconsistent fast playing (mashing)
        if (intervalStdDev > avgInterval * 0.5) {
          speedPenalty += 0.3;
        }
      }
      
      // Severe punishment for extremely fast playing (< 60ms)
      if (avgInterval < 60) {
        speedPenalty += 0.6; // Increased penalty
      }
      
      // Complete punishment for key mashing (< 30ms)
      if (avgInterval < 30) {
        speedPenalty = 1.5; // Even higher penalty
      }
      
      // NEW: Reward consistent rhythmic playing (musical timing)
      if (avgInterval > 150 && avgInterval < 500 && intervalStdDev < avgInterval * 0.2) {
        speedBonus = -0.1; // Small bonus for rhythmic consistency
      }
    }
    
    return { 
      newKeyTimes, 
      speedPenalty: Math.max(0, speedPenalty + speedBonus) 
    };
  }, []);

  // Detect repetitive patterns in note sequences - enhanced for musical detection
  const detectPatternBoredom = useCallback((noteIndex, recentNotes) => {
    const newRecentNotes = [...recentNotes, noteIndex].slice(-16); // Keep last 16 notes for better analysis
    
    // Check for repeating patterns
    let patternScore = 0;
    let musicalityBonus = 0;
    
    // Check for simple alternating patterns (A-B-A-B)
    if (newRecentNotes.length >= 4) {
      const last4 = newRecentNotes.slice(-4);
      if (last4[0] === last4[2] && last4[1] === last4[3] && last4[0] !== last4[1]) {
        patternScore += 0.4; // Increased penalty for simple alternation
      }
    }
    
    // Check for sequential runs (1-2-3-1-2-3)
    if (newRecentNotes.length >= 6) {
      const last6 = newRecentNotes.slice(-6);
      const first3 = last6.slice(0, 3);
      const second3 = last6.slice(3, 6);
      if (JSON.stringify(first3) === JSON.stringify(second3)) {
        patternScore += 0.5; // Increased penalty for exact repetition
      }
    }
    
    // Check for same note repetition
    if (newRecentNotes.length >= 3) {
      const last3 = newRecentNotes.slice(-3);
      if (last3.every(note => note === last3[0])) {
        patternScore += 0.7; // Heavy penalty for same key mashing
      }
    }
    
    // NEW: Check for musical intervals (reward musical patterns)
    if (newRecentNotes.length >= 4) {
      const intervals = [];
      for (let i = 1; i < newRecentNotes.length; i++) {
        intervals.push(newRecentNotes[i] - newRecentNotes[i-1]);
      }
      
      // Check for musical intervals (2, 3, 4, 5, 7 semitones)
      const musicalIntervals = [2, 3, 4, 5, 7, -2, -3, -4, -5, -7];
      const musicalCount = intervals.filter(i => musicalIntervals.includes(i)).length;
      if (musicalCount > intervals.length * 0.6) {
        musicalityBonus = -0.3; // Reduce boredom for musical intervals
      }
      
      // Check for random jumps (penalty for non-musical randomness)
      const randomJumps = intervals.filter(i => Math.abs(i) > 8).length;
      if (randomJumps > intervals.length * 0.3) {
        patternScore += 0.3; // Penalty for random large jumps
      }
    }
    
    // NEW: Check for scale-like patterns (reward)
    if (newRecentNotes.length >= 7) {
      const last7 = newRecentNotes.slice(-7);
      let isAscending = true;
      let isDescending = true;
      
      for (let i = 1; i < last7.length; i++) {
        if (last7[i] <= last7[i-1]) isAscending = false;
        if (last7[i] >= last7[i-1]) isDescending = false;
      }
      
      if (isAscending || isDescending) {
        musicalityBonus = -0.4; // Reward scale-like patterns
      }
    }
    
    return { 
      newRecentNotes, 
      patternScore: Math.max(0, patternScore + musicalityBonus) 
    };
  }, []);

  const updateSystemExcitement = useCallback((noteIndex, velocity = 0.5) => {
    setSystemState(prev => {
      // Detect speed punishment
      const { newKeyTimes, speedPenalty } = detectSpeedPunishment(prev.lastKeyTimes);
      const newSpeedPenalty = Math.min(1, prev.speedPenalty + speedPenalty);
      
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
      }
      
      // Get regional heat (how often notes in this region have been played)
      const currentRegion = getKeyRegion(noteIndex);
      let newRepetitionFactor = prev.currentRepetitionFactor;
      const newRegionCounters = { ...prev.regionRepetitionCounters };
      
      if (isDistantRegion(prev.lastRegion, currentRegion)) {
        // Reset repetition factor if playing in a new, distant area
        newRepetitionFactor = 1.0;
      } else {
        // Increase repetition factor if staying in the same area
        newRepetitionFactor = Math.min(3.0, newRepetitionFactor + 0.1);
      }
      
      // Update region counters and calculate heat penalty
      const influencedRegions = getInfluencedRegions(noteIndex);
      influencedRegions.forEach(r => {
        newRegionCounters[r] = (newRegionCounters[r] || 0) + 1;
      });
      const regionalHeat = getRegionalHeat(newRegionCounters, noteIndex);
      const heatPenalty = 1.0 - Math.min(0.8, regionalHeat * params.repetitionHeatPenaltyFactor);
      
      // Calculate base excitement increase (now with novelty)
      const baseIncrease = calculateBaseExcitementIncrease(noteIndex, prev.lastNoteIndex, currentNoveltyScore);
      
      // Calculate distance multiplier
      const distanceMultiplier = calculateDistanceMultiplier(noteIndex, prev.lastNoteIndex);
      
      // Combine all factors for excitement calculation
      const totalPenaltyFactor = (1 - newPatternBoredom * params.patternPenaltyWeight) * (1 - newSpeedPenalty * params.speedPenaltyWeight) * heatPenalty;
      
      let excitementChange = baseIncrease * totalPenaltyFactor;
      
      // Apply gradual decay based on distance multiplier
      const newExcitement = (prev.excitement + excitementChange) * distanceMultiplier;
      
      // Store current adaptive thresholds for visualization/debugging
      const adaptiveThresholds = {};
      Object.entries(adaptiveSystem.cells).forEach(([id, cell]) => {
        adaptiveThresholds[id] = cell.threshold;
      });
      
      // Return updated state
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
        patternBoredom: newPatternBoredom,
        lastKeyTimes: newKeyTimes,
        speedPenalty: newSpeedPenalty
      };
    });
  }, [calculateBaseExcitementIncrease, calculateDistanceMultiplier, calculateNoveltyScores, detectPatternBoredom, detectSpeedPunishment, adaptiveSystem, params]);

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

  const handleKeyPress = useCallback((key, velocity = 0.75) => {
    if (pressedKeys.has(key.note)) return;
    
    setPressedKeys(prev => new Set([...prev, key.note]));
    
    if (pianoRef.current) {
      pianoRef.current.triggerAttack(key.note);
    }

    const noteIndex = PIANO_KEYS.findIndex(k => k.note === key.note);
    
    // Update system with Pask's adaptive algorithm first
    updateSystemExcitement(noteIndex, velocity);
    
    // Trigger fluid splats based on excitement level
    if (fluidCanvasRef.current) {
      // Determine number of splats based on excitement level
      let numSplats = 1;
      if (systemState.excitement > 0.9) {
        numSplats = 8;
      } else if (systemState.excitement > 0.75) {
        numSplats = 4;
      } else if (systemState.excitement > 0.5) {
        numSplats = 3;
      } else if (systemState.excitement > 0.25) {
        numSplats = 2;
      }
      
      // Trigger multiple splats
      for (let i = 0; i < numSplats; i++) {
        fluidCanvasRef.current.triggerSplat(systemState.excitement, velocity);
      }
    }

    // Auto-release after timeout if not manually released
    keyTimeouts.current.set(key.note, setTimeout(() => {
      handleKeyRelease(key);
    }, 500));
  }, [pressedKeys, systemState.excitement, updateSystemExcitement, handleKeyRelease]);

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
  },[handleKeyPress, handleKeyRelease, pressedKeys]);

  // MIDI event handling
    useEffect(() => {
      if (!selectedMidiInput) return;
  
      const handleMidiMessage = (event) => {
        const [command, noteNumber, velocity] = event.data;
        const noteName = Tone.Frequency(noteNumber, 'midi').toNote();
        const keyData = PIANO_KEYS.find(k => k.note === noteName);
  
        if (!keyData) return;
  
        if (command === 144 && velocity > 0) { // Note On
          handleKeyPress(keyData, velocity / 127);
        } else if (command === 128 || (command === 144 && velocity === 0)) { // Note Off
          handleKeyRelease(keyData);
        }
      };
  
      selectedMidiInput.addEventListener('midimessage', handleMidiMessage);
  
      return () => {
        selectedMidiInput.removeEventListener('midimessage', handleMidiMessage);
      };
    }, [selectedMidiInput, handleKeyPress, handleKeyRelease]);

  // Pask's adaptive boredom decay system with threshold updates
  useEffect(() => {
    const decayInterval = setInterval(() => {
      setSystemState(prev => {
        const decayRate = params.excitementDecayRate / 60; // Tunable decay rate
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
        
        // Decay pattern boredom and speed penalty over time (declare early)
        const newPatternBoredom = Math.max(0, prev.patternBoredom - 0.01);
        const newSpeedPenalty = Math.max(0, prev.speedPenalty - 0.02); // Faster decay for speed penalty
        
        // Increase boredom bias gradually when no input, but decay when patterns/speed improve
        if (timeSinceLastKey > 500) {
          adaptiveSystem.boredomBias = Math.min(0.5, adaptiveSystem.boredomBias + 0.002);
        } else {
          // Decay boredom bias when actively playing with good patterns/speed
          const totalBoredomLevel = newPatternBoredom + newSpeedPenalty;
          if (totalBoredomLevel < 0.3) {
            adaptiveSystem.boredomBias = Math.max(0, adaptiveSystem.boredomBias - 0.01);
          }
        }
        
        // Return updated state
        return {
          ...prev,
          excitement: newExcitement,
          lastKeyPressTime: prev.lastKeyPressTime,
          currentRepetitionFactor: newRepetitionFactor,
          regionRepetitionCounters: newRegionCounters,
          patternBoredom: newPatternBoredom,
          speedPenalty: newSpeedPenalty,
        };
      });
    }, 1000 / 60); // 60 times per second

    return () => clearInterval(decayInterval);
  }, [adaptiveSystem, params.excitementDecayRate]);

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

  if (!isAudioStarted) {
    return (
      <div className="w-full h-screen bg-black flex justify-center items-center text-white">
        <button
          onClick={async () => {
            await Tone.start();
            setIsAudioStarted(true);
          }}
          className="p-6 bg-blue-600 rounded-lg text-2xl font-bold hover:bg-blue-700 transition-colors shadow-lg"
        >
          Click Here to Start Musicolour
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        paramDefs={paramDefs}
        params={params}
        onParamChange={handleParamChange}
        onDeviceSelected={setSelectedMidiInput}
      />
      
      {/* Settings Button */}
      {!isSettingsOpen && (
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="fixed top-6 right-6 z-40 p-3 bg-gray-800 bg-opacity-70 rounded-full text-white hover:bg-gray-700 transition-colors shadow-lg"
          aria-label="Open settings"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        </button>
      )}

      {/* Header */}
      <div className="absolute top-6 left-20 z-10 text-white">
        <h1 className="text-3xl font-black tracking-tight mb-2" style={{ fontWeight: 900 }}>MUSICOLOUR</h1>
        <h3 className=" tracking-tight">By Gui Dávid. Inspired by Gordon Pask.</h3>
      </div>
      
      {/* Power Bar */}
      <PowerBar excitement={systemState.excitement} />



      {/* Fluid Canvas */}
      <div className="relative h-2/3">
        <FluidCanvas 
          ref={fluidCanvasRef}
          className="w-full h-full"
        />
        

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