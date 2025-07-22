// Integration test for Musicolour app
import MusicalityEngine from './musicalityEngine.js';

class IntegrationTest {
  constructor() {
    this.engine = new MusicalityEngine();
    this.excitement = 0;
    this.testResults = [];
  }

  runTests() {
    console.log("=== MUSICOLOUR INTEGRATION TEST ===\n");
    
    this.testDoReMiFaSimulation();
    this.testRandomPlaySimulation();
    this.testMusicalPhraseSimulation();
    
    // Summary
    console.log("\n=== INTEGRATION TEST SUMMARY ===");
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    console.log(`Passed: ${passed}/${total}`);
    
    return passed === total;
  }

  // Test 1: Simulate Do-Re-Mi-Fa for 90 seconds
  testDoReMiFaSimulation() {
    console.log("\nTest 1: Do-Re-Mi-Fa Simulation (90 seconds)");
    this.engine.reset();
    this.excitement = 0;
    
    const pattern = [0, 2, 4, 5]; // C D E F
    let timestamp = 0;
    let noteCount = 0;
    
    // Simulate decay
    const decayRate = 0.002; // 0.2% per second
    const noteInterval = 375; // ms between notes (160 BPM)
    
    // Play notes for 90 seconds
    while (timestamp < 90000) {
      const note = pattern[noteCount % 4];
      const result = this.engine.processNote(note, timestamp);
      
      // Apply decay for the time between notes
      const decayAmount = (noteInterval / 1000) * decayRate;
      this.excitement = Math.max(0, this.excitement - decayAmount);
      
      // Add excitement from the note
      this.excitement = Math.min(1, this.excitement + result.excitement);
      
      noteCount++;
      timestamp += noteInterval;
    }
    
    console.log(`Final excitement: ${this.excitement.toFixed(3)}`);
    console.log(`Notes played: ${noteCount}`);
    console.log(`Final musicality score: ${this.engine.musicalityScore.toFixed(3)}`);
    
    // Should reach close to 100% (allowing some margin)
    const passed = this.excitement >= 0.85 && this.excitement <= 1.0;
    this.testResults.push({ name: "Do-Re-Mi-Fa 90s", passed });
    console.log(passed ? "✓ PASSED" : "✗ FAILED");
  }

  // Test 2: Random playing should not build excitement
  testRandomPlaySimulation() {
    console.log("\nTest 2: Random Play Simulation (30 seconds)");
    this.engine.reset();
    this.excitement = 0;
    
    let timestamp = 0;
    let noteCount = 0;
    let lastNoteTime = 0;
    
    while (timestamp < 30000) { // 30 seconds
      // Apply decay
      const timeSinceLastNote = timestamp - lastNoteTime;
      const decayAmount = (timeSinceLastNote / 1000) * 0.002;
      this.excitement = Math.max(0, this.excitement - decayAmount);
      
      // Play random notes at random intervals
      if (Math.random() < 0.1) { // ~10% chance each frame
        const note = Math.floor(Math.random() * 17);
        const result = this.engine.processNote(note, timestamp);
        this.excitement = Math.min(1, this.excitement + result.excitement);
        noteCount++;
        lastNoteTime = timestamp;
      }
      
      timestamp += 16;
    }
    
    console.log(`Final excitement: ${this.excitement.toFixed(3)}`);
    console.log(`Notes played: ${noteCount}`);
    console.log(`Final musicality score: ${this.engine.musicalityScore.toFixed(3)}`);
    
    // Should stay low
    const passed = this.excitement < 0.2;
    this.testResults.push({ name: "Random Play", passed });
    console.log(passed ? "✓ PASSED" : "✗ FAILED");
  }

  // Test 3: Musical phrase should build excitement efficiently
  testMusicalPhraseSimulation() {
    console.log("\nTest 3: Musical Phrase Simulation (60 seconds)");
    this.engine.reset();
    this.excitement = 0;
    
    // C major scale up and down
    const phrase = [0, 2, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 0];
    let timestamp = 0;
    let noteCount = 0;
    let phraseIndex = 0;
    const noteInterval = 300; // ms between notes (200 BPM)
    
    while (timestamp < 60000) { // 60 seconds
      const note = phrase[phraseIndex % phrase.length];
      const result = this.engine.processNote(note, timestamp);
      
      // Apply decay
      const decayAmount = (noteInterval / 1000) * 0.002;
      this.excitement = Math.max(0, this.excitement - decayAmount);
      
      // Add excitement
      this.excitement = Math.min(1, this.excitement + result.excitement);
      
      noteCount++;
      phraseIndex++;
      timestamp += noteInterval;
    }
    
    console.log(`Final excitement: ${this.excitement.toFixed(3)}`);
    console.log(`Notes played: ${noteCount}`);
    console.log(`Final musicality score: ${this.engine.musicalityScore.toFixed(3)}`);
    
    // Should build good excitement
    const passed = this.excitement >= 0.6;
    this.testResults.push({ name: "Musical Phrase", passed });
    console.log(passed ? "✓ PASSED" : "✗ FAILED");
  }
}

// Run tests
const tester = new IntegrationTest();
const allPassed = tester.runTests();
process.exit(allPassed ? 0 : 1); 