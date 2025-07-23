// Autoplay songs data
const PATTERN_1 = ['C4', 'E4', 'G4', 'B4', 'C5', 'B4', 'G4', 'E4'];
const PATTERN_2 = ['D4', 'F4', 'A4', 'C5', 'D5', 'C5', 'A4', 'F4'];

const repeatPattern = (pattern, times) => Array(times).fill(pattern).flat();

const SONG_SEQUENCE = [
  ...repeatPattern(PATTERN_1, 4),
  ...repeatPattern(PATTERN_2, 4),
  ...repeatPattern(PATTERN_1, 4),
  ...repeatPattern(PATTERN_2, 4)
];

export const SONGS = [
  {
    name: 'Autoplayer Demo Song',
    sequence: SONG_SEQUENCE
  }
]; 