// Musicality Engine – Advanced musical pattern detection and scoring (rev.2)
// Implements the metric recipe outlined in the design documents.

// ---------- CONSTANTS & HELPERS ----------
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

// Common scales (interval patterns from root)
const SCALES = {
  MAJOR: [0, 2, 4, 5, 7, 9, 11],
  NATURAL_MINOR: [0, 2, 3, 5, 7, 8, 10],
  HARMONIC_MINOR: [0, 2, 3, 5, 7, 8, 11],
  PENTATONIC_MAJOR: [0, 2, 4, 7, 9],
  PENTATONIC_MINOR: [0, 3, 5, 7, 10],
  BLUES: [0, 3, 5, 6, 7, 10],
  CHROMATIC: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
};

// Chord patterns (intervals from root)
const CHORDS = {
  MAJOR_TRIAD: [0, 4, 7],
  MINOR_TRIAD: [0, 3, 7],
  DIMINISHED: [0, 3, 6],
  AUGMENTED: [0, 4, 8],
  MAJOR_SEVENTH: [0, 4, 7, 11],
  DOMINANT_SEVENTH: [0, 4, 7, 10],
  MINOR_SEVENTH: [0, 3, 7, 10]
};

// Canonical chord progressions (roots relative to scale)
const PROGRESSIONS = {
  I_V_vi_IV: [0, 7, 9, 5],
  I_IV_V: [0, 5, 7],
  ii_V_I: [2, 7, 0],
  I_vi_IV_V: [0, 9, 5, 7],
  vi_IV_I_V: [9, 5, 0, 7]
};

// Sliding-window sizes & tuning knobs (exported for live tweaking)
export const MODEL_PARAMS = {
  HISTORY: 32,          // notes kept
  IOI_WIN: 16,          // inter-onset intervals analysed
  VEL_WIN: 16,          // velocities analysed
  CHORD_WINDOW: 250,    // ms to collect simultaneous notes
  EMA_ALPHA: 0.1        // speed of “boredom baseline”
  ,BOOST_POS: 0.05      // excitement gain when surprising/creative
  ,BOOST_NEG: 0.02      // boredom decay when stagnant
};

// Helper functions
const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
const norm = (x, lo, hi) => clamp((x - lo) / (hi - lo), 0, 1); // 0‒1

// ---------- MUSICALITY ENGINE ----------
class MusicalityEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.noteHistory = [];
    this.timeHistory = [];
    this.rhythmPattern = [];
    this.velHistory = [];

    this.chordBuffer = [];
    this.chordBufferTime = 0;
    this.chordHistory = [];

    this.scaleContext = null;
    this.tempo = null;
    this.ema = null; // exponential moving average of score

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

  // Main entry – call on each MIDI note-on
  processNote(noteIndex, timestamp, velocity = 0.5) {
    // ---- Update core histories ----
    this.noteHistory.push(noteIndex);
    this.timeHistory.push(timestamp);
    if (this.noteHistory.length > MODEL_PARAMS.HISTORY) {
      this.noteHistory.shift();
      this.timeHistory.shift();
    }

    // ---- Per-metric updates ----
    this.updateRhythmicConsistency(timestamp);
    this.updateMelodicCoherence();
    this.updateScaleAdherence();
    this.updateHarmonicProgression();
    this.updatePhraseStructure();
    this.updateDynamicVariation(velocity);

    // ---- Aggregate score & excitement ----
    this.calculateMusicalityScore();

    return {
      score: this.musicalityScore,
      metrics: { ...this.metrics },
      excitement: this.calculateExcitementBoost()
    };
  }

  // ---------- METRIC COMPUTATIONS ----------
  // 1. Rhythmic Consistency & tempo
  updateRhythmicConsistency(ts) {
    if (this.timeHistory.length < 2) return;

    const ioi = ts - this.timeHistory[this.timeHistory.length - 2];
    this.rhythmPattern.push(ioi);
    if (this.rhythmPattern.length > MODEL_PARAMS.IOI_WIN) this.rhythmPattern.shift();

    const mean = this.rhythmPattern.reduce((a, b) => a + b, 0) / this.rhythmPattern.length;
    const variance = this.rhythmPattern.reduce((s, v) => s + (v - mean) ** 2, 0) / this.rhythmPattern.length;
    const cv = Math.sqrt(variance) / mean; // coefficient of variation

    this.metrics.rhythmicConsistency = 1 - norm(cv, 0.05, 0.35);
    this.tempo = 60000 / mean; // BPM
  }

  // 2. Melodic Coherence
  updateMelodicCoherence() {
    if (this.noteHistory.length < 2) return;

    const recent = this.noteHistory.slice(-8);
    const intervals = recent.slice(1).map((n, i) => Math.abs(n - recent[i]));
    if (intervals.length === 0) return;

    const smallSteps = intervals.filter(x => x <= INTERVALS.MAJOR_SECOND).length;
    const bigLeaps = intervals.filter(x => x >= INTERVALS.MINOR_SIXTH).length;
    const repetition = new Set(intervals).size / intervals.length; // <1 ⇒ motif

    const stepScore = smallSteps / intervals.length;
    const leapPenalty = bigLeaps ? norm(bigLeaps, 0, 4) : 0;
    const motifScore = 1 - repetition;

    this.metrics.melodicCoherence = clamp(0.6 * stepScore + 0.3 * motifScore - 0.3 * leapPenalty, 0, 1);
  }

  // 3. Scale Adherence
  updateScaleAdherence() {
    if (this.noteHistory.length === 0) return;

    const pcsCounts = Array(12).fill(0);
    this.noteHistory.slice(-MODEL_PARAMS.HISTORY).forEach(n => pcsCounts[n % 12]++);

    let best = { name: null, fit: 0 };
    for (const [name, pattern] of Object.entries(SCALES)) {
      const fit = pattern.reduce((s, int) => s + pcsCounts[int], 0);
      if (fit > best.fit) best = { name, fit };
    }

    this.scaleContext = best.name;
    this.metrics.scaleAdherence = best.fit / this.noteHistory.length;
  }

  // 4. Harmonic Progression
  detectChord(pitchClasses) {
    for (const [name, intervals] of Object.entries(CHORDS)) {
      for (const root of pitchClasses) {
        if (intervals.every(i => pitchClasses.has((root + i) % 12))) {
          return { name, root };
        }
      }
    }
    return null;
  }

  updateHarmonicProgression() {
    const now = this.timeHistory.at(-1);
    const lastNote = this.noteHistory.at(-1);

    // Start/reset buffer window
    if (now - this.chordBufferTime > MODEL_PARAMS.CHORD_WINDOW) {
      // Flush & detect chord
      if (this.chordBuffer.length) {
        const pcs = new Set(this.chordBuffer.map(n => n % 12));
        const chord = this.detectChord(pcs);
        this.chordHistory.push(chord);
      }
      this.chordBuffer = [lastNote];
      this.chordBufferTime = now;
    } else {
      this.chordBuffer.push(lastNote);
    }

    // Compare recent chord root sequence against known progressions
    const roots = this.chordHistory.slice(-4).map(c => (c ? c.root : null));
    let match = 0;
    for (const prog of Object.values(PROGRESSIONS)) {
      const seg = prog.slice(0, roots.length);
      if (JSON.stringify(seg) === JSON.stringify(roots)) {
        match = roots.length / prog.length;
        break;
      }
    }
    this.metrics.harmonicProgression = match; // 0‒1
  }

  // 5. Phrase Structure (very simple IOI-based heuristic)
  updatePhraseStructure() {
    if (!this.tempo || this.rhythmPattern.length < 4) return;

    const meanIOI = this.rhythmPattern.reduce((a, b) => a + b, 0) / this.rhythmPattern.length;
    const rests = this.rhythmPattern.slice(-8).filter(x => x > 1.5 * meanIOI);
    const phraseLen = rests.length ? rests[rests.length - 1] : 0;

    const ideal = 4 * (60000 / this.tempo); // 4 beats in current tempo
    this.metrics.phraseStructure = 1 - norm(Math.abs(phraseLen - ideal), 0, ideal);
  }

  // 6. Dynamic Variation (velocity coefficient of variation)
  updateDynamicVariation(vel) {
    this.velHistory.push(vel);
    if (this.velHistory.length > MODEL_PARAMS.VEL_WIN) this.velHistory.shift();

    const mean = this.velHistory.reduce((a, b) => a + b, 0) / this.velHistory.length;
    const variance = this.velHistory.reduce((s, v) => s + (v - mean) ** 2, 0) / this.velHistory.length;
    const cv = Math.sqrt(variance) / mean;

    this.metrics.dynamicVariation = 1 - norm(Math.abs(cv - 0.25), 0.2, 0.35);
  }

  // ---------- SCORING & EXCITEMENT ----------
  calculateMusicalityScore() {
    const weights = {
      melodicCoherence: 0.25,
      harmonicProgression: 0.25,
      rhythmicConsistency: 0.20,
      scaleAdherence: 0.15,
      phraseStructure: 0.10,
      dynamicVariation: 0.05
    };

    const raw = Object.entries(weights).reduce((s, [k, w]) => s + w * this.metrics[k], 0);
    this.musicalityScore = Math.round(raw * 100); // 0-100
  }

  calculateExcitementBoost() {
    if (this.ema === null) this.ema = this.musicalityScore;
    this.ema = MODEL_PARAMS.EMA_ALPHA * this.musicalityScore + (1 - MODEL_PARAMS.EMA_ALPHA) * this.ema;

    const delta = this.musicalityScore - this.ema; // -100..100
    const normDelta = clamp(delta / 100, -1, 1);   // -1 .. 1

    if (normDelta > 0) {
      return normDelta * MODEL_PARAMS.BOOST_POS; // positive boost
    }
    return normDelta * MODEL_PARAMS.BOOST_NEG; // negative (decay) value
  }
}

export default MusicalityEngine; 