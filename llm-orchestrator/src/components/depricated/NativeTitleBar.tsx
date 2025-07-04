import React, { useState, useEffect } from 'react';

interface WindowState {
  maximized: boolean;
  fullscreen: boolean;
  focused: boolean;
}

interface PlatformInfo {
  platform: string;
  arch: string;
  version: string;
  appVersion: string;
}

interface NativeTitleBarProps {
  title?: string;
  showMenuBar?: boolean;
  onMenuClick?: (menu: string) => void;
}

const NativeTitleBar: React.FC<NativeTitleBarProps> = ({ 
  title = "LLM Orchestrator", 
  showMenuBar = true,
  onMenuClick 
}) => {
  const [windowState, setWindowState] = useState<WindowState>({
    maximized: false,
    fullscreen: false,
    focused: true
  });
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    // Get platform info and initial window state
    if (window.electronAPI) {
      window.electronAPI.getPlatformInfo?.().then(setPlatformInfo);
      window.electronAPI.getWindowState?.().then(setWindowState);
    }

    // Listen for window state changes
    const handleWindowStateChange = (state: WindowState) => {
      setWindowState(state);
    };

    if (window.electronAPI?.onWindowStateChanged) {
      const removeListener = window.electronAPI.onWindowStateChanged(handleWindowStateChange);
      return removeListener;
    }
  }, []);

  const isMac = platformInfo?.platform === 'darwin';
  const isWindows = platformInfo?.platform === 'win32';
  const isLinux = platformInfo?.platform === 'linux';

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electronAPI?.maximizeWindow();
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  const handleMenuClick = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
    onMenuClick?.(menu);
  };

  const menus = [
    { id: 'file', label: 'File' },
    { id: 'models', label: 'Models' },
    { id: 'network', label: 'Network' },
    { id: 'orchestration', label: 'Orchestration' },
    { id: 'view', label: 'View' },
    { id: 'tools', label: 'Tools' },
    { id: 'settings', label: 'Settings' },
    { id: 'help', label: 'Help' }
  ];

  // Calculate title bar height and traffic light spacing
  const titleBarHeight = isMac ? 28 : 32;
  const trafficLightSpace = isMac ? 78 : 0;

  return (
    <div className="select-none bg-gray-900 border-b border-gray-700">
      {/* Title Bar */}
      <div 
        className={`flex items-center justify-between bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700`}
        style={{ 
          height: titleBarHeight,
          WebkitAppRegion: 'drag',
          paddingLeft: isMac ? trafficLightSpace : 8,
          paddingRight: isWindows ? 0 : 8
        } as any}
      >
        {/* macOS Traffic Lights Space - handled by system */}
        
        {/* App Icon and Title */}
        <div className="flex items-center space-x-3 px-3">
          <div className="w-4 h-4 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-sm flex-shrink-0 shadow-sm" />
          <span className="text-gray-200 text-sm font-medium tracking-wide">{title}</span>
          {!windowState.focused && (
            <span className="text-gray-500 text-xs">(Inactive)</span>
          )}
        </div>

        {/* Center - Version info for development */}
        {process.env.NODE_ENV === 'development' && platformInfo && (
          <div className="text-xs text-gray-500 hidden md:block">
            v{platformInfo.appVersion} • {platformInfo.platform}
          </div>
        )}

        {/* Window Controls (Windows/Linux) */}
        {!isMac && (
          <div 
            className="flex h-full"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            <button
              onClick={handleMinimize}
              className="flex items-center justify-center w-12 h-full hover:bg-gray-700 transition-colors group"
              title="Minimize"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" className="text-gray-300 group-hover:text-white">
                <path fill="currentColor" d="M0 5h12v2H0z"/>
              </svg>
            </button>
            
            <button
              onClick={handleMaximize}
              className="flex items-center justify-center w-12 h-full hover:bg-gray-700 transition-colors group"
              title={windowState.maximized ? "Restore Down" : "Maximize"}
            >
              {windowState.maximized ? (
                <svg width="12" height="12" viewBox="0 0 12 12" className="text-gray-300 group-hover:text-white">
                  <path fill="currentColor" d="M3 1v2H1v8h8V9h2V1H3zm6 8H2V4h7v5zm2-6V2H4v1h6v4h1V3z"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" className="text-gray-300 group-hover:text-white">
                  <path fill="currentColor" d="M1 1v10h10V1H1zm9 9H2V2h8v8z"/>
                </svg>
              )}
            </button>
            
            <button
              onClick={handleClose}
              className="flex items-center justify-center w-12 h-full hover:bg-red-600 transition-colors group"
              title="Close"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" className="text-gray-300 group-hover:text-white">
                <path fill="currentColor" d="M6.364 5l3.536-3.536L8.586 0 5.05 3.536 1.514 0 .1 1.414 3.636 5 .1 8.586 1.514 10 5.05 6.464 8.586 10 10 8.586 6.364 5z"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Menu Bar */}
      {showMenuBar && (
        <div 
          className="flex items-center h-7 bg-gray-800 border-b border-gray-700 px-3"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          {menus.map((menu) => (
            <button
              key={menu.id}
              onClick={() => handleMenuClick(menu.id)}
              className={`px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded-sm transition-all duration-150 ${
                activeMenu === menu.id ? 'bg-gray-700 text-white shadow-sm' : ''
              }`}
            >
              {menu.label}
            </button>
          ))}
          
          {/* Spacer */}
          <div className="flex-1" />
          
          {/* Status indicator */}
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Online</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NativeTitleBar;
