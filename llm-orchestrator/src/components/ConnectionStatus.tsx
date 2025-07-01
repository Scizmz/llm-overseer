import React, { useEffect, useState } from 'react';
import websocketService from '../services/websocket';

interface LLMStatus {
  id: string;
  name: string;
  type: string;
  status: string;
  endpoint?: string;
}

interface NetworkDevice {
  id: string;
  name: string;
  type: 'ollama' | 'lm-studio';
  status: 'connected' | 'disconnected' | 'discovering';
  host: string;
  port: number;
}

export const ConnectionStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastPing, setLastPing] = useState<string>('');
  const [llms, setLLMs] = useState<LLMStatus[]>([]);
  const [networkDevices, setNetworkDevices] = useState<NetworkDevice[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Connection status
    websocketService.on('socket-connected', setIsConnected);
    
    // Initial state
    websocketService.on('initial-state', (data: any) => {
      if (data.availableLLMs) {
        setLLMs(data.availableLLMs);
      }
      if (data.networkDevices) {
        setNetworkDevices(data.networkDevices);
      }
    });
    
    // LLM updates
    websocketService.on('llm-update', (data: any) => {
      if (data.type === 'connected') {
        setLLMs(prev => [...prev, data.llm]);
      } else if (data.type === 'disconnected') {
        setLLMs(prev => prev.filter(llm => llm.id !== data.llmId));
      }
    });

    // Network device updates
    websocketService.on('network-device-update', (data: any) => {
      if (data.type === 'connected') {
        setNetworkDevices(prev => [...prev, data.device]);
      } else if (data.type === 'disconnected') {
        setNetworkDevices(prev => prev.filter(device => device.id !== data.deviceId));
      } else if (data.type === 'status-change') {
        setNetworkDevices(prev => prev.map(device => 
          device.id === data.deviceId ? { ...device, status: data.status } : device
        ));
      }
    });
    
    // Ping test
    const interval = setInterval(async () => {
      try {
        const response = await websocketService.ping();
        setLastPing(new Date(response.timestamp).toLocaleTimeString());
      } catch (error) {
        console.error('Ping failed:', error);
      }
    }, 10000); // Ping every 10 seconds

    return () => {
      websocketService.off('socket-connected', setIsConnected);
      websocketService.off('llm-update');
      websocketService.off('network-device-update');
      clearInterval(interval);
    };
  }, []);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'ollama': return '🦙';
      case 'lm-studio': return '🤖';
      default: return '💻';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'discovering': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const totalDevices = llms.length + networkDevices.length;
  const connectedDevices = llms.filter(llm => llm.status === 'connected').length + 
                           networkDevices.filter(device => device.status === 'connected').length;

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Main Status Bar */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-750 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {/* Connection Indicator */}
          <div className={`flex items-center gap-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            <span className="text-sm font-medium">
              Orchestrator: {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Device Count */}
          {totalDevices > 0 && (
            <div className="text-gray-300 text-sm">
              {connectedDevices}/{totalDevices} devices
            </div>
          )}

          {/* Last Ping */}
          {lastPing && isConnected && (
            <span className="text-xs text-gray-500">
              Last ping: {lastPing}
            </span>
          )}
        </div>

        {/* Expand/Collapse Indicator */}
        {totalDevices > 0 && (
          <div className="text-gray-400">
            {isExpanded ? '▲' : '▼'}
          </div>
        )}
      </div>

      {/* Expanded Device List */}
      {isExpanded && totalDevices > 0 && (
        <div className="border-t border-gray-700 bg-gray-750">
          {/* Cloud LLMs */}
          {llms.length > 0 && (
            <div className="p-3">
              <div className="text-gray-400 text-xs mb-2 font-medium">Cloud LLMs:</div>
              <div className="space-y-1">
                {llms.map(llm => (
                  <div key={llm.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        llm.status === 'connected' ? 'bg-green-500' : 'bg-gray-500'
                      }`} />
                      <span className="text-gray-300">{llm.name}</span>
                      <span className="text-gray-500">({llm.type})</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      llm.status === 'connected' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {llm.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Network Devices */}
          {networkDevices.length > 0 && (
            <div className="p-3 border-t border-gray-700">
              <div className="text-gray-400 text-xs mb-2 font-medium">Network Devices:</div>
              <div className="space-y-1">
                {networkDevices.map(device => (
                  <div key={device.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(device.status)}`} />
                      <span className="text-lg">{getDeviceIcon(device.type)}</span>
                      <span className="text-gray-300">{device.name}</span>
                      <span className="text-gray-500">({device.host}:{device.port})</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      device.status === 'connected' ? 'bg-green-900 text-green-300' : 
                      device.status === 'discovering' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-red-900 text-red-300'
                    }`}>
                      {device.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="p-3 border-t border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs">Quick Actions:</span>
              <div className="flex space-x-2">
                <button 
                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Trigger network scan
                    if (window.electronAPI?.startNetworkScan) {
                      window.electronAPI.startNetworkScan();
                    }
                  }}
                >
                  Scan
                </button>
                <button 
                  className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Refresh connections
                    websocketService.disconnect();
                    setTimeout(() => websocketService.connect(), 1000);
                  }}
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
