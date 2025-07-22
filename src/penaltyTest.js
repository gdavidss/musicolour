// Test for penalty system
import MusicalityEngine from './musicalityEngine.js';

class PenaltyTest {
  constructor() {
    this.engine = new MusicalityEngine();
  }

  runTests() {
    console.log("=== PENALTY SYSTEM TESTS ===\n");
    
    this.testGoodPlaying();
    this.testKeyMashing();
    this.testRandomNotes();
    this.testSlowRandom();
    
    console.log("\n=== TEST COMPLETE ===");
  }

  // Test 1: Good musical playing should score high
  testGoodPlaying() {
    console.log("\nTest 1: Good Musical Playing (Do-Re-Mi-Fa at 160 BPM)");
    this.engine.reset();
    
    const pattern = [0, 2, 4, 5]; // C D E F
    let timestamp = 0;
    const interval = 375; // 160 BPM
    
    for (let i = 0; i < 16; i++) {
      const note = pattern[i % 4];
      const result = this.engine.processNote(note, timestamp);
      timestamp += interval;
    }
    
    console.log(`Musicality score: ${this.engine.musicalityScore.toFixed(3)}`);
    console.log(`Rhythm consistency: ${this.engine.metrics.rhythmicConsistency.toFixed(3)}`);
    console.log(`Expected: High scores (>0.7)`);
    console.log(`PASS: ${this.engine.musicalityScore > 0.7 ? 'YES' : 'NO'}`);
  }

  // Test 2: Key mashing should score very low
  testKeyMashing() {
    console.log("\nTest 2: Key Mashing (Random notes at >600 BPM)");
    this.engine.reset();
    
    let timestamp = 0;
    
    for (let i = 0; i < 20; i++) {
      const note = Math.floor(Math.random() * 17);
      const result = this.engine.processNote(note, timestamp);
      timestamp += 50 + Math.random() * 50; // 50-100ms intervals (600-1200 BPM)
    }
    
    console.log(`Musicality score: ${this.engine.musicalityScore.toFixed(3)}`);
    console.log(`Rhythm consistency: ${this.engine.metrics.rhythmicConsistency.toFixed(3)}`);
    console.log(`Expected: Very low scores (<0.2)`);
    console.log(`PASS: ${this.engine.musicalityScore < 0.2 ? 'YES' : 'NO'}`);
  }

  // Test 3: Random notes at normal tempo should score low
  testRandomNotes() {
    console.log("\nTest 3: Random Notes at Normal Tempo (120 BPM)");
    this.engine.reset();
    
    let timestamp = 0;
    const interval = 500; // 120 BPM
    
    for (let i = 0; i < 16; i++) {
      const note = Math.floor(Math.random() * 17);
      const result = this.engine.processNote(note, timestamp);
      timestamp += interval;
    }
    
    console.log(`Musicality score: ${this.engine.musicalityScore.toFixed(3)}`);
    console.log(`Melodic coherence: ${this.engine.metrics.melodicCoherence.toFixed(3)}`);
    console.log(`Scale adherence: ${this.engine.metrics.scaleAdherence.toFixed(3)}`);
    console.log(`Expected: Low scores (<0.4)`);
    console.log(`PASS: ${this.engine.musicalityScore < 0.4 ? 'YES' : 'NO'}`);
  }

  // Test 4: Random notes with random timing
  testSlowRandom() {
    console.log("\nTest 4: Random Notes with Random Timing");
    this.engine.reset();
    
    let timestamp = 0;
    
    for (let i = 0; i < 12; i++) {
      const note = Math.floor(Math.random() * 17);
      const result = this.engine.processNote(note, timestamp);
      timestamp += 200 + Math.random() * 800; // 200-1000ms intervals
    }
    
    console.log(`Musicality score: ${this.engine.musicalityScore.toFixed(3)}`);
    console.log(`Rhythm consistency: ${this.engine.metrics.rhythmicConsistency.toFixed(3)}`);
    console.log(`Expected: Very low scores (<0.3)`);
    console.log(`PASS: ${this.engine.musicalityScore < 0.3 ? 'YES' : 'NO'}`);
  }
}

// Run tests
const tester = new PenaltyTest();
tester.runTests(); 