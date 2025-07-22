import React, { useState, useEffect } from 'react';

function MidiInputSelector({ onDeviceSelected }) {
  const [midiInputs, setMidiInputs] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const getMidiInputs = async () => {
      if (navigator.requestMIDIAccess) {
        try {
          const midiAccess = await navigator.requestMIDIAccess();
          const inputs = Array.from(midiAccess.inputs.values());
          setMidiInputs(inputs);
          if (inputs.length > 0 && !selectedDeviceId) {
            const firstDevice = inputs[0];
            setSelectedDeviceId(firstDevice.id);
            if (onDeviceSelected) {
              onDeviceSelected(firstDevice);
            }
          }
        } catch (err) {
          setError('Could not access MIDI devices. Please ensure you have given permission.');
          console.error('MIDI access error:', err);
        }
      } else {
        setError('Web MIDI API is not supported in this browser.');
      }
    };

    getMidiInputs();
    
    const handleStateChange = (event) => {
        console.log('MIDI state changed:', event);
        getMidiInputs(); // Re-fetch devices on change
    };

    navigator.requestMIDIAccess?.().then(access => {
        access.addEventListener('statechange', handleStateChange);
        return () => {
            access.removeEventListener('statechange', handleStateChange);
        }
    });

  }, [onDeviceSelected, selectedDeviceId]);

  const handleDeviceChange = (event) => {
    const deviceId = event.target.value;
    setSelectedDeviceId(deviceId);
    if (onDeviceSelected) {
        const selectedDevice = midiInputs.find(input => input.id === deviceId);
        if (selectedDevice) {
            onDeviceSelected(selectedDevice);
        }
    }
  };

  if (error) {
    return <div className="midi-selector text-red-400 p-2">{error}</div>;
  }

  return (
    <div className="midi-selector p-4 bg-gray-800 bg-opacity-70 rounded-lg text-white shadow-lg">
      <label htmlFor="midi-select" className="block text-sm font-medium mb-2 font-mono">MIDI Input:</label>
      <select
        id="midi-select"
        value={selectedDeviceId}
        onChange={handleDeviceChange}
        className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        disabled={midiInputs.length === 0}
      >
        {midiInputs.length > 0 ? (
          midiInputs.map((input) => (
            <option key={input.id} value={input.id}>
              {input.name}
            </option>
          ))
        ) : (
          <option disabled>No MIDI devices found</option>
        )}
      </select>
    </div>
  );
}

export default MidiInputSelector; 