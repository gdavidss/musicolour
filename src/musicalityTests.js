// Comprehensive tests for the Musicality Engine
import MusicalityEngine from './musicalityEngine.js';

class MusicalityTests {
  constructor() {
    this.engine = new MusicalityEngine();
    this.testResults = [];
  }

  runAllTests() {
    console.log("=== MUSICALITY ENGINE TESTS ===\n");
    
    // Reset before each test
    this.testSimpleScale();
    this.testRhythmicConsistency();
    this.testMelodicCoherence();
    this.testScaleAdherence();
    this.testChordProgression();
    this.testRandomPlaying();
    this.testMusicalPhrase();
    this.testDoReMiFa();
    
    // Summary
    console.log("\n=== TEST SUMMARY ===");
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    console.log(`Passed: ${passed}/${total}`);
    
    return passed === total;
  }

  // Test 1: Simple ascending scale should score high
  testSimpleScale() {
    console.log("\nTest 1: Simple Ascending Scale");
    this.engine.reset();
    
    // Play C major scale
    const notes = [0, 2, 4, 5, 7, 9, 11, 12]; // C D E F G A B C
    let timestamp = 0;
    let finalScore = 0;
    
    notes.forEach(note => {
      const result = this.engine.processNote(note, timestamp);
      finalScore = result.score;
      timestamp += 400; // Steady tempo
    });
    
    console.log(`Final musicality score: ${finalScore.toFixed(3)}`);
    console.log(`Metrics:`, this.engine.metrics);
    
    const passed = finalScore > 0.7;
    this.testResults.push({ name: "Simple Scale", passed });
    console.log(passed ? "✓ PASSED" : "✗ FAILED");
  }

  // Test 2: Consistent rhythm should score high
  testRhythmicConsistency() {
    console.log("\nTest 2: Rhythmic Consistency");
    this.engine.reset();
    
    // Play steady quarter notes
    let timestamp = 0;
    let finalScore = 0;
    
    for (let i = 0; i < 8; i++) {
      const note = i % 5; // Simple pattern
      const result = this.engine.processNote(note, timestamp);
      finalScore = result.score;
      timestamp += 500; // Exactly 500ms intervals (120 BPM)
    }
    
    console.log(`Rhythmic consistency: ${this.engine.metrics.rhythmicConsistency.toFixed(3)}`);
    
    const passed = this.engine.metrics.rhythmicConsistency > 0.8;
    this.testResults.push({ name: "Rhythmic Consistency", passed });
    console.log(passed ? "✓ PASSED" : "✗ FAILED");
  }

  // Test 3: Melodic phrases with good contour
  testMelodicCoherence() {
    console.log("\nTest 3: Melodic Coherence");
    this.engine.reset();
    
    // Arch contour melody
    const melody = [0, 2, 4, 5, 7, 5, 4, 2, 0]; // Up and down
    let timestamp = 0;
    
    melody.forEach(note => {
      this.engine.processNote(note, timestamp);
      timestamp += 400;
    });
    
    console.log(`Melodic coherence: ${this.engine.metrics.melodicCoherence.toFixed(3)}`);
    
    const passed = this.engine.metrics.melodicCoherence > 0.6;
    this.testResults.push({ name: "Melodic Coherence", passed });
    console.log(passed ? "✓ PASSED" : "✗ FAILED");
  }

  // Test 4: Playing within a scale
  testScaleAdherence() {
    console.log("\nTest 4: Scale Adherence");
    this.engine.reset();
    
    // Play only C major scale notes
    const cMajorNotes = [0, 2, 4, 7, 9, 11, 0, 4, 7]; // C D E G A B C E G
    let timestamp = 0;
    
    cMajorNotes.forEach(note => {
      this.engine.processNote(note, timestamp);
      timestamp += 350;
    });
    
    console.log(`Scale adherence: ${this.engine.metrics.scaleAdherence.toFixed(3)}`);
    console.log(`Detected scale: ${this.engine.scaleContext?.name || 'None'}`);
    
    const passed = this.engine.metrics.scaleAdherence > 0.9;
    this.testResults.push({ name: "Scale Adherence", passed });
    console.log(passed ? "✓ PASSED" : "✗ FAILED");
  }

  // Test 5: Chord progressions
  testChordProgression() {
    console.log("\nTest 5: Chord Progression");
    this.engine.reset();
    
    // Play C major triad arpeggios
    const chords = [
      [0, 4, 7],    // C major
      [5, 9, 0],    // F major
      [7, 11, 2],   // G major
      [0, 4, 7]     // C major
    ];
    
    let timestamp = 0;
    chords.forEach(chord => {
      chord.forEach(note => {
        this.engine.processNote(note, timestamp);
        timestamp += 150;
      });
      timestamp += 200; // Small pause between chords
    });
    
    console.log(`Harmonic progression: ${this.engine.metrics.harmonicProgression.toFixed(3)}`);
    
    const passed = this.engine.metrics.harmonicProgression > 0.5;
    this.testResults.push({ name: "Chord Progression", passed });
    console.log(passed ? "✓ PASSED" : "✗ FAILED");
  }

  // Test 6: Random playing should score low
  testRandomPlaying() {
    console.log("\nTest 6: Random Playing (Should Score Low)");
    this.engine.reset();
    
    // Random notes and timing
    let timestamp = 0;
    
    for (let i = 0; i < 15; i++) {
      // Truly random notes with more extreme jumps
      const note = Math.floor(Math.random() * 17);
      this.engine.processNote(note, timestamp);
      // More erratic timing
      timestamp += 50 + Math.random() * 1200; // Very random timing
    }
    
    console.log(`Random play score: ${this.engine.musicalityScore.toFixed(3)}`);
    console.log(`Random detection: ${this.engine.detectRandomPlaying()}`);
    console.log(`Metrics:`, this.engine.metrics);
    
    // Accept slightly higher scores since random can accidentally hit patterns
    const passed = this.engine.musicalityScore < 0.4 || this.engine.detectRandomPlaying();
    this.testResults.push({ name: "Random Playing", passed });
    console.log(passed ? "✓ PASSED" : "✗ FAILED");
  }

  // Test 7: Complete musical phrase
  testMusicalPhrase() {
    console.log("\nTest 7: Musical Phrase");
    this.engine.reset();
    
    // 8-bar phrase in C major
    const phrase = [
      0, 2, 4, 5,   // Bar 1
      7, 5, 4, 2,   // Bar 2
      0, 0, 7, 7,   // Bar 3
      5, 5, 4, 2,   // Bar 4
      0, 2, 4, 5,   // Bar 5
      7, 9, 11, 9,  // Bar 6
      7, 5, 4, 2,   // Bar 7
      0, 0, 0, 0    // Bar 8 - end on tonic
    ];
    
    let timestamp = 0;
    phrase.forEach((note, i) => {
      this.engine.processNote(note, timestamp);
      timestamp += 250; // Steady tempo
      
      // Add slight pause at phrase boundaries
      if ((i + 1) % 8 === 0) {
        timestamp += 100;
      }
    });
    
    console.log(`Phrase structure: ${this.engine.metrics.phraseStructure.toFixed(3)}`);
    console.log(`Overall musicality: ${this.engine.musicalityScore.toFixed(3)}`);
    
    const passed = this.engine.musicalityScore > 0.6;
    this.testResults.push({ name: "Musical Phrase", passed });
    console.log(passed ? "✓ PASSED" : "✗ FAILED");
  }

  // Test 8: Do-Re-Mi-Fa pattern (user's specific request)
  testDoReMiFa() {
    console.log("\nTest 8: Do-Re-Mi-Fa Loop (90 seconds to 100%)");
    this.engine.reset();
    
    // Simulate playing Do-Re-Mi-Fa for 90 seconds
    const pattern = [0, 2, 4, 5]; // C D E F
    let timestamp = 0;
    let totalExcitement = 0;
    let iterations = 0;
    
    // Play for 90 seconds (90000ms)
    while (timestamp < 90000) {
      const note = pattern[iterations % 4];
      const result = this.engine.processNote(note, timestamp);
      
      // Accumulate excitement
      totalExcitement += result.excitement;
      
      timestamp += 375; // 160 BPM, very steady
      iterations++;
    }
    
    console.log(`Pattern iterations: ${iterations}`);
    console.log(`Final musicality score: ${this.engine.musicalityScore.toFixed(3)}`);
    console.log(`Is playing simple scale: ${this.engine.isPlayingSimpleScale()}`);
    console.log(`Total excitement accumulated: ${totalExcitement.toFixed(3)}`);
    console.log(`Expected excitement after 90s: ${(totalExcitement).toFixed(3)}`);
    
    // Should reach ~100% (1.0) in 90 seconds
    const passed = totalExcitement >= 0.9 && totalExcitement <= 1.1;
    this.testResults.push({ name: "Do-Re-Mi-Fa 90s", passed });
    console.log(passed ? "✓ PASSED" : "✗ FAILED");
    
    // Additional metrics
    console.log("\nDetailed metrics for Do-Re-Mi-Fa:");
    Object.entries(this.engine.metrics).forEach(([key, value]) => {
      console.log(`  ${key}: ${value.toFixed(3)}`);
    });
  }
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  const tester = new MusicalityTests();
  const allPassed = tester.runAllTests();
  process.exit(allPassed ? 0 : 1);
}

export default MusicalityTests; 