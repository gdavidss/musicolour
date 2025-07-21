// Test runner for Musicolour hyperparameter validation
import MusicolourTestFramework from './musicolourTests.js';

// Simulate the core Musicolour logic with current parameters
class MusicolourSimulator {
  constructor() {
    // Current hyperparameters (matching the updated values)
    this.params = {
      baseExcitementFirst: 0.015,
      baseExcitementMin: 0.01,
      baseExcitementMax: 0.015,
      noveltyMultiplier: 0.2,
      decayRate: 0.15 / 60,
      distanceMultiplierMin: 0.7,
      distanceMultiplierRange: 0.25,
      patternPenaltyFactor: 0.8,
      speedPenaltyThreshold: 100,
      regionalHeatPenalty: 0.15,
      thresholdInfluence: 0.6
    };
    
    this.reset();
  }
  
  reset() {
    this.excitement = 0;
    this.lastNoteIndex = null;
    this.lastKeyTime = 0;
    this.recentNotes = [];
    this.keyTimes = [];
    this.regionCounters = {};
    this.patternBoredom = 0;
    this.speedPenalty = 0;
  }
  
  processKeyPress(noteIndex, timestamp) {
    // Time-based decay
    if (this.lastKeyTime > 0) {
      const timeDelta = (timestamp - this.lastKeyTime) / 1000; // Convert to seconds
      this.excitement = Math.max(0, this.excitement - this.params.decayRate * timeDelta * 60);
    }
    
    // Calculate base excitement increase
    let baseIncrease;
    if (this.lastNoteIndex === null) {
      baseIncrease = this.params.baseExcitementFirst;
    } else {
      const distance = Math.abs(noteIndex - this.lastNoteIndex);
      const normalizedDistance = distance / 16; // 17 keys total
      const distanceExcitement = this.params.baseExcitementMin + 
        this.params.baseExcitementMax * (1 - Math.exp(-3 * normalizedDistance));
      baseIncrease = distanceExcitement;
    }
    
    // Pattern detection
    this.recentNotes.push(noteIndex);
    if (this.recentNotes.length > 16) this.recentNotes.shift();
    
    let patternScore = this.detectPatterns();
    const patternPenalty = 1 - (patternScore * this.params.patternPenaltyFactor);
    
    // Speed detection
    this.keyTimes.push(timestamp);
    if (this.keyTimes.length > 10) this.keyTimes.shift();
    
    let speedPenalty = this.detectSpeed();
    const speedPenaltyFactor = 1 - speedPenalty;
    
    // Calculate final increase
    let finalIncrease = baseIncrease * patternPenalty * speedPenaltyFactor;
    
    // Apply negative if penalties are severe
    const totalPenalty = (1 - patternPenalty) + (1 - speedPenaltyFactor);
    if (totalPenalty > 1.0) {
      finalIncrease = -0.02;
    }
    
    // Update state
    this.excitement = Math.max(0, Math.min(1, this.excitement + finalIncrease));
    this.lastNoteIndex = noteIndex;
    this.lastKeyTime = timestamp;
    
    return this.excitement;
  }
  
  detectPatterns() {
    if (this.recentNotes.length < 3) return 0;
    
    let patternScore = 0;
    let musicalityBonus = 0;
    
    // Check for repetition
    const last3 = this.recentNotes.slice(-3);
    if (last3.every(note => note === last3[0])) {
      patternScore += 0.7;
    }
    
    // Check for alternating pattern
    if (this.recentNotes.length >= 4) {
      const last4 = this.recentNotes.slice(-4);
      if (last4[0] === last4[2] && last4[1] === last4[3] && last4[0] !== last4[1]) {
        patternScore += 0.4;
      }
    }
    
    // Check for musical intervals
    if (this.recentNotes.length >= 4) {
      const intervals = [];
      for (let i = 1; i < this.recentNotes.length; i++) {
        intervals.push(this.recentNotes[i] - this.recentNotes[i-1]);
      }
      
      const musicalIntervals = [2, 3, 4, 5, 7, -2, -3, -4, -5, -7];
      const musicalCount = intervals.filter(i => musicalIntervals.includes(i)).length;
      if (musicalCount > intervals.length * 0.6) {
        musicalityBonus = -0.3;
      }
      
      const randomJumps = intervals.filter(i => Math.abs(i) > 8).length;
      if (randomJumps > intervals.length * 0.3) {
        patternScore += 0.3;
      }
    }
    
    return Math.max(0, patternScore + musicalityBonus);
  }
  
  detectSpeed() {
    if (this.keyTimes.length < 3) return 0;
    
    const intervals = [];
    for (let i = 1; i < this.keyTimes.length; i++) {
      intervals.push(this.keyTimes[i] - this.keyTimes[i-1]);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    let speedPenalty = 0;
    
    if (avgInterval < 100) {
      speedPenalty = Math.min(0.8, (100 - avgInterval) / 100 * 0.8);
    }
    
    if (avgInterval < 60) {
      speedPenalty += 0.6;
    }
    
    if (avgInterval < 30) {
      speedPenalty = 1.5;
    }
    
    // Check for rhythmic consistency
    const variance = intervals.reduce((sum, interval) => {
      return sum + Math.pow(interval - avgInterval, 2);
    }, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    if (avgInterval > 150 && avgInterval < 500 && stdDev < avgInterval * 0.2) {
      speedPenalty -= 0.1; // Bonus for rhythm
    }
    
    return Math.max(0, speedPenalty);
  }
}

// Run tests
function runTests() {
  const testFramework = new MusicolourTestFramework();
  const simulator = new MusicolourSimulator();
  const tests = testFramework.runAllTests();
  
  console.log("\n=== Running Simulations ===\n");
  
  const results = [];
  
  tests.forEach(test => {
    simulator.reset();
    let maxExcitement = 0;
    let finalExcitement = 0;
    
    // Process all keypresses
    test.keypresses.forEach(keypress => {
      const excitement = simulator.processKeyPress(keypress.noteIndex, keypress.timestamp);
      maxExcitement = Math.max(maxExcitement, excitement);
      finalExcitement = excitement;
    });
    
    const result = {
      name: test.name,
      expectedMax: test.expectedMaxExcitement,
      actualMax: maxExcitement,
      finalExcitement: finalExcitement,
      passed: Math.abs(maxExcitement - test.expectedMaxExcitement) < 0.15,
      duration: test.keypresses[test.keypresses.length - 1].timestamp / 1000
    };
    
    results.push(result);
    
    console.log(`\nTest: ${result.name}`);
    console.log(`Expected max: ${result.expectedMax.toFixed(2)}`);
    console.log(`Actual max: ${result.actualMax.toFixed(2)}`);
    console.log(`Final excitement: ${result.finalExcitement.toFixed(2)}`);
    console.log(`Duration: ${result.duration.toFixed(1)}s`);
    console.log(`Result: ${result.passed ? 'PASSED ✓' : 'FAILED ✗'}`);
  });
  
  // Summary
  console.log("\n=== Test Summary ===");
  const passed = results.filter(r => r.passed).length;
  console.log(`Passed: ${passed}/${results.length}`);
  
  // Check specific goals
  const melodyTest = results.find(r => r.name === "Simple Melody with Variations");
  if (melodyTest) {
    console.log(`\nGoal: Reach max excitement in ~60s with musical playing`);
    console.log(`Result: Max excitement ${melodyTest.actualMax.toFixed(2)} in ${melodyTest.duration.toFixed(1)}s`);
    console.log(`Status: ${melodyTest.actualMax > 0.85 && melodyTest.duration >= 50 ? 'ACHIEVED ✓' : 'NOT MET ✗'}`);
  }
  
  const randomTest = results.find(r => r.name === "Random Mashing");
  if (randomTest) {
    console.log(`\nGoal: Random mashing should not build excitement`);
    console.log(`Result: Max excitement ${randomTest.actualMax.toFixed(2)}`);
    console.log(`Status: ${randomTest.actualMax < 0.3 ? 'ACHIEVED ✓' : 'NOT MET ✗'}`);
  }
  
  return results;
}

// Export for use
export { MusicolourSimulator, runTests }; 