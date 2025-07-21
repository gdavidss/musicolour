// Musicality-based excitement system for MusiColour
// This system rewards musical playing rather than just novelty

const PIANO_KEYS = [
  'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
  'C5', 'C#5', 'D5', 'D#5', 'E5'
];

// Convert note to MIDI number
const noteToMidi = (note) => {
  const noteMap = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11};
  const noteName = note.slice(0, -1);
  const octave = parseInt(note.slice(-1));
  return noteMap[noteName] + (octave + 1) * 12;
};

// Musical context tracking
class MusicalContext {
  constructor() {
    this.recentNotes = [];
    this.recentTimings = [];
    this.keySignature = null;
    this.beatGrid = [];
    this.phraseBuffer = [];
    this.harmonicContext = [];
  }
  
  addNote(note, timestamp) {
    this.recentNotes.push(note);
    this.recentTimings.push(timestamp);
    
    // Keep only recent history
    if (this.recentNotes.length > 16) {
      this.recentNotes.shift();
      this.recentTimings.shift();
    }
  }
  
  detectKey() {
    if (this.recentNotes.length < 4) return null;
    
    const pitchClasses = this.recentNotes.map(n => noteToMidi(n) % 12);
    const pitchClassCounts = {};
    
    pitchClasses.forEach(pc => {
      pitchClassCounts[pc] = (pitchClassCounts[pc] || 0) + 1;
    });
    
    // Simple key detection based on most common notes
    const majorScales = {
      'C': [0, 2, 4, 5, 7, 9, 11],
      'G': [7, 9, 11, 0, 2, 4, 6],
      'D': [2, 4, 6, 7, 9, 11, 1],
      'A': [9, 11, 1, 2, 4, 6, 8],
      'E': [4, 6, 8, 9, 11, 1, 3],
      'F': [5, 7, 9, 10, 0, 2, 4]
    };
    
    let bestKey = null;
    let bestScore = 0;
    
    for (const [key, scale] of Object.entries(majorScales)) {
      let score = 0;
      for (const pc of scale) {
        score += pitchClassCounts[pc] || 0;
      }
      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }
    
    return bestKey;
  }
  
  getBeatStrength(timestamp) {
    if (this.recentTimings.length < 3) return 0.5;
    
    // Calculate average interval
    const intervals = [];
    for (let i = 1; i < this.recentTimings.length; i++) {
      intervals.push(this.recentTimings[i] - this.recentTimings[i-1]);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const timeSinceLastBeat = (timestamp - this.recentTimings[this.recentTimings.length - 1]) % avgInterval;
    
    // Strong beat if close to expected beat time
    const beatAlignment = 1 - (timeSinceLastBeat / avgInterval);
    return beatAlignment;
  }
}

// Calculate musicality-based excitement
function calculateMusicalExcitement(noteSequence, tempo = 120) {
  const context = new MusicalContext();
  let excitement = 0;
  let lastNoteIndex = null;
  
  const decayRate = 0.05 / 60; // Slower decay for musical playing
  const msPerNote = (60 / tempo) * 1000;
  
  console.log(`\nTesting "${noteSequence.name}" at ${tempo} BPM`);
  console.log('Note sequence:', noteSequence.notes.join(' -> '));
  
  for (let i = 0; i < noteSequence.notes.length; i++) {
    const note = noteSequence.notes[i];
    const noteIndex = PIANO_KEYS.indexOf(note);
    const timestamp = i * msPerNote;
    
    context.addNote(note, timestamp);
    
    // Apply decay
    const framesElapsed = Math.floor(msPerNote / (1000/60));
    excitement = Math.max(0, excitement - (decayRate * framesElapsed));
    
    // Calculate musical components
    const components = {
      harmonic: 0,
      melodic: 0,
      rhythmic: 0,
      structural: 0
    };
    
    // 1. Harmonic component
    if (lastNoteIndex !== null) {
      const interval = Math.abs(noteIndex - lastNoteIndex);
      
      // Consonant intervals get bonus
      if ([0, 3, 4, 5, 7, 8, 9, 12].includes(interval)) {
        components.harmonic = 0.03;
      } else if ([1, 2, 6, 10, 11].includes(interval)) {
        components.harmonic = 0.01;
      }
      
      // In-key bonus
      const currentKey = context.detectKey();
      if (currentKey) {
        components.harmonic += 0.02;
      }
    }
    
    // 2. Melodic component
    if (lastNoteIndex !== null) {
      const interval = Math.abs(noteIndex - lastNoteIndex);
      
      // Stepwise motion bonus
      if (interval <= 2 && interval > 0) {
        components.melodic = 0.04;
      }
      // Small leaps are good
      else if (interval <= 5) {
        components.melodic = 0.03;
      }
      // Large leaps need resolution
      else if (interval > 7) {
        components.melodic = -0.01;
      }
      
      // Melodic contour - avoid too much repetition
      const last3Notes = context.recentNotes.slice(-3);
      if (last3Notes.length === 3 && last3Notes[0] === last3Notes[1] && last3Notes[1] === last3Notes[2]) {
        components.melodic -= 0.02;
      }
    }
    
    // 3. Rhythmic component
    const beatStrength = context.getBeatStrength(timestamp);
    components.rhythmic = beatStrength * 0.03;
    
    // Tempo appropriateness
    if (tempo >= 80 && tempo <= 140) {
      components.rhythmic += 0.02;
    } else if (tempo < 60 || tempo > 180) {
      components.rhythmic -= 0.01;
    }
    
    // 4. Structural component (phrase detection)
    if (i > 0 && i % 4 === 0) {
      // Check for phrase repetition
      const currentPhrase = noteSequence.notes.slice(i-4, i).join('-');
      const previousPhrase = i >= 8 ? noteSequence.notes.slice(i-8, i-4).join('-') : '';
      
      if (currentPhrase === previousPhrase) {
        components.structural = 0.02; // Repetition is good in moderation
      }
    }
    
    // Calculate total excitement gain
    const musicalityScore = (
      components.harmonic +
      components.melodic +
      components.rhythmic +
      components.structural
    );
    
    // Apply tempo-based multiplier
    const tempoMultiplier = tempo >= 60 && tempo <= 150 ? 1.0 : 0.7;
    
    const excitementGain = musicalityScore * tempoMultiplier;
    excitement = Math.max(0, Math.min(1, excitement + excitementGain));
    
    console.log(`Note ${i+1}: ${note} -> Excitement: ${excitement.toFixed(3)} (gain: ${excitementGain.toFixed(3)})`);
    
    lastNoteIndex = noteIndex;
  }
  
  const timeToComplete = (noteSequence.notes.length * msPerNote) / 1000;
  console.log(`Final excitement: ${excitement.toFixed(3)} after ${timeToComplete.toFixed(1)} seconds`);
  
  return excitement;
}

// Test examples
const musicalExamples = [
  {
    name: "Do-Re-Mi-Fa (C Major Scale)",
    notes: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"]
  },
  {
    name: "Twinkle Twinkle",
    notes: ["C4", "C4", "G4", "G4", "A4", "A4", "G4", "F4", "F4", "E4", "E4", "D4", "D4", "C4"]
  },
  {
    name: "Arpeggiated C Major",
    notes: ["C4", "E4", "G4", "C5", "G4", "E4", "C4", "E4", "G4", "C5", "G4", "E4"]
  },
  {
    name: "Random Jumping",
    notes: ["C4", "B4", "C#4", "A4", "D#4", "G4", "C5", "D4", "F#4", "E4"]
  },
  {
    name: "Single Note Spam",
    notes: ["C4", "C4", "C4", "C4", "C4", "C4", "C4", "C4", "C4", "C4"]
  },
  {
    name: "Musical Phrase (Happy Birthday)",
    notes: ["C4", "C4", "D4", "C4", "F4", "E4", "C4", "C4", "D4", "C4", "G4", "F4"]
  },
  {
    name: "Jazz-like Pattern",
    notes: ["C4", "E4", "G4", "A#4", "C5", "A#4", "G4", "E4", "D4", "F4", "A4", "C5"]
  }
];

// Test at different tempos
const tempos = [60, 90, 120, 150, 180, 300];

console.log("=== MUSICALITY-BASED EXCITEMENT TESTING ===");

// Test each example at 120 BPM
console.log("\n--- Testing different musical patterns at 120 BPM ---");
musicalExamples.forEach(example => {
  const excitement = calculateMusicalExcitement(example, 120);
  
  if (excitement > 0.8) {
    console.log(`✅ High musical excitement achieved!`);
  } else if (excitement > 0.5) {
    console.log(`⚠️  Moderate musical excitement`);
  } else {
    console.log(`❌ Low musical excitement - needs more musicality`);
  }
});

// Test tempo sensitivity
console.log("\n--- Testing tempo sensitivity with Twinkle Twinkle ---");
tempos.forEach(tempo => {
  const excitement = calculateMusicalExcitement(musicalExamples[1], tempo);
  console.log(`${tempo} BPM: Final excitement = ${excitement.toFixed(3)}`);
});

// Calculate time to reach max excitement for good playing
console.log("\n--- Time to reach max excitement ---");
const extendedScale = {
  name: "Extended Musical Playing",
  notes: []
};

// Create a longer musical sequence
for (let i = 0; i < 5; i++) {
  extendedScale.notes.push(...["C4", "D4", "E4", "F4", "G4", "F4", "E4", "D4"]);
  extendedScale.notes.push(...["C4", "E4", "G4", "C5", "G4", "E4", "C4", "G4"]);
}

const finalExcitement = calculateMusicalExcitement(extendedScale, 120);
console.log(`\nExtended musical playing reached ${finalExcitement.toFixed(3)} excitement`); 