import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------- SONG DEFINITIONS ----------------
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

/**
 * React hook that provides autoplay functionality.
 *
 * @param {object} handleKeyPressRef - ref to latest handleKeyPress(keyObj, velocity)
 * @param {object} handleKeyReleaseRef - ref to latest handleKeyRelease(keyObj)
 * @param {Array} keyDataArray - Array of piano key objects with a `note` property
 */
export function useAutoplayer(handleKeyPressRef, handleKeyReleaseRef, keyDataArray) {
  const [autoPlaying, setAutoPlaying] = useState(false);
  const noteTimeoutsRef = useRef([]);

  // Helper to clear all scheduled timeouts
  const clearAllTimeouts = () => {
    noteTimeoutsRef.current.forEach(id => clearTimeout(id));
    noteTimeoutsRef.current = [];
  };

  const stopSong = useCallback(() => {
    clearAllTimeouts();
    setAutoPlaying(false);
  }, []);

  const playSong = useCallback((songIndex = 0) => {
    if (autoPlaying) return; // Ignore if already playing

    const song = SONGS[songIndex];
    if (!song) return;

    setAutoPlaying(true);
    const beatMs = 400; // Interval between notes

    song.sequence.forEach((noteName, idx) => {
      // Schedule note press
      const pressId = setTimeout(() => {
        const keyObj = keyDataArray.find(k => k.note === noteName);
        if (keyObj && handleKeyPressRef.current) {
          handleKeyPressRef.current(keyObj, 0.8);
        }
      }, idx * beatMs);

      // Schedule note release just before next beat
      const releaseId = setTimeout(() => {
        const keyObj = keyDataArray.find(k => k.note === noteName);
        if (keyObj && handleKeyReleaseRef.current) {
          handleKeyReleaseRef.current(keyObj);
        }

        // When last note is released, mark playback done
        if (idx === song.sequence.length - 1) {
          setAutoPlaying(false);
        }
      }, idx * beatMs + beatMs * 0.9);

      noteTimeoutsRef.current.push(pressId, releaseId);
    });
  }, [autoPlaying, keyDataArray, handleKeyPressRef, handleKeyReleaseRef]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, []);

  return { autoPlaying, playSong, stopSong };
}

export function AutoplayerPanel({ visible, autoPlaying, playSong, stopSong }) {
  if (!visible) return null;

  return (
    <div className="fixed left-1/2 transform -translate-x-1/2 top-20 bg-gray-900 bg-opacity-90 text-white p-4 rounded-lg z-40 text-sm font-mono">
      <h3 className="font-bold mb-3">Autoplayer</h3>
      {SONGS.map((song, idx) => (
        <div key={idx} className="flex items-center mb-2">
          <span className="mr-4">{song.name}</span>
          {autoPlaying ? (
            <button
              onClick={stopSong}
              className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={() => playSong(idx)}
              className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
            >
              Play
            </button>
          )}
        </div>
      ))}
      <div className="text-xs text-gray-400 mt-2">Shift + ; to close</div>
    </div>
  );
} 