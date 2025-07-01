import React, { useState, useEffect } from 'react';
import { NetworkScanConfig, ScanRange, CustomIP } from '../types/network-discovery';

interface NetworkScanSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: NetworkScanConfig) => Promise<void>;
}

export default function NetworkScanSettingsModal({ isOpen, onClose, onSave }: NetworkScanSettingsModalProps) {
  const [config, setConfig] = useState<NetworkScanConfig>({
    scanSettings: {
      enabled: false,
      timeout: 2000,
      concurrency: 50,
      retries: 1
    },
    scanRanges: [
      {
        name: "Local Subnet (Auto)",
        type: "auto",
        enabled: true
      }
    ],
    customIPs: [],
    servicePorts: {
      ollama: ['11434'],
      lmStudio: ['1234']
    },
    excludeIPs: []
  });

  const [activeTab, setActiveTab] = useState<'general' | 'ranges' | 'custom' | 'ports' | 'exclude'>('general');
  const [saving, setSaving] = useState(false);

  // Load current config when modal opens (mock for now)
  useEffect(() => {
    if (isOpen) {
      // This will be replaced with actual API call
      console.log('Loading scan configuration...');
    }
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(config);
      onClose();
    } catch (error) {
      console.error('Failed to save scan config:', error);
    } finally {
      setSaving(false);
    }
  };

  const addScanRange = () => {
    setConfig(prev => ({
      ...prev,
      scanRanges: [...prev.scanRanges, {
        name: `Range ${prev.scanRanges.length + 1}`,
        type: 'subnet',
        subnet: '192.168.1',
        startIP: 1,
        endIP: 254,
        enabled: true
      }]
    }));
  };

  const updateScanRange = (index: number, updates: Partial<ScanRange>) => {
    setConfig(prev => ({
      ...prev,
      scanRanges: prev.scanRanges.map((range, i) => 
        i === index ? { ...range, ...updates } : range
      )
    }));
  };

  const removeScanRange = (index: number) => {
    setConfig(prev => ({
      ...prev,
      scanRanges: prev.scanRanges.filter((_, i) => i !== index)
    }));
  };

  const addCustomIP = () => {
    setConfig(prev => ({
      ...prev,
      customIPs: [...prev.customIPs, {
        name: `Device ${prev.customIPs.length + 1}`,
        ip: '',
        enabled: true
      }]
    }));
  };

  const updateCustomIP = (index: number, updates: Partial<CustomIP>) => {
    setConfig(prev => ({
      ...prev,
      customIPs: prev.customIPs.map((ip, i) => 
        i === index ? { ...ip, ...updates } : ip
      )
    }));
  };

  const removeCustomIP = (index: number) => {
    setConfig(prev => ({
      ...prev,
      customIPs: prev.customIPs.filter((_, i) => i !== index)
    }));
  };

  const addServicePort = (service: 'ollama' | 'lmStudio', port: string) => {
    if (port && !config.servicePorts[service].includes(port)) {
      setConfig(prev => ({
        ...prev,
        servicePorts: {
          ...prev.servicePorts,
          [service]: [...prev.servicePorts[service], port]
        }
      }));
    }
  };

  const removeServicePort = (service: 'ollama' | 'lmStudio', portIndex: number) => {
    setConfig(prev => ({
      ...prev,
      servicePorts: {
        ...prev.servicePorts,
        [service]: prev.servicePorts[service].filter((_, i) => i !== portIndex)
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-4/5 max-w-4xl h-4/5 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Network Scan Settings</h2>
            <p className="text-gray-600">Configure network discovery parameters</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { key: 'general', label: 'General' },
            { key: 'ranges', label: 'Scan Ranges' },
            { key: 'custom', label: 'Custom IPs' },
            { key: 'ports', label: 'Service Ports' },
            { key: 'exclude', label: 'Exclude IPs' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="scanEnabled"
                  checked={config.scanSettings.enabled}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    scanSettings: { ...prev.scanSettings, enabled: e.target.checked }
                  }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="scanEnabled" className="font-medium text-gray-900">
                  Enable Network Scanning
                </label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeout (ms)
                  </label>
                  <input
                    type="number"
                    value={config.scanSettings.timeout}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      scanSettings: { ...prev.scanSettings, timeout: parseInt(e.target.value) || 2000 }
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Concurrency
                  </label>
                  <input
                    type="number"
                    value={config.scanSettings.concurrency}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      scanSettings: { ...prev.scanSettings, concurrency: parseInt(e.target.value) || 50 }
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Retries
                  </label>
                  <input
                    type="number"
                    value={config.scanSettings.retries}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      scanSettings: { ...prev.scanSettings, retries: parseInt(e.target.value) || 1 }
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-yellow-600">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Performance Note
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>Higher concurrency values scan faster but may overwhelm slower networks. Lower timeout values reduce scan time but may miss slower-responding devices.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scan Ranges */}
          {activeTab === 'ranges' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Scan Ranges</h3>
                <button
                  onClick={addScanRange}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Range
                </button>
              </div>

              {config.scanRanges.map((range, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={range.enabled}
                        onChange={(e) => updateScanRange(index, { enabled: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <input
                        type="text"
                        value={range.name}
                        onChange={(e) => updateScanRange(index, { name: e.target.value })}
                        className="font-medium border border-gray-300 rounded px-2 py-1"
                      />
                    </div>
                    <button
                      onClick={() => removeScanRange(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type
                      </label>
                      <select
                        value={range.type}
                        onChange={(e) => updateScanRange(index, { type: e.target.value as 'auto' | 'subnet' })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      >
                        <option value="auto">Auto-detect</option>
                        <option value="subnet">Custom Subnet</option>
                      </select>
                    </div>

                    {range.type === 'subnet' && (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Subnet (e.g., 192.168.1)
                          </label>
                          <input
                            type="text"
                            value={range.subnet || ''}
                            onChange={(e) => updateScanRange(index, { subnet: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            placeholder="192.168.1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start IP
                          </label>
                          <input
                            type="number"
                            value={range.startIP || 1}
                            onChange={(e) => updateScanRange(index, { startIP: parseInt(e.target.value) || 1 })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            min="1"
                            max="254"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            End IP
                          </label>
                          <input
                            type="number"
                            value={range.endIP || 254}
                            onChange={(e) => updateScanRange(index, { endIP: parseInt(e.target.value) || 254 })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            min="1"
                            max="254"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Other tabs - Custom IPs, Ports, Exclude would go here */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Custom IP Addresses</h3>
                <button
                  onClick={addCustomIP}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add IP
                </button>
              </div>

              {config.customIPs.map((customIP, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={customIP.enabled}
                      onChange={(e) => updateCustomIP(index, { enabled: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={customIP.name}
                        onChange={(e) => updateCustomIP(index, { name: e.target.value })}
                        placeholder="Device name"
                        className="border border-gray-300 rounded-lg px-3 py-2"
                      />
                      <input
                        type="text"
                        value={customIP.ip}
                        onChange={(e) => updateCustomIP(index, { ip: e.target.value })}
                        placeholder="192.168.1.100"
                        className="border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <button
                      onClick={() => removeCustomIP(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              {config.customIPs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No custom IP addresses configured
                </div>
              )}
            </div>
          )}

          {/* Continue with other tabs as needed */}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
