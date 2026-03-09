import React from 'react';

export default function ConfigTab({ config, updateConfig }) {
  const handleChange = (key, value) => {
    updateConfig({ ...config, [key]: value });
  };

  const handleNestedChange = (category, key, value) => {
    updateConfig({
      ...config,
      [category]: { ...config[category], [key]: value },
    });
  };

  return (
    <div className="p-4 bg-white rounded shadow max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold mb-4 border-b pb-2">Configuration Settings</h2>

      <section>
        <h3 className="font-medium text-lg mb-2">General Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center space-x-2">
            <span>Decimals:</span>
            <select
              value={config.decimals}
              onChange={(e) => handleChange('decimals', parseInt(e.target.value, 10))}
              className="border p-1 rounded bg-gray-50"
            >
              <option value="1">1</option>
              <option value="4">4</option>
            </select>
          </label>
          <label className="flex items-center space-x-2">
            <span>Angle Format:</span>
            <select
              value={config.angleFormat}
              onChange={(e) => handleChange('angleFormat', e.target.value)}
              className="border p-1 rounded bg-gray-50"
            >
              <option value="degrees">Degrees</option>
              <option value="hundredths">Hundredths</option>
            </select>
          </label>
        </div>
      </section>

      <section>
        <h3 className="font-medium text-lg mb-2">Pipeline Defaults</h3>
        <div className="space-y-2">
          <label className="flex flex-col">
            <span className="text-sm font-medium">Pipeline Reference:</span>
            <input
              type="text"
              value={config.pipelineRef}
              onChange={(e) => handleChange('pipelineRef', e.target.value)}
              className="border p-1 rounded bg-gray-50 mt-1"
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="font-medium text-lg mb-2 border-t pt-4">Smart Fixer Params</h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm">Connection Tolerance (mm)</span>
            <input
              type="number"
              step="0.1"
              value={config.smartFixer.connectionTolerance}
              onChange={(e) => handleNestedChange('smartFixer', 'connectionTolerance', parseFloat(e.target.value))}
              className="border p-1 rounded bg-gray-50"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm">Grid Snap Resolution (mm)</span>
            <input
              type="number"
              step="0.1"
              value={config.smartFixer.gridSnapResolution}
              onChange={(e) => handleNestedChange('smartFixer', 'gridSnapResolution', parseFloat(e.target.value))}
              className="border p-1 rounded bg-gray-50"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm">Auto-Fill Max Gap (mm)</span>
            <input
              type="number"
              step="0.1"
              value={config.smartFixer.autoFillMaxGap}
              onChange={(e) => handleNestedChange('smartFixer', 'autoFillMaxGap', parseFloat(e.target.value))}
              className="border p-1 rounded bg-gray-50"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm">Auto-Trim Max Overlap (mm)</span>
            <input
              type="number"
              step="0.1"
              value={config.smartFixer.autoTrimMaxOverlap}
              onChange={(e) => handleNestedChange('smartFixer', 'autoTrimMaxOverlap', parseFloat(e.target.value))}
              className="border p-1 rounded bg-gray-50"
            />
          </label>
        </div>
      </section>
    </div>
  );
}
