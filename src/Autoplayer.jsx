import { useCallback, useEffect, useRef, useState } from 'react';
import { SONGS } from './autoplayerSongs';

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
  const activeNotesRef = useRef(new Set());

  // Helper to clear all scheduled timeouts
  const clearAllTimeouts = () => {
    noteTimeoutsRef.current.forEach(id => clearTimeout(id));
    noteTimeoutsRef.current = [];
  };

  const stopSong = useCallback(() => {
    // Release all currently playing notes
    activeNotesRef.current.forEach(noteName => {
      const keyObj = keyDataArray.find(k => k.note === noteName);
      if (keyObj && handleKeyReleaseRef.current) {
        handleKeyReleaseRef.current(keyObj);
      }
    });
    activeNotesRef.current.clear();
    
    // Clear scheduled timeouts
    clearAllTimeouts();
    setAutoPlaying(false);
  }, [keyDataArray, handleKeyReleaseRef]);

  const playSong = useCallback((songIndex = 0, shouldLoop = true) => {
    // Clear any existing playback
    clearAllTimeouts();
    
    // Release all currently playing notes
    activeNotesRef.current.forEach(noteName => {
      const keyObj = keyDataArray.find(k => k.note === noteName);
      if (keyObj && handleKeyReleaseRef.current) {
        handleKeyReleaseRef.current(keyObj);
      }
    });
    activeNotesRef.current.clear();

    const song = SONGS[songIndex];
    if (!song) return;

    // Clear any existing active notes before starting
    activeNotesRef.current.clear();

    setAutoPlaying(true);
    const beatMs = 400; // Interval between notes

    song.sequence.forEach((noteName, idx) => {
      // Schedule note press
      const pressId = setTimeout(() => {
        const keyObj = keyDataArray.find(k => k.note === noteName);
        console.log(`Autoplayer: Playing note ${noteName}, keyObj:`, keyObj, 'handleKeyPressRef.current:', !!handleKeyPressRef.current);
        if (keyObj && handleKeyPressRef.current) {
          try {
            handleKeyPressRef.current(keyObj, 0.8);
            activeNotesRef.current.add(noteName); // Track active note
            console.log(`Autoplayer: Successfully triggered note ${noteName}`);
          } catch (err) {
            console.error(`Autoplayer: Error playing note ${noteName}:`, err);
          }
        } else if (!keyObj) {
          console.error(`Autoplayer: Could not find key for note ${noteName}`);
        } else if (!handleKeyPressRef.current) {
          console.error('Autoplayer: handleKeyPressRef.current is null!');
        }
      }, idx * beatMs);

      // Schedule note release just before next beat
      const releaseId = setTimeout(() => {
        const keyObj = keyDataArray.find(k => k.note === noteName);
        if (keyObj && handleKeyReleaseRef.current) {
          handleKeyReleaseRef.current(keyObj);
          activeNotesRef.current.delete(noteName); // Remove from active notes
        }

        // When last note is released
        if (idx === song.sequence.length - 1) {
          if (shouldLoop) {
            // Add a small delay before looping
            const loopId = setTimeout(() => {
              // Clear current timeouts
              noteTimeoutsRef.current.forEach(id => clearTimeout(id));
              noteTimeoutsRef.current = [];
              // Clear active notes before looping
              activeNotesRef.current.clear();
              setAutoPlaying(false);
              // Use setTimeout to ensure state is updated before calling playSong again
              setTimeout(() => playSong(songIndex, shouldLoop), 0);
            }, 500); // 500ms pause before looping
            noteTimeoutsRef.current.push(loopId);
          } else {
            // Just stop playing
            const stopId = setTimeout(() => {
          setAutoPlaying(false);
            }, 100);
            noteTimeoutsRef.current.push(stopId);
          }
        }
      }, idx * beatMs + beatMs * 0.9);

      noteTimeoutsRef.current.push(pressId, releaseId);
    });
  }, [keyDataArray, handleKeyPressRef, handleKeyReleaseRef]);

  // Clear timers and release notes on unmount
  useEffect(() => {
    return () => {
      // Release all active notes
      activeNotesRef.current.forEach(noteName => {
        const keyObj = keyDataArray.find(k => k.note === noteName);
        if (keyObj && handleKeyReleaseRef.current) {
          handleKeyReleaseRef.current(keyObj);
        }
      });
      activeNotesRef.current.clear();
      clearAllTimeouts();
    };
  }, [keyDataArray, handleKeyReleaseRef]);

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
              onClick={() => playSong(idx, true)}
              className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
            >
              Play (Loop)
            </button>
          )}
        </div>
      ))}
      <div className="text-xs text-gray-400 mt-2">
        Shift + ; to close | Shift + M to play demo song (loops)
      </div>
    </div>
  );
} 