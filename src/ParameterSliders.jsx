import React from 'react';

function ParameterSliders({ paramDefs, params, onParamChange }) {
  return (
    <div className="bg-gray-800 bg-opacity-70 text-white p-4 rounded-lg w-full">
      <h2 className="text-sm font-bold mb-2 tracking-wide">PARAMETERS</h2>
      {Object.entries(paramDefs).map(([key, def]) => (
        <div key={key} className="mb-3">
          <label className="block text-xs mb-1 font-mono">{def.label || key}</label>
          <input
            type="range"
            min={def.min}
            max={def.max}
            step={def.step}
            value={params[key]}
            onChange={(e) => onParamChange(key, parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-right text-xs tabular-nums mt-0.5">
            {params[key].toFixed(3)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ParameterSliders; 