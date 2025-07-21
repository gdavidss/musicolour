// Test musical phrases to tune excitement parameters
// Simulating the MusiColour excitement calculation

// Piano keys mapping (same as in the app)
const PIANO_KEYS = [
  'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
  'C5', 'C#5', 'D5', 'D#5', 'E5'
];

// Simulate the excitement calculation
function simulateExcitement(noteSequence, tempo = 120) {
  let excitement = 0;
  let lastNoteIndex = null;
  let regionCounters = {};
  let currentRepetitionFactor = 1.0;
  let lastRegion = null;
  let recentNotes = [];
  let patternBoredom = 0;
  let lastKeyTimes = [];
  let speedPenalty = 0;
  
  const decayRate = 0.08 / 60; // per frame at 60fps (increased decay)
  const msPerNote = (60 / tempo) * 1000; // milliseconds per note
  
  console.log(`\nTesting "${noteSequence.name}" at ${tempo} BPM (${msPerNote}ms per note)`);
  console.log('Note sequence:', noteSequence.notes.join(' -> '));
  
  for (let i = 0; i < noteSequence.notes.length; i++) {
    const note = noteSequence.notes[i];
    const noteIndex = PIANO_KEYS.indexOf(note);
    
    if (noteIndex === -1) {
      console.log(`Warning: Note ${note} not found in piano keys`);
      continue;
    }
    
    // Simulate time passing (decay)
    const timeElapsed = msPerNote;
    const framesElapsed = Math.floor(timeElapsed / (1000/60));
    excitement = Math.max(0, excitement - (decayRate * framesElapsed));
    
    // Calculate base excitement (updated parameters)
    let baseIncrease;
    if (lastNoteIndex === null) {
      baseIncrease = 0.09; // 0.03 * 3 multiplier
    } else {
      const distance = Math.abs(noteIndex - lastNoteIndex);
      const maxDistance = PIANO_KEYS.length - 1;
      const normalizedDistance = distance / maxDistance;
      const distanceExcitement = 0.06 + 0.09 * (1 - Math.exp(-3 * normalizedDistance));
      const noveltyMultiplier = 1 + 0; // Simplified, no novelty score
      baseIncrease = distanceExcitement * noveltyMultiplier;
    }
    
    // Simple regional repetition (simplified)
    const currentRegion = Math.floor(noteIndex / 3);
    let newRepetitionFactor = 1.0;
    
    if (lastRegion !== null && Math.abs(currentRegion - lastRegion) < 2) {
      // Staying in similar region
      const heat = regionCounters[currentRegion] || 0;
      const heatPenalty = Math.min(0.7, heat * 0.15); // increased penalty
      newRepetitionFactor = Math.max(0.1, 0.9 - heatPenalty); // harsher penalty
      regionCounters[currentRegion] = (regionCounters[currentRegion] || 0) + 1.5;
    } else {
      newRepetitionFactor = 0.9;
      regionCounters[currentRegion] = (regionCounters[currentRegion] || 0) + 0.5;
    }
    
    // Simple pattern detection
    recentNotes.push(noteIndex);
    if (recentNotes.length > 8) recentNotes.shift();
    
    let patternScore = 0;
    if (recentNotes.length >= 4) {
      const last4 = recentNotes.slice(-4);
      if (last4[0] === last4[2] && last4[1] === last4[3] && last4[0] !== last4[1]) {
        patternScore += 0.3;
      }
    }
    patternBoredom = Math.min(1, patternBoredom + patternScore);
    patternBoredom = Math.max(0, patternBoredom - 0.01);
    
    // Simple speed penalty
    const now = i * msPerNote;
    lastKeyTimes.push(now);
    if (lastKeyTimes.length > 5) lastKeyTimes.shift();
    
    let currentSpeedPenalty = 0;
    if (lastKeyTimes.length >= 3) {
      const intervals = [];
      for (let j = 1; j < lastKeyTimes.length; j++) {
        intervals.push(lastKeyTimes[j] - lastKeyTimes[j - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      
      if (avgInterval < 100) {
        currentSpeedPenalty = Math.min(0.6, (100 - avgInterval) / 100 * 0.6);
      }
      if (avgInterval < 60) {
        currentSpeedPenalty += 0.5;
      }
      if (avgInterval < 30) {
        currentSpeedPenalty = 1.3;
      }
    }
    speedPenalty = Math.min(1, speedPenalty + currentSpeedPenalty);
    speedPenalty = Math.max(0, speedPenalty - 0.02);
    
    // Apply penalties
    const patternPenalty = 1 - (patternBoredom * 0.8);
    const speedPenaltyFactor = 1 - speedPenalty;
    
    let finalIncrease = baseIncrease * newRepetitionFactor * patternPenalty * speedPenaltyFactor;
    
    // Check for severe penalties
    const totalPenalty = (1 - patternPenalty) + (1 - speedPenaltyFactor) + (1 - newRepetitionFactor);
    if (totalPenalty > 1.0) {
      finalIncrease = -0.02;
    }
    
    excitement = Math.max(0, Math.min(1, excitement + finalIncrease));
    
    console.log(`Note ${i+1}: ${note} -> Excitement: ${excitement.toFixed(3)} (gain: ${finalIncrease.toFixed(3)})`);
    
    lastNoteIndex = noteIndex;
    lastRegion = currentRegion;
  }
  
  const timeToComplete = (noteSequence.notes.length * msPerNote) / 1000;
  console.log(`Final excitement: ${excitement.toFixed(3)} after ${timeToComplete.toFixed(1)} seconds`);
  return excitement;
}

// Test musical phrases
const musicalPhrases = [
  {
    name: "Do-Re-Mi-Fa (C Major Scale)",
    notes: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"]
  },
  {
    name: "Happy Birthday (simplified)",
    notes: ["C4", "C4", "D4", "C4", "F4", "E4", "C4", "C4", "D4", "C4", "G4", "F4"]
  },
  {
    name: "Twinkle Twinkle",
    notes: ["C4", "C4", "G4", "G4", "A4", "A4", "G4", "F4", "F4", "E4", "E4", "D4", "D4", "C4"]
  },
  {
    name: "Mary Had a Little Lamb",
    notes: ["E4", "D4", "C4", "D4", "E4", "E4", "E4", "D4", "D4", "D4", "E4", "G4", "G4"]
  },
  {
    name: "Chromatic Run",
    notes: ["C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4", "C5"]
  }
];

// Test at different tempos
const tempos = [60, 90, 120, 150];

console.log("=== MUSICAL PHRASE EXCITEMENT TESTING ===");

for (const phrase of musicalPhrases) {
  for (const tempo of tempos) {
    const excitement = simulateExcitement(phrase, tempo);
    if (excitement < 0.3) {
      console.log(`❌ Too low excitement for musical phrase at ${tempo} BPM`);
    } else if (excitement > 0.8) {
      console.log(`✅ Good excitement level for musical phrase at ${tempo} BPM`);
    } else {
      console.log(`⚠️  Moderate excitement for musical phrase at ${tempo} BPM`);
    }
  }
  console.log("---");
} 