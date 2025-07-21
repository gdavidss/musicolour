// Comprehensive musicality metrics for MusiColour
// Based on research from MusPy, Friberg et al., and music theory

// Piano keys mapping
const PIANO_KEYS = [
  'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
  'C5', 'C#5', 'D5', 'D#5', 'E5'
];

// Note to MIDI number conversion
const noteToMidi = (note) => {
  const noteMap = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11};
  const noteName = note.slice(0, -1);
  const octave = parseInt(note.slice(-1));
  return noteMap[noteName] + (octave + 1) * 12;
};

// Interval quality classification
const getIntervalQuality = (interval) => {
  interval = Math.abs(interval) % 12;
  // Perfect consonances: unison, octave, fifth, fourth
  if ([0, 7, 5].includes(interval)) return 'perfect';
  // Imperfect consonances: major/minor thirds and sixths
  if ([3, 4, 8, 9].includes(interval)) return 'imperfect';
  // Dissonances: seconds, tritone, sevenths
  return 'dissonant';
};

// Scale detection
const detectScale = (notes) => {
  const pitchClasses = notes.map(n => noteToMidi(n) % 12);
  const pitchClassSet = new Set(pitchClasses);
  
  // Major scale pattern
  const majorScale = [0, 2, 4, 5, 7, 9, 11];
  const minorScale = [0, 2, 3, 5, 7, 8, 10];
  
  // Try each possible root
  for (let root = 0; root < 12; root++) {
    const majorMatch = majorScale.every(pc => pitchClassSet.has((pc + root) % 12));
    const minorMatch = minorScale.every(pc => pitchClassSet.has((pc + root) % 12));
    
    if (majorMatch) return { root, type: 'major', consistency: 1.0 };
    if (minorMatch) return { root, type: 'minor', consistency: 1.0 };
  }
  
  // Calculate best partial match
  let bestMatch = { root: 0, type: 'none', consistency: 0 };
  for (let root = 0; root < 12; root++) {
    const majorMatches = majorScale.filter(pc => pitchClassSet.has((pc + root) % 12)).length;
    const minorMatches = minorScale.filter(pc => pitchClassSet.has((pc + root) % 12)).length;
    
    if (majorMatches > bestMatch.consistency * 7) {
      bestMatch = { root, type: 'major', consistency: majorMatches / 7 };
    }
    if (minorMatches > bestMatch.consistency * 7) {
      bestMatch = { root, type: 'minor', consistency: minorMatches / 7 };
    }
  }
  
  return bestMatch;
};

// Calculate all musicality metrics
function calculateMusicalityMetrics(noteSequence, tempo = 120) {
  const msPerNote = (60 / tempo) * 1000;
  const notes = noteSequence.notes;
  const midiNotes = notes.map(noteToMidi);
  
  const metrics = {
    // 1. Harmonic metrics
    consonance: 0,
    scaleConsistency: 0,
    
    // 2. Melodic metrics
    melodicContour: 0,
    intervalDistribution: {},
    stepwiseMotion: 0,
    leapPenalty: 0,
    
    // 3. Rhythmic metrics
    rhythmicRegularity: 0,
    syncopation: 0,
    grooveConsistency: 0,
    
    // 4. Structural metrics
    phraseStructure: 0,
    repetitionBalance: 0,
    
    // 5. Overall metrics
    pitchVariety: 0,
    dynamicRange: 0,
    overallMusicality: 0
  };
  
  // 1. Calculate harmonic consonance
  let consonantIntervals = 0;
  let totalIntervals = 0;
  
  for (let i = 1; i < midiNotes.length; i++) {
    const interval = midiNotes[i] - midiNotes[i-1];
    const quality = getIntervalQuality(interval);
    
    if (quality === 'perfect') consonantIntervals += 1.0;
    else if (quality === 'imperfect') consonantIntervals += 0.7;
    
    totalIntervals++;
    
    // Track interval distribution
    const absInterval = Math.abs(interval);
    metrics.intervalDistribution[absInterval] = (metrics.intervalDistribution[absInterval] || 0) + 1;
  }
  
  metrics.consonance = totalIntervals > 0 ? consonantIntervals / totalIntervals : 0;
  
  // 2. Scale consistency
  const scale = detectScale(notes);
  metrics.scaleConsistency = scale.consistency;
  
  // 3. Melodic contour analysis
  let ascendingSteps = 0;
  let descendingSteps = 0;
  let repeatedNotes = 0;
  let stepwiseCount = 0;
  let leapCount = 0;
  let largeLeapCount = 0;
  
  for (let i = 1; i < midiNotes.length; i++) {
    const interval = midiNotes[i] - midiNotes[i-1];
    const absInterval = Math.abs(interval);
    
    if (interval > 0) ascendingSteps++;
    else if (interval < 0) descendingSteps++;
    else repeatedNotes++;
    
    // Stepwise motion (2 semitones or less)
    if (absInterval <= 2) stepwiseCount++;
    else {
      leapCount++;
      // Large leaps (more than an octave)
      if (absInterval > 12) largeLeapCount++;
    }
  }
  
  // Good melodic contour has balanced ascending/descending motion
  const totalMotion = ascendingSteps + descendingSteps + repeatedNotes;
  if (totalMotion > 0) {
    const balance = 1 - Math.abs(ascendingSteps - descendingSteps) / totalMotion;
    metrics.melodicContour = balance;
    metrics.stepwiseMotion = stepwiseCount / (totalMotion - repeatedNotes);
    
    // Penalize large leaps
    metrics.leapPenalty = 1 - (largeLeapCount / totalMotion);
  }
  
  // 4. Rhythmic regularity (simplified - would need actual timing in real implementation)
  // For now, assume regular timing
  metrics.rhythmicRegularity = 0.8; // Placeholder
  
  // 5. Pitch variety
  const uniquePitches = new Set(midiNotes);
  metrics.pitchVariety = Math.min(uniquePitches.size / 7, 1); // Normalize to 7 notes (typical scale)
  
  // 6. Phrase detection (simplified - look for patterns)
  const phraseLength = 4; // Typical phrase length
  let matchingPhrases = 0;
  let totalPhrases = 0;
  
  for (let i = 0; i < notes.length - phraseLength * 2; i += phraseLength) {
    const phrase1 = notes.slice(i, i + phraseLength).join('-');
    const phrase2 = notes.slice(i + phraseLength, i + phraseLength * 2).join('-');
    
    if (phrase1 === phrase2) matchingPhrases++;
    totalPhrases++;
  }
  
  metrics.phraseStructure = totalPhrases > 0 ? matchingPhrases / totalPhrases : 0;
  
  // 7. Repetition balance (not too much, not too little)
  const noteFrequency = {};
  notes.forEach(note => {
    noteFrequency[note] = (noteFrequency[note] || 0) + 1;
  });
  
  const frequencies = Object.values(noteFrequency);
  const maxFreq = Math.max(...frequencies);
  const avgFreq = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
  
  // Ideal repetition: some notes repeated but not too much
  metrics.repetitionBalance = 1 - Math.abs(maxFreq / notes.length - 0.2); // Target ~20% repetition
  
  // 8. Overall musicality score
  metrics.overallMusicality = (
    metrics.consonance * 0.20 +
    metrics.scaleConsistency * 0.15 +
    metrics.melodicContour * 0.15 +
    metrics.stepwiseMotion * 0.10 +
    metrics.leapPenalty * 0.10 +
    metrics.pitchVariety * 0.10 +
    metrics.phraseStructure * 0.10 +
    metrics.repetitionBalance * 0.10
  );
  
  return metrics;
}

// Test different musical examples
const musicalExamples = [
  {
    name: "Do-Re-Mi-Fa (Simple Scale)",
    notes: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
    expectedMusicality: 'high'
  },
  {
    name: "Twinkle Twinkle (With Repetition)",
    notes: ["C4", "C4", "G4", "G4", "A4", "A4", "G4", "F4", "F4", "E4", "E4", "D4", "D4", "C4"],
    expectedMusicality: 'high'
  },
  {
    name: "Random Notes",
    notes: ["C4", "F#4", "B4", "D#5", "G4", "C#5", "E4", "A#4", "D4", "G#4", "F4", "B4"],
    expectedMusicality: 'low'
  },
  {
    name: "Repetitive Pattern",
    notes: ["C4", "C4", "C4", "C4", "C4", "C4", "C4", "C4"],
    expectedMusicality: 'low'
  },
  {
    name: "Large Leaps",
    notes: ["C4", "C5", "C4", "C5", "C4", "C5", "C4", "C5"],
    expectedMusicality: 'low'
  },
  {
    name: "Chromatic Scale",
    notes: ["C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4", "C5"],
    expectedMusicality: 'medium'
  },
  {
    name: "Arpeggiated Chord (C Major)",
    notes: ["C4", "E4", "G4", "C5", "G4", "E4", "C4", "E4", "G4", "C5"],
    expectedMusicality: 'high'
  },
  {
    name: "Mary Had a Little Lamb",
    notes: ["E4", "D4", "C4", "D4", "E4", "E4", "E4", "D4", "D4", "D4", "E4", "G4", "G4"],
    expectedMusicality: 'high'
  }
];

// Test BPM sensitivity
const testBPMs = [60, 90, 120, 150, 180];

console.log("=== MUSICALITY METRICS TESTING ===\n");

// Test each example
musicalExamples.forEach(example => {
  console.log(`\nTesting: ${example.name}`);
  console.log(`Expected musicality: ${example.expectedMusicality}`);
  console.log(`Notes: ${example.notes.join(' ')}`);
  
  const metrics = calculateMusicalityMetrics(example, 120);
  
  console.log("\nDetailed Metrics:");
  console.log(`  Consonance: ${metrics.consonance.toFixed(3)}`);
  console.log(`  Scale Consistency: ${metrics.scaleConsistency.toFixed(3)}`);
  console.log(`  Melodic Contour: ${metrics.melodicContour.toFixed(3)}`);
  console.log(`  Stepwise Motion: ${metrics.stepwiseMotion.toFixed(3)}`);
  console.log(`  Leap Penalty: ${metrics.leapPenalty.toFixed(3)}`);
  console.log(`  Pitch Variety: ${metrics.pitchVariety.toFixed(3)}`);
  console.log(`  Phrase Structure: ${metrics.phraseStructure.toFixed(3)}`);
  console.log(`  Repetition Balance: ${metrics.repetitionBalance.toFixed(3)}`);
  console.log(`  OVERALL MUSICALITY: ${metrics.overallMusicality.toFixed(3)}`);
  
  // Check if it matches expectations
  const score = metrics.overallMusicality;
  let actualLevel = score > 0.7 ? 'high' : score > 0.4 ? 'medium' : 'low';
  
  if (actualLevel === example.expectedMusicality) {
    console.log(`✅ Matches expected musicality level`);
  } else {
    console.log(`❌ Expected ${example.expectedMusicality}, got ${actualLevel}`);
  }
  
  console.log("---");
});

// Test how BPM affects perception
console.log("\n=== BPM SENSITIVITY TEST ===");
console.log("Testing 'Twinkle Twinkle' at different tempos:\n");

testBPMs.forEach(bpm => {
  const metrics = calculateMusicalityMetrics(musicalExamples[1], bpm);
  console.log(`BPM ${bpm}: Musicality = ${metrics.overallMusicality.toFixed(3)}`);
}); 