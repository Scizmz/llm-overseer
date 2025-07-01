import React, { useState, useEffect } from "react";

interface StatusBarProps {
  status: string;
}

interface SystemStats {
  connectedDevices: number;
  activeModels: number;
  lastScan: Date | null;
  orchestratorStatus: 'online' | 'offline' | 'degraded';
}

export default function StatusBar({ status }: StatusBarProps) {
  const [systemStats, setSystemStats] = useState<SystemStats>({
    connectedDevices: 0,
    activeModels: 0,
    lastScan: null,
    orchestratorStatus: 'offline'
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Load system stats (mock for now)
    const loadStats = () => {
      // This would come from your store or API
      setSystemStats({
        connectedDevices: 2,
        activeModels: 3,
        lastScan: new Date(Date.now() - 300000), // 5 minutes ago
        orchestratorStatus: 'online'
      });
    };

    loadStats();
    
    // Update stats every 30 seconds
    const statsInterval = setInterval(loadStats, 30000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(statsInterval);
    };
  }, []);

  const getStatusColor = (status: string) => {
    if (status.includes('Error') || status.includes('Failed')) {
      return 'text-red-600';
    }
    if (status.includes('Warning') || status.includes('scanning')) {
      return 'text-yellow-600';
    }
    if (status.includes('Success') || status.includes('saved') || status.includes('operational')) {
      return 'text-green-600';
    }
    return 'text-gray-700';
  };

  const getOrchestratorStatusColor = () => {
    switch (systemStats.orchestratorStatus) {
      case 'online': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'offline': return 'text-red-600';
    }
  };

  const formatLastScan = (lastScan: Date | null) => {
    if (!lastScan) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - lastScan.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  return (
    <div className="px-4 py-2 bg-gray-800 text-white text-xs border-t border-gray-700">
      <div className="flex items-center justify-between">
        {/* Left side - Main status */}
        <div className="flex items-center space-x-4">
          <span className={`font-medium ${getStatusColor(status)}`}>
            {status}
          </span>
          
          {/* System Stats */}
          <div className="flex items-center space-x-3 text-gray-300">
            <span className="flex items-center space-x-1">
              <span>🔗</span>
              <span>{systemStats.connectedDevices} devices</span>
            </span>
            
            <span className="flex items-center space-x-1">
              <span>🤖</span>
              <span>{systemStats.activeModels} models</span>
            </span>
            
            <span className="flex items-center space-x-1">
              <span>🔍</span>
              <span>Last scan: {formatLastScan(systemStats.lastScan)}</span>
            </span>
          </div>
        </div>

        {/* Right side - System info */}
        <div className="flex items-center space-x-4 text-gray-300">
          {/* Orchestrator Status */}
          <div className="flex items-center space-x-2">
            <span>Orchestrator:</span>
            <span className={`font-medium ${getOrchestratorStatusColor()}`}>
              {systemStats.orchestratorStatus}
            </span>
            <div className={`w-2 h-2 rounded-full ${
              systemStats.orchestratorStatus === 'online' ? 'bg-green-500' :
              systemStats.orchestratorStatus === 'degraded' ? 'bg-yellow-500' :
              'bg-red-500'
            }`} />
          </div>

          {/* Current Time */}
          <div className="flex items-center space-x-2">
            <span>🕐</span>
            <span>{currentTime.toLocaleTimeString()}</span>
          </div>

          {/* Version Info */}
          <div className="text-gray-400">
            v1.0.0-beta
          </div>
        </div>
      </div>
    </div>
  );
}
