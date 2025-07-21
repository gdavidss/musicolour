// Musicolour Hyperparameter Testing Framework
// Goal: Tune parameters so it takes ~60 seconds of musical playing to reach max excitement
// Random mashing should not increase excitement

class MusicolourTestFramework {
  constructor() {
    this.testResults = [];
    this.currentTest = null;
  }

  // Simulate a key press with timing
  simulateKeyPress(noteIndex, timestamp) {
    return {
      noteIndex,
      timestamp,
      velocity: 0.5 + Math.random() * 0.5
    };
  }

  // Test 1: Random key mashing - should NOT increase excitement
  testRandomMashing() {
    console.log("Test 1: Random Key Mashing");
    const keypresses = [];
    let timestamp = 0;
    
    // Simulate 60 seconds of random mashing
    for (let i = 0; i < 600; i++) { // ~10 keys per second
      const randomKey = Math.floor(Math.random() * 17); // 17 piano keys
      keypresses.push(this.simulateKeyPress(randomKey, timestamp));
      timestamp += 50 + Math.random() * 150; // 50-200ms between keys (very fast)
    }
    
    return {
      name: "Random Mashing",
      keypresses,
      expectedMaxExcitement: 0.2, // Should stay low
      description: "Random fast key presses should not build excitement"
    };
  }

  // Test 2: Musical scale - should increase excitement
  testMusicalScale() {
    console.log("Test 2: Musical Scale Playing");
    const keypresses = [];
    let timestamp = 0;
    
    // Play C major scale up and down, repeated
    const cMajorScale = [0, 2, 4, 5, 7, 9, 11, 12]; // C D E F G A B C
    
    for (let repeat = 0; repeat < 10; repeat++) {
      // Up
      for (let note of cMajorScale) {
        keypresses.push(this.simulateKeyPress(note, timestamp));
        timestamp += 200 + Math.random() * 100; // 200-300ms between notes
      }
      // Down
      for (let i = cMajorScale.length - 2; i >= 0; i--) {
        keypresses.push(this.simulateKeyPress(cMajorScale[i], timestamp));
        timestamp += 200 + Math.random() * 100;
      }
      timestamp += 500; // Small pause between repetitions
    }
    
    return {
      name: "Musical Scale",
      keypresses,
      expectedMaxExcitement: 0.7,
      description: "Musical scales should build moderate excitement"
    };
  }

  // Test 3: Chord progressions - should increase excitement well
  testChordProgressions() {
    console.log("Test 3: Chord Progressions");
    const keypresses = [];
    let timestamp = 0;
    
    // Common chord progression: C - G - Am - F
    const chords = [
      [0, 4, 7],    // C major
      [7, 11, 14],  // G major  
      [9, 12, 16],  // A minor
      [5, 9, 12]    // F major
    ];
    
    for (let repeat = 0; repeat < 15; repeat++) {
      for (let chord of chords) {
        // Play chord (all notes simultaneously)
        for (let note of chord) {
          keypresses.push(this.simulateKeyPress(note % 17, timestamp));
        }
        timestamp += 500; // Hold for 500ms
        
        // Small variation - arpeggiate sometimes
        if (Math.random() > 0.5) {
          for (let note of chord) {
            keypresses.push(this.simulateKeyPress(note % 17, timestamp));
            timestamp += 100;
          }
        }
        timestamp += 300; // Gap between chords
      }
    }
    
    return {
      name: "Chord Progressions",
      keypresses,
      expectedMaxExcitement: 0.85,
      description: "Chord progressions should build high excitement"
    };
  }

  // Test 4: Repetitive single note - should decrease excitement
  testRepetitiveSingleNote() {
    console.log("Test 4: Repetitive Single Note");
    const keypresses = [];
    let timestamp = 0;
    
    // Hit the same key over and over
    for (let i = 0; i < 120; i++) { // 2 per second for 60 seconds
      keypresses.push(this.simulateKeyPress(7, timestamp)); // Always middle G
      timestamp += 500;
    }
    
    return {
      name: "Repetitive Single Note",
      keypresses,
      expectedMaxExcitement: 0.1,
      description: "Repeating same note should cause boredom"
    };
  }

  // Test 5: Simple melody with variations - should reach max excitement in ~60s
  testSimpleMelodyWithVariations() {
    console.log("Test 5: Simple Melody with Variations");
    const keypresses = [];
    let timestamp = 0;
    
    // Base melody (Mary Had a Little Lamb style)
    const baseMelody = [4, 2, 0, 2, 4, 4, 4, 2, 2, 2, 4, 7, 7];
    
    // Play for 60 seconds with variations
    for (let section = 0; section < 6; section++) { // 6 sections of ~10 seconds each
      // Play base melody
      for (let note of baseMelody) {
        keypresses.push(this.simulateKeyPress(note, timestamp));
        timestamp += 250 + Math.random() * 50;
      }
      
      // Add variation based on section
      if (section > 1) {
        // Transpose up
        for (let note of baseMelody) {
          keypresses.push(this.simulateKeyPress((note + 2) % 17, timestamp));
          timestamp += 200 + Math.random() * 50;
        }
      }
      
      if (section > 3) {
        // Add harmony
        for (let i = 0; i < baseMelody.length; i += 2) {
          keypresses.push(this.simulateKeyPress(baseMelody[i], timestamp));
          keypresses.push(this.simulateKeyPress((baseMelody[i] + 4) % 17, timestamp));
          timestamp += 300;
        }
      }
      
      timestamp += 1000; // Pause between sections
    }
    
    return {
      name: "Simple Melody with Variations",
      keypresses,
      expectedMaxExcitement: 1.0,
      description: "Well-structured melody should reach max excitement in ~60 seconds"
    };
  }

  // Test 6: Speed test - very fast playing should be penalized
  testSpeedPenalty() {
    console.log("Test 6: Speed Penalty Test");
    const keypresses = [];
    let timestamp = 0;
    
    // Alternate between normal and super fast playing
    for (let phase = 0; phase < 10; phase++) {
      if (phase % 2 === 0) {
        // Normal musical playing
        for (let i = 0; i < 10; i++) {
          keypresses.push(this.simulateKeyPress(i % 8, timestamp));
          timestamp += 300;
        }
      } else {
        // Super fast mashing
        for (let i = 0; i < 30; i++) {
          keypresses.push(this.simulateKeyPress(Math.floor(Math.random() * 17), timestamp));
          timestamp += 20; // Only 20ms between keys!
        }
      }
    }
    
    return {
      name: "Speed Penalty",
      keypresses,
      expectedMaxExcitement: 0.3,
      description: "Very fast playing should be heavily penalized"
    };
  }

  // Run all tests and analyze results
  runAllTests() {
    const tests = [
      this.testRandomMashing(),
      this.testMusicalScale(),
      this.testChordProgressions(),
      this.testRepetitiveSingleNote(),
      this.testSimpleMelodyWithVariations(),
      this.testSpeedPenalty()
    ];
    
    console.log("\n=== Musicolour Hyperparameter Test Suite ===\n");
    
    tests.forEach(test => {
      console.log(`\nTest: ${test.name}`);
      console.log(`Description: ${test.description}`);
      console.log(`Duration: ${test.keypresses[test.keypresses.length - 1].timestamp / 1000}s`);
      console.log(`Total keypresses: ${test.keypresses.length}`);
      console.log(`Expected max excitement: ${test.expectedMaxExcitement}`);
    });
    
    return tests;
  }
}

// Export for use in testing
export default MusicolourTestFramework; 