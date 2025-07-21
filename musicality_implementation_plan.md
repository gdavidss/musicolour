# MusiColour Musicality-Based System Implementation Plan

## Overview
Replace the current novelty-based excitement system with a musicality-based system that rewards good musical playing.

## Key Principles
1. **Reward Musical Playing**: Consonant intervals, scale consistency, melodic motion
2. **Appropriate Tempo**: Optimal range 80-140 BPM, penalties for extreme tempos
3. **Balance Repetition**: Some repetition is good (phrases), too much is boring
4. **Structural Awareness**: Recognize and reward musical phrases and patterns

## Core Metrics to Implement

### 1. Harmonic Quality (30% weight)
- **Consonant Intervals**: Perfect (0, 5, 7, 12) = full bonus, Imperfect (3, 4, 8, 9) = partial bonus
- **Scale Consistency**: Detect current key and reward in-scale notes
- **Chord Recognition**: Bonus for arpeggiated chords and harmonic progressions

### 2. Melodic Quality (25% weight)
- **Stepwise Motion**: Reward intervals ≤ 2 semitones
- **Melodic Contour**: Balance between ascending/descending motion
- **Leap Resolution**: Large leaps (>5 semitones) should be followed by stepwise motion

### 3. Rhythmic Quality (25% weight)
- **Tempo Consistency**: Maintain steady tempo, detect rushing/dragging
- **Beat Alignment**: Notes on strong beats get bonus
- **Rhythmic Patterns**: Recognize and reward consistent rhythmic patterns

### 4. Structural Quality (20% weight)
- **Phrase Detection**: 4-bar phrases with repetition/variation
- **Call and Response**: AABA, ABAB patterns
- **Dynamic Arc**: Build-up and resolution

## Implementation Steps

### Step 1: Create Musical Context Tracker
```javascript
class MusicalContext {
  - recentNotes: circular buffer of last 16 notes
  - recentTimings: timestamps for rhythm analysis
  - currentKey: detected key signature
  - beatGrid: inferred beat positions
  - phraseBuffer: 4-8 bar memory
  - harmonicProgression: chord detection
}
```

### Step 2: Replace Current Excitement Calculation
Current system uses:
- Regional repetition penalties
- Novelty scores
- Speed penalties

New system will use:
- Musical quality scores
- Tempo appropriateness
- Phrase recognition

### Step 3: Tuning Parameters
Based on testing:
- Simple scales reach max in ~6 seconds (too fast)
- Musical pieces (Twinkle, Happy Birthday) reach max in 6-7 seconds
- Random playing reaches 65% max
- Single note spam reaches 79% max (should be lower)

Target adjustments:
- Increase time to max for good playing: 20-30 seconds
- Decrease max for repetitive playing: <30%
- Decrease max for random playing: <40%

### Step 4: Visual Feedback
- Keep rainbow gradient for excitement level
- Add subtle visual cues for musical detection:
  - Pulse on beat detection
  - Color harmony when in key
  - Particle effects for phrase completion

## Testing Strategy

### Test Cases
1. **Good Musical Playing**
   - Scales in different keys
   - Simple melodies (nursery rhymes)
   - Arpeggiated chords
   - Jazz patterns

2. **Poor Playing**
   - Random notes
   - Single note repetition
   - Extreme tempo (too fast/slow)
   - Atonal jumping

3. **Edge Cases**
   - Chromatic scales
   - Modal playing
   - Polyrhythmic patterns

### Success Criteria
- Musical playing reaches 100% in 20-30 seconds
- Non-musical playing stays below 40%
- System responds appropriately to tempo changes
- Visual feedback enhances musical understanding

## Migration Path
1. Keep existing Pask-inspired visual system
2. Replace excitement calculation engine
3. Maintain backwards compatibility with MIDI analysis
4. Test with both ringtones and film clips datasets 