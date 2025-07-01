import React, { useState, useEffect } from 'react';
import { DiscoveredDevice, NetworkDiscoveryState } from '../types/network-discovery';

interface NetworkDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NetworkDiscoveryModal({ isOpen, onClose }: NetworkDiscoveryModalProps) {
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [scanRange, setScanRange] = useState('auto');
  const [customRange, setCustomRange] = useState('192.168.1.1-254');

  const handleStartScan = async () => {
    setScanning(true);
    setScanProgress(0);
    setDevices([]);
    
    try {
      console.log('Starting network scan...');
      
      // Mock scanning progress for development
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            setScanning(false);
            // Add mock discovered devices
            setDevices([
              {
                id: '1',
                name: 'Ollama Server',
                host: '192.168.1.100',
                port: 11434,
                type: 'ollama',
                status: 'discovered',
                version: '0.1.24'
              },
              {
                id: '2',
                name: 'LM Studio',
                host: '192.168.1.150',
                port: 1234,
                type: 'lm-studio',
                status: 'discovered',
                models: ['llama2', 'codellama']
              }
            ]);
            return 100;
          }
          return prev + 10;
        });
      }, 300);
      
    } catch (error) {
      console.error('Failed to start scan:', error);
      setScanning(false);
    }
  };

  const handleStopScan = async () => {
    setScanning(false);
  };

  const handleDeviceConnect = async (device: DiscoveredDevice) => {
    try {
      console.log('Connecting to device:', device);
      setDevices(prev => prev.map(d => 
        d.id === device.id ? { ...d, status: 'connecting' } : d
      ));
      
      // Mock connection delay
      setTimeout(() => {
        setDevices(prev => prev.map(d => 
          d.id === device.id ? { ...d, status: 'connected' } : d
        ));
      }, 2000);
      
    } catch (error) {
      console.error('Failed to connect to device:', error);
      setDevices(prev => prev.map(d => 
        d.id === device.id ? { ...d, status: 'failed' } : d
      ));
    }
  };

  const handleAddToConfig = async (device: DiscoveredDevice) => {
    try {
      console.log('Adding device to config:', device);
      // This will be implemented when Electron API is available
    } catch (error) {
      console.error('Failed to add device to config:', error);
    }
  };

  const handleBulkConnect = async () => {
    const selectedDeviceList = devices.filter(d => selectedDevices.has(d.id));
    
    for (const device of selectedDeviceList) {
      try {
        await handleDeviceConnect(device);
      } catch (error) {
        console.error(`Failed to connect to ${device.name}:`, error);
      }
    }
  };

  const toggleDeviceSelection = (deviceId: string) => {
    const newSelected = new Set(selectedDevices);
    if (newSelected.has(deviceId)) {
      newSelected.delete(deviceId);
    } else {
      newSelected.add(deviceId);
    }
    setSelectedDevices(newSelected);
  };

  const getDeviceIcon = (type: string, status: string) => {
    const baseIcon = type === 'ollama' ? '🦙' : '🤖';
    const statusEmoji = {
      discovered: '🔍',
      connecting: '🔄',
      connected: '✅',
      failed: '❌'
    }[status] || '❓';
    
    return `${baseIcon} ${statusEmoji}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'connecting': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-5/6 h-5/6 max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Network Discovery</h2>
            <p className="text-gray-600">Discover and manage LLM services on your network</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Scan Controls */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <select 
                value={scanRange} 
                onChange={(e) => setScanRange(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="auto">Auto-detect range</option>
                <option value="local">Local subnet only</option>
                <option value="custom">Custom range</option>
              </select>
              
              {scanRange === 'custom' && (
                <input
                  type="text"
                  value={customRange}
                  onChange={(e) => setCustomRange(e.target.value)}
                  placeholder="192.168.1.1-254"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40"
                />
              )}
            </div>

            <div className="flex space-x-3">
              {scanning ? (
                <button
                  onClick={handleStopScan}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Stop Scan
                </button>
              ) : (
                <button
                  onClick={handleStartScan}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start Scan
                </button>
              )}
              
              {selectedDevices.size > 0 && (
                <button
                  onClick={handleBulkConnect}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Connect Selected ({selectedDevices.size})
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {scanning && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Scanning network...</span>
                <span>{Math.round(scanProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-hidden">
          {devices.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-xl">
                  {scanning ? 'Scanning for devices...' : 'No devices found'}
                </p>
                <p className="text-sm">
                  {scanning ? 'Please wait while we search your network' : 'Click "Start Scan" to discover LLM services'}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-y-auto h-full">
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {devices.map((device) => (
                    <div
                      key={device.id}
                      className={`border rounded-lg p-4 transition-all duration-200 ${
                        selectedDevices.has(device.id) 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedDevices.has(device.id)}
                            onChange={() => toggleDeviceSelection(device.id)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-2xl">
                            {getDeviceIcon(device.type, device.status)}
                          </span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(device.status)}`}>
                          {device.status}
                        </span>
                      </div>

                      <h3 className="font-semibold text-gray-900 mb-1">{device.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {device.host}:{device.port} • {device.type}
                      </p>

                      {device.version && (
                        <p className="text-xs text-gray-500 mb-2">
                          Version: {device.version}
                        </p>
                      )}

                      {device.models && device.models.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Models ({device.models.length}):</p>
                          <div className="flex flex-wrap gap-1">
                            {device.models.slice(0, 3).map((model, idx) => (
                              <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                {model}
                              </span>
                            ))}
                            {device.models.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                                +{device.models.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDeviceConnect(device)}
                          disabled={device.status === 'connecting' || device.status === 'connected'}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {device.status === 'connecting' ? 'Connecting...' : 
                           device.status === 'connected' ? 'Connected' : 'Connect'}
                        </button>
                        <button
                          onClick={() => handleAddToConfig(device)}
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Found {devices.length} device{devices.length !== 1 ? 's' : ''}
            {selectedDevices.size > 0 && ` • ${selectedDevices.size} selected`}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setSelectedDevices(new Set())}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={selectedDevices.size === 0}
            >
              Clear Selection
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
