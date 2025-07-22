import React from 'react';
import ParameterSliders from './ParameterSliders';
import MidiInputSelector from './MidiInputSelector';

function SettingsPanel({ 
  isOpen, 
  onClose, 
  paramDefs, 
  params, 
  onParamChange, 
  onDeviceSelected 
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={`fixed top-0 right-0 h-full w-96 bg-gray-900 bg-opacity-95 p-6 z-30 shadow-2xl overflow-y-auto transition-transform transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white font-mono">Settings</h2>
        <button 
          onClick={onClose} 
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Close settings"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
      <div className="space-y-8">
        <MidiInputSelector onDeviceSelected={onDeviceSelected} />
        <ParameterSliders paramDefs={paramDefs} params={params} onParamChange={onParamChange} />
      </div>
    </div>
  );
}

export default SettingsPanel; 