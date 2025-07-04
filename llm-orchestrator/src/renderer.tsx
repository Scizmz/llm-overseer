import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { useStore } from './store';
import './native.css';

// Import your existing components
import ChatPanel from './components/ChatPanel';
import NetworkDashboard from './components/NetworkDashboard';
import SettingsPanel from './components/SettingsPanel';
import Sidebar from './components/Sidebar';
import StatusBar from './components/StatusBar';

// Custom Title Bar Component (draggable)
function CustomTitleBar({ onMinimize, onMaximize, onClose, isMaximized, isFocused, platform }: {
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  isMaximized: boolean;
  isFocused: boolean;
  platform: string;
}) {
  return (
    <div className="custom-title-bar">
      {/* Centered App Title */}
      <div className="title-bar-title">LLM Orchestrator</div>
      
      {/* macOS Controls (left side) */}
      {platform === 'darwin' && (
        <div className="window-controls-macos">
          <button
            onClick={onClose}
            className={`macos-control-btn close ${!isFocused ? 'unfocused' : ''}`}
            onMouseEnter={(e) => { e.currentTarget.textContent = '✕'; }}
            onMouseLeave={(e) => { e.currentTarget.textContent = ''; }}
          />
          <button
            onClick={onMinimize}
            className={`macos-control-btn minimize ${!isFocused ? 'unfocused' : ''}`}
            onMouseEnter={(e) => { e.currentTarget.textContent = '−'; }}
            onMouseLeave={(e) => { e.currentTarget.textContent = ''; }}
          />
          <button
            onClick={onMaximize}
            className={`macos-control-btn maximize ${!isFocused ? 'unfocused' : ''}`}
            onMouseEnter={(e) => { e.currentTarget.textContent = isMaximized ? '⌄' : '⌃'; }}
            onMouseLeave={(e) => { e.currentTarget.textContent = ''; }}
          />
        </div>
      )}

      {/* Windows/Linux Controls (right side) */}
      {platform !== 'darwin' && (
        <div className="window-controls-win">
          <button
            onClick={onMinimize}
            className={`win-control-btn ${!isFocused ? 'unfocused' : ''}`}
          >
            ⎯
          </button>
          <button
            onClick={onMaximize}
            className={`win-control-btn ${!isFocused ? 'unfocused' : ''}`}
          >
            {isMaximized ? '❐' : '☐'}
          </button>
          <button
            onClick={onClose}
            className="win-control-btn close"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// Custom Menu Bar Component
function CustomMenuBar() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const menuItems = [
    { id: 'file', label: 'File' },
    { id: 'edit', label: 'Edit' },
    { id: 'view', label: 'View' },
    { id: 'models', label: 'Models' },
    { id: 'network', label: 'Network' },
    { id: 'tools', label: 'Tools' },
    { id: 'help', label: 'Help' }
  ];

  const handleMenuClick = (menuId: string) => {
    setActiveMenu(activeMenu === menuId ? null : menuId);
    // TODO: Implement dropdown menus
    console.log(`${menuId} menu clicked`);
  };

  return (
    <div className="custom-menu-bar">
      {menuItems.map(item => (
        <button
          key={item.id}
          onClick={() => handleMenuClick(item.id)}
          className={`menu-item ${activeMenu === item.id ? 'active' : ''}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

// Main App Component
function App() {
  const [currentView, setCurrentView] = useState<'chat' | 'network' | 'settings'>('chat');
  const [systemStatus, setSystemStatus] = useState<string>('Ready');
  const [windowState, setWindowState] = useState({
    maximized: false,
    fullscreen: false,
    focused: true
  });
  const [platform, setPlatform] = useState<string>('');

  // Window control handlers
  const handleMinimize = async () => {
    if (window.electronAPI?.windowMinimize) {
      await window.electronAPI.windowMinimize();
    }
  };

  const handleMaximize = async () => {
    if (window.electronAPI?.windowMaximize) {
      const result = await window.electronAPI.windowMaximize();
      if (result) {
        setWindowState(prev => ({ ...prev, maximized: result.maximized }));
      }
    }
  };

  const handleClose = async () => {
    if (window.electronAPI?.windowClose) {
      await window.electronAPI.windowClose();
    }
  };

  // Network scan handler
  const handleNetworkScan = async () => {
    try {
      setSystemStatus("Starting network scan...");
      if (window.electronAPI?.startNetworkScan) {
        await window.electronAPI.startNetworkScan();
        setSystemStatus("Network scan in progress...");
      }
    } catch (error) {
      console.error('Failed to start network scan:', error);
      setSystemStatus("Network scan failed");
    }
  };

  // Setup window state listeners and platform detection
  useEffect(() => {
    // Get platform info ONCE at app level
    if (window.electronAPI?.getPlatformInfo) {
      window.electronAPI.getPlatformInfo().then((info: any) => {
        setPlatform(info.platform);
      });
    }

    const unsubscribe1 = window.electronAPI?.onWindowStateChanged?.((state: any) => {
      setWindowState(prev => ({
        ...prev,
        maximized: state.maximized,
        fullscreen: state.fullscreen
      }));
    });

    const unsubscribe2 = window.electronAPI?.onWindowFocusChanged?.((state: any) => {
      setWindowState(prev => ({
        ...prev,
        focused: state.focused
      }));
    });

    // Get initial window state
    if (window.electronAPI?.getWindowState) {
      window.electronAPI.getWindowState().then((state: any) => {
        if (state) {
          setWindowState({
            maximized: state.isMaximized,
            fullscreen: state.isFullScreen,
            focused: state.isFocused
          });
        }
      });
    }

    return () => {
      unsubscribe1?.();
      unsubscribe2?.();
    };
  }, []);

  // Zoom controls - keyboard shortcuts and mouse wheel
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          window.electronAPI?.zoomIn?.();
        } else if (e.key === '-') {
          e.preventDefault();
          window.electronAPI?.zoomOut?.();
        } else if (e.key === '0') {
          e.preventDefault();
          window.electronAPI?.resetZoom?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  // Generate CSS classes for the app container
  const appContainerClasses = [
    'app-container',
    windowState.maximized ? 'maximized' : '',
    platform ? `platform-${platform}` : '',
    !windowState.focused ? 'unfocused' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={appContainerClasses}>
      
      {/* Custom Title Bar (draggable) */}
      <CustomTitleBar
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onClose={handleClose}
        isMaximized={windowState.maximized}
        isFocused={windowState.focused}
        platform={platform}
      />

      {/* Custom Menu Bar */}
      <CustomMenuBar />

      {/* Main Content Area */}
      <div className="main-content">
        
        {/* Left Panel - Sidebar */}
        <div className="sidebar-container">
          <Sidebar
            onSettings={() => setCurrentView('settings')}
            onViewChange={setCurrentView}
            currentView={currentView}
          />
        </div>

        {/* Main Content */}
        <div className="content-container">
          {/* Content based on current view */}
          {currentView === 'chat' && (
            <ChatPanel />
          )}
          
          {currentView === 'network' && (
            <NetworkDashboard />
          )}
          
          {currentView === 'settings' && (
            <SettingsPanel />
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <StatusBar status={systemStatus} />
        <div className="status-bar-content">
          {systemStatus}
        </div>
      </div>
    </div>
  );
}

// Initialize React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.error('Root container not found');
}