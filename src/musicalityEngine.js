// Musicality Engine - Advanced musical pattern detection and scoring
// Based on music theory and cognitive musicology principles

// Musical intervals in semitones
const INTERVALS = {
  UNISON: 0,
  MINOR_SECOND: 1,
  MAJOR_SECOND: 2,
  MINOR_THIRD: 3,
  MAJOR_THIRD: 4,
  PERFECT_FOURTH: 5,
  TRITONE: 6,
  PERFECT_FIFTH: 7,
  MINOR_SIXTH: 8,
  MAJOR_SIXTH: 9,
  MINOR_SEVENTH: 10,
  MAJOR_SEVENTH: 11,
  OCTAVE: 12
};

// Common scales (as interval patterns from root)
const SCALES = {
  MAJOR: [0, 2, 4, 5, 7, 9, 11],
  NATURAL_MINOR: [0, 2, 3, 5, 7, 8, 10],
  HARMONIC_MINOR: [0, 2, 3, 5, 7, 8, 11],
  PENTATONIC_MAJOR: [0, 2, 4, 7, 9],
  PENTATONIC_MINOR: [0, 3, 5, 7, 10],
  BLUES: [0, 3, 5, 6, 7, 10],
  CHROMATIC: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
};

// Chord patterns (as intervals from root)
const CHORDS = {
  MAJOR_TRIAD: [0, 4, 7],
  MINOR_TRIAD: [0, 3, 7],
  DIMINISHED: [0, 3, 6],
  AUGMENTED: [0, 4, 8],
  MAJOR_SEVENTH: [0, 4, 7, 11],
  DOMINANT_SEVENTH: [0, 4, 7, 10],
  MINOR_SEVENTH: [0, 3, 7, 10]
};

// Common chord progressions (as scale degrees)
const PROGRESSIONS = {
  I_V_vi_IV: [0, 7, 9, 5], // Pop progression
  I_IV_V: [0, 5, 7], // Basic blues
  ii_V_I: [2, 7, 0], // Jazz cadence
  I_vi_IV_V: [0, 9, 5, 7], // 50s progression
  vi_IV_I_V: [9, 5, 0, 7], // Alternative pop
};

class MusicalityEngine {
  constructor() {
    this.noteHistory = [];
    this.timeHistory = [];
    this.chordBuffer = [];
    this.scaleContext = null;
    this.rhythmPattern = [];
    this.lastBeat = null;
    this.tempo = null;
    this.musicalityScore = 0;
    this.metrics = {
      melodicCoherence: 0,
      harmonicProgression: 0,
      rhythmicConsistency: 0,
      scaleAdherence: 0,
      phraseStructure: 0,
      dynamicVariation: 0
    };
  }

  reset() {
    this.noteHistory = [];
    this.timeHistory = [];
    this.chordBuffer = [];
    this.scaleContext = null;
    this.rhythmPattern = [];
    this.lastBeat = null;
    this.tempo = null;
    this.musicalityScore = 0;
    Object.keys(this.metrics).forEach(key => this.metrics[key] = 0);
  }

  // Main entry point - process a new note
  processNote(noteIndex, timestamp, velocity = 0.5) {
    // Add to history
    this.noteHistory.push(noteIndex);
    this.timeHistory.push(timestamp);
    
    // Keep history manageable
    if (this.noteHistory.length > 32) {
      this.noteHistory.shift();
      this.timeHistory.shift();
    }

    // Update all metrics
    this.updateRhythmicConsistency(timestamp);
    this.updateMelodicCoherence();
    this.updateScaleAdherence();
    this.updateHarmonicProgression();
    this.updatePhraseStructure();
    this.updateDynamicVariation(velocity);

    // Calculate overall musicality score
    this.calculateMusicalityScore();

    return {
      score: this.musicalityScore,
      metrics: { ...this.metrics },
      excitement: this.calculateExcitementBoost()
    };
  }

  // Rhythmic consistency - rewards steady tempo and rhythmic patterns
  updateRhythmicConsistency(timestamp) {
    if (this.timeHistory.length < 2) return;

    const intervals = [];
    for (let i = 1; i < this.timeHistory.length; i++) {
      intervals.push(this.timeHistory[i] - this.timeHistory[i-1]);
    }

    // Detect tempo
    const recentIntervals = intervals.slice(-8);
    const avgInterval = recentIntervals.reduce((a, b) => a + b, 0) / recentIntervals.length;
    
    // Calculate tempo consistency
    const variance = recentIntervals.reduce((sum, interval) => {
      return sum + Math.pow(interval - avgInterval, 2);
    }, 0) / recentIntervals.length;
    const stdDev = Math.sqrt(variance);
    let consistency = 1 - Math.min(1, stdDev / avgInterval);

    // Detect rhythmic patterns (e.g., syncopation, triplets)
    const rhythmScore = this.detectRhythmPatterns(intervals);

    // Musical tempo range with penalties for too fast/slow
    let tempoScore = 0;
    const bpm = 60000 / avgInterval; // Convert to BPM
    
    if (bpm >= 60 && bpm <= 180) {
      tempoScore = 1.0; // Perfect tempo range
    } else if (bpm >= 40 && bpm <= 240) {
      tempoScore = 0.7; // Acceptable range
    } else if (bpm > 240 && bpm <= 300) {
      tempoScore = 0.3; // Too fast
    } else if (bpm > 300) {
      tempoScore = 0; // Way too fast (key mashing)
    } else if (bpm < 40 && bpm >= 20) {
      tempoScore = 0.3; // Too slow
    } else {
      tempoScore = 0; // Way too slow
    }
    
    // Extra penalty for extremely fast playing (potential button mashing)
    if (avgInterval < 150) { // Less than 400 BPM
      tempoScore = 0;
      consistency *= 0.3; // Also reduce consistency score
    }

    this.metrics.rhythmicConsistency = consistency * 0.5 + rhythmScore * 0.3 + tempoScore * 0.2;
  }

  detectRhythmPatterns(intervals) {
    if (intervals.length < 4) return 0;

    // Check for common rhythmic patterns
    let patternScore = 0;

    // Steady beat
    const steadyBeat = intervals.every(i => Math.abs(i - intervals[0]) < intervals[0] * 0.1);
    if (steadyBeat) patternScore += 0.5;

    // Syncopation (alternating long-short)
    const syncopated = intervals.slice(-4).every((interval, i) => 
      i % 2 === 0 ? interval > intervals[0] * 1.3 : interval < intervals[0] * 0.7
    );
    if (syncopated) patternScore += 0.7;

    // Triplet feel (3 notes in the time of 2)
    if (intervals.length >= 3) {
      const tripletRatio = intervals[intervals.length-1] / intervals[intervals.length-3];
      if (Math.abs(tripletRatio - 0.667) < 0.1) patternScore += 0.6;
    }

    return Math.min(1, patternScore);
  }

  // Melodic coherence - rewards stepwise motion and melodic phrases
  updateMelodicCoherence() {
    if (this.noteHistory.length < 3) return;

    const recentNotes = this.noteHistory.slice(-8);
    const intervals = [];
    
    for (let i = 1; i < recentNotes.length; i++) {
      intervals.push(recentNotes[i] - recentNotes[i-1]);
    }

    // Analyze interval distribution
    let stepwiseMotion = 0;
    let leapMotion = 0;
    let repeatedNotes = 0;

    intervals.forEach(interval => {
      const absInterval = Math.abs(interval);
      if (absInterval === 0) repeatedNotes++;
      else if (absInterval <= 2) stepwiseMotion++;
      else if (absInterval >= 5) leapMotion++;
    });

    // Good melodies have mostly stepwise motion with occasional leaps
    const totalIntervals = intervals.length;
    const stepwiseRatio = stepwiseMotion / totalIntervals;
    const leapRatio = leapMotion / totalIntervals;
    const repetitionRatio = repeatedNotes / totalIntervals;

    // Ideal ratios based on music theory
    let coherenceScore = 0;
    coherenceScore += Math.min(1, stepwiseRatio * 1.5); // Reward stepwise motion
    coherenceScore += Math.min(0.3, leapRatio * 2); // Some leaps are good
    coherenceScore -= repetitionRatio * 0.5; // Penalize too much repetition

    // Check for melodic contour (arch, ascending, descending)
    const contourScore = this.analyzeMelodicContour(recentNotes);

    this.metrics.melodicCoherence = Math.max(0, Math.min(1, 
      coherenceScore * 0.6 + contourScore * 0.4
    ));
  }

  analyzeMelodicContour(notes) {
    if (notes.length < 4) return 0;

    // Calculate overall direction
    const firstNote = notes[0];
    const lastNote = notes[notes.length - 1];
    const middleIndex = Math.floor(notes.length / 2);
    const middleNote = notes[middleIndex];

    // Arch contour (up then down) - very musical
    const isArch = middleNote > firstNote && middleNote > lastNote;
    if (isArch) return 1;

    // Inverted arch (down then up)
    const isInvertedArch = middleNote < firstNote && middleNote < lastNote;
    if (isInvertedArch) return 0.9;

    // Ascending or descending lines
    const isAscending = notes.every((note, i) => i === 0 || note >= notes[i-1]);
    const isDescending = notes.every((note, i) => i === 0 || note <= notes[i-1]);
    if (isAscending || isDescending) return 0.7;

    // Wave pattern
    let direction = 0;
    let directionChanges = 0;
    for (let i = 1; i < notes.length; i++) {
      const newDirection = Math.sign(notes[i] - notes[i-1]);
      if (newDirection !== 0 && newDirection !== direction) {
        directionChanges++;
        direction = newDirection;
      }
    }
    if (directionChanges >= 2 && directionChanges <= 4) return 0.6;

    return 0.3;
  }

  // Scale adherence - detect and reward playing within a scale
  updateScaleAdherence() {
    if (this.noteHistory.length < 5) return;

    const recentNotes = this.noteHistory.slice(-12);
    const noteSet = new Set(recentNotes.map(n => n % 12)); // Reduce to pitch classes

    // Try to detect which scale is being used
    let bestScale = null;
    let bestScore = 0;

    Object.entries(SCALES).forEach(([scaleName, scaleIntervals]) => {
      // Try each possible root note
      for (let root = 0; root < 12; root++) {
        const scaleNotes = new Set(scaleIntervals.map(i => (root + i) % 12));
        
        // Calculate how many of our notes fit this scale
        let matches = 0;
        noteSet.forEach(note => {
          if (scaleNotes.has(note)) matches++;
        });

        const score = matches / noteSet.size;
        if (score > bestScore) {
          bestScore = score;
          bestScale = { name: scaleName, root, score };
        }
      }
    });

    this.scaleContext = bestScale;
    this.metrics.scaleAdherence = bestScore;
  }

  // Harmonic progression - detect chord patterns
  updateHarmonicProgression() {
    if (this.noteHistory.length < 3) return;

    // Collect recent notes that might form chords
    const recentNotes = this.noteHistory.slice(-6);
    const chordScore = this.detectChordProgression(recentNotes);

    this.metrics.harmonicProgression = chordScore;
  }

  detectChordProgression(notes) {
    // Simple chord detection - looks for triadic patterns
    const noteSet = new Set(notes.map(n => n % 12));
    
    // If too few unique notes, not a chord
    if (noteSet.size < 2) return 0;
    
    let chordScore = 0;

    // Check if notes form known chord patterns
    Object.entries(CHORDS).forEach(([chordName, intervals]) => {
      for (let root = 0; root < 12; root++) {
        const chordNotes = new Set(intervals.map(i => (root + i) % 12));
        
        let matches = 0;
        noteSet.forEach(note => {
          if (chordNotes.has(note)) matches++;
        });

        if (matches >= 2) { // At least 2 notes of a triad
          chordScore = Math.max(chordScore, matches / chordNotes.size);
        }
      }
    });

    return chordScore;
  }

  // Phrase structure - detect musical phrases (4-bar, 8-bar patterns)
  updatePhraseStructure() {
    if (this.noteHistory.length < 8) return;

    // Look for phrase endings (longer intervals, return to tonic)
    const intervals = [];
    for (let i = 1; i < this.timeHistory.length; i++) {
      intervals.push(this.timeHistory[i] - this.timeHistory[i-1]);
    }

    // Detect phrase boundaries (pauses)
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    let phraseScore = 0;

    // Look for regular phrase lengths (4 or 8 notes)
    const phraseLength = this.noteHistory.length;
    if (phraseLength % 4 === 0 || phraseLength % 8 === 0) {
      phraseScore += 0.5;
    }

    // Check for return to tonic
    if (this.scaleContext && this.noteHistory.length >= 8) {
      const lastNote = this.noteHistory[this.noteHistory.length - 1] % 12;
      if (lastNote === this.scaleContext.root) {
        phraseScore += 0.5;
      }
    }

    this.metrics.phraseStructure = Math.min(1, phraseScore);
  }

  // Dynamic variation - rewards expressive playing
  updateDynamicVariation(velocity) {
    // This would track velocity changes over time
    // For now, simple implementation
    this.metrics.dynamicVariation = 0.5 + (velocity - 0.5) * 0.5;
  }

  // Calculate overall musicality score
  calculateMusicalityScore() {
    const weights = {
      melodicCoherence: 0.25,
      harmonicProgression: 0.15,
      rhythmicConsistency: 0.25,
      scaleAdherence: 0.2,
      phraseStructure: 0.1,
      dynamicVariation: 0.05
    };

    this.musicalityScore = Object.entries(this.metrics).reduce((total, [metric, value]) => {
      return total + value * (weights[metric] || 0);
    }, 0);
    
    // Apply penalties for non-musical playing
    const penalties = this.calculatePenalties();
    this.musicalityScore *= penalties.multiplier;
    
    // If playing is too random or too fast, cap the score
    if (penalties.isRandom || penalties.isMashing) {
      this.musicalityScore = Math.min(this.musicalityScore, 0.2);
    }
  }

  // Convert musicality score to excitement boost
  calculateExcitementBoost() {
    // High musicality should allow reaching 100% in ~90 seconds
    // We need to accumulate 1.0 excitement over 90 seconds
    // At 160 BPM (375ms per note), that's 240 notes in 90 seconds
    // With decay of 0.002 per second, we lose 0.18 over 90 seconds
    // So we need to gain 1.18 total, which is 1.18 / 240 = 0.00492 per note
    
    const baseRatePerNote = 0.00492;
    
    // With perfect musicality (1.0), we want exactly the base rate
    // With poor musicality (0.0), we want no excitement
    // With good musicality (0.8+), we want to reach 100% in ~90 seconds
    
    let boost = this.musicalityScore;
    
    // Extra boost for very high musicality to ensure we reach 100%
    if (this.musicalityScore > 0.85) {
      boost = 1.15; // 15% bonus to ensure we reach 100%
    } else if (this.musicalityScore < 0.3) {
      boost = 0; // No excitement for poor playing
    }
    
    return baseRatePerNote * boost;
  }

  // Check if a simple pattern like "do re mi fa" is being played
  isPlayingSimpleScale() {
    if (this.noteHistory.length < 4) return false;

    const recent = this.noteHistory.slice(-4);
    
    // Check for ascending scale pattern
    let isAscending = true;
    for (let i = 1; i < recent.length; i++) {
      const interval = recent[i] - recent[i-1];
      if (interval < 1 || interval > 2) {
        isAscending = false;
        break;
      }
    }

    return isAscending && this.metrics.rhythmicConsistency > 0.7;
  }

  // Detect random playing patterns
  detectRandomPlaying() {
    if (this.noteHistory.length < 5) return false;
    
    // Check for large random jumps
    const intervals = [];
    for (let i = 1; i < this.noteHistory.length; i++) {
      intervals.push(Math.abs(this.noteHistory[i] - this.noteHistory[i-1]));
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const largeJumps = intervals.filter(i => i > 8).length;
    const veryLargeJumps = intervals.filter(i => i > 12).length;
    
    // Check timing consistency
    const timeIntervals = [];
    for (let i = 1; i < this.timeHistory.length; i++) {
      timeIntervals.push(this.timeHistory[i] - this.timeHistory[i-1]);
    }
    
    const timeVariance = this.calculateVariance(timeIntervals);
    const avgTimeInterval = timeIntervals.reduce((a, b) => a + b, 0) / timeIntervals.length;
    const timeInconsistency = timeVariance / (avgTimeInterval * avgTimeInterval);
    
    // Check for lack of melodic patterns
    const hasRepeatingPatterns = this.detectRepeatingPatterns();
    const hasScalePatterns = this.detectScalePatterns();
    
    // More sophisticated random detection
    let randomScore = 0;
    
    // Factors that indicate random playing
    if (largeJumps > intervals.length * 0.25) randomScore += 0.3;
    if (veryLargeJumps > 0) randomScore += 0.2;
    if (avgInterval > 5) randomScore += 0.2;
    if (timeInconsistency > 0.15) randomScore += 0.2;
    if (!hasRepeatingPatterns) randomScore += 0.2;
    if (!hasScalePatterns) randomScore += 0.2;
    if (this.metrics.melodicCoherence < 0.5) randomScore += 0.2;
    
    // Factors that indicate musical playing (reduce random score)
    if (this.metrics.rhythmicConsistency > 0.8) randomScore -= 0.2;
    if (hasScalePatterns) randomScore -= 0.3;
    
    return randomScore > 0.5;
  }
  
  // Detect if there are repeating patterns in the note sequence
  detectRepeatingPatterns() {
    if (this.noteHistory.length < 8) return false;
    
    // Look for 2-4 note patterns that repeat
    for (let patternLength = 2; patternLength <= 4; patternLength++) {
      for (let i = 0; i <= this.noteHistory.length - patternLength * 2; i++) {
        const pattern = this.noteHistory.slice(i, i + patternLength);
        const nextPattern = this.noteHistory.slice(i + patternLength, i + patternLength * 2);
        
        if (JSON.stringify(pattern) === JSON.stringify(nextPattern)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  // Detect scale-like patterns
  detectScalePatterns() {
    if (this.noteHistory.length < 4) return false;
    
    // Check recent notes for scale-like movement
    const recent = this.noteHistory.slice(-8);
    let ascendingSteps = 0;
    let descendingSteps = 0;
    let stepwiseMotion = 0;
    
    for (let i = 1; i < recent.length; i++) {
      const interval = recent[i] - recent[i-1];
      
      if (interval >= 1 && interval <= 2) {
        ascendingSteps++;
        stepwiseMotion++;
      } else if (interval >= -2 && interval <= -1) {
        descendingSteps++;
        stepwiseMotion++;
      }
    }
    
    // Scale-like if mostly stepwise motion
    return stepwiseMotion >= (recent.length - 1) * 0.6;
  }
  
  // Calculate penalties for non-musical playing
  calculatePenalties() {
    const penalties = {
      multiplier: 1.0,
      isRandom: false,
      isMashing: false
    };
    
    // Check for random playing
    if (this.detectRandomPlaying()) {
      penalties.isRandom = true;
      penalties.multiplier *= 0.3;
    }
    
    // Check for key mashing (very fast, inconsistent playing)
    if (this.timeHistory.length >= 3) {
      const recentTimes = this.timeHistory.slice(-5);
      const intervals = [];
      for (let i = 1; i < recentTimes.length; i++) {
        intervals.push(recentTimes[i] - recentTimes[i-1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      
      if (avgInterval < 100) { // Less than 100ms between notes
        penalties.isMashing = true;
        penalties.multiplier *= 0.1;
      }
    }
    
    // Check for lack of any musical qualities
    const totalMetricScore = Object.values(this.metrics).reduce((a, b) => a + b, 0);
    if (totalMetricScore < 1.5) { // Very low overall scores
      penalties.multiplier *= 0.5;
    }
    
    return penalties;
  }
  
  calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }
}

export default MusicalityEngine; 