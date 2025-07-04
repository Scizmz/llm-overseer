import React, { useState, useEffect, useRef } from 'react';

interface LLMCardWindowProps {
  modelId: string;
  modelName: string;
  modelType: 'cloud' | 'local';
  isDetached?: boolean;
  onDetach?: () => void;
  onReattach?: () => void;
  onClose?: () => void;
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
}

interface WorkingProcess {
  id: string;
  type: 'processing' | 'validating' | 'thinking' | 'responding';
  message: string;
  timestamp: Date;
  progress?: number;
}

const LLMCardWindow: React.FC<LLMCardWindowProps> = ({
  modelId,
  modelName,
  modelType,
  isDetached = false,
  onDetach,
  onReattach,
  onClose,
  initialPosition = { x: 100, y: 100 },
  initialSize = { width: 400, height: 300 }
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [workingProcesses, setWorkingProcesses] = useState<WorkingProcess[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const windowRef = useRef<HTMLDivElement>(null);
  const titleBarRef = useRef<HTMLDivElement>(null);

  // Mock working processes for demonstration
  useEffect(() => {
    const interval = setInterval(() => {
      const processes: WorkingProcess[] = [
        {
          id: '1',
          type: 'thinking',
          message: 'Analyzing prompt structure and requirements...',
          timestamp: new Date(),
          progress: 45
        },
        {
          id: '2',
          type: 'processing',
          message: 'Generating response using BMAD-METHOD framework...',
          timestamp: new Date(),
          progress: 78
        }
      ];
      setWorkingProcesses(processes);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Handle mouse events for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (titleBarRef.current?.contains(e.target as Node)) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const getStatusColor = (type: WorkingProcess['type']) => {
    switch (type) {
      case 'thinking': return 'bg-yellow-500';
      case 'processing': return 'bg-blue-500';
      case 'validating': return 'bg-green-500';
      case 'responding': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (type: WorkingProcess['type']) => {
    switch (type) {
      case 'thinking': return '🤔';
      case 'processing': return '⚙️';
      case 'validating': return '✅';
      case 'responding': return '💬';
      default: return '⚡';
    }
  };

  const windowStyle: React.CSSProperties = isDetached ? {
    position: 'fixed',
    left: position.x,
    top: position.y,
    width: size.width,
    height: isMinimized ? 'auto' : size.height,
    zIndex: 1000
  } : {};

  return (
    <div
      ref={windowRef}
      className={`bg-gray-800 border border-gray-600 rounded-lg shadow-xl overflow-hidden ${
        isDetached ? 'fixed' : 'relative'
      }`}
      style={windowStyle}
      onMouseDown={handleMouseDown}
    >
      {/* Title Bar */}
      <div
        ref={titleBarRef}
        className="flex items-center justify-between h-8 bg-gray-700 border-b border-gray-600 px-3 cursor-move select-none"
      >
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            modelType === 'cloud' ? 'bg-blue-500' : 'bg-green-500'
          }`} />
          <span className="text-sm font-medium text-gray-200">{modelName}</span>
          <span className="text-xs text-gray-400">({modelType})</span>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Minimize */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-600 text-gray-400 hover:text-white"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            <svg width="8" height="8" viewBox="0 0 8 8">
              <path fill="currentColor" d={isMinimized ? "M0 3h8v2H0z" : "M0 6h8v2H0z"} />
            </svg>
          </button>
          
          {/* Detach/Reattach */}
          {isDetached ? (
            <button
              onClick={onReattach}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-600 text-gray-400 hover:text-white"
              title="Reattach to main window"
            >
              📎
            </button>
          ) : (
            <button
              onClick={onDetach}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-600 text-gray-400 hover:text-white"
              title="Detach as separate window"
            >
              🪟
            </button>
          )}
          
          {/* Close */}
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-600 text-gray-400 hover:text-white"
            title="Close"
          >
            <svg width="8" height="8" viewBox="0 0 8 8">
              <path fill="currentColor" d="M7.414 0L4 3.414 0.586 0 0 0.586 3.414 4 0 7.414 0.586 8 4 4.586 7.414 8 8 7.414 4.586 4 8 0.586z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="p-3 space-y-3" style={{ height: size.height - 32 }}>
          {/* Model Status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">Status:</span>
            <span className="text-green-400">Active</span>
          </div>
          
          {/* Current Task */}
          <div className="border-t border-gray-600 pt-3">
            <h4 className="text-sm font-medium text-gray-200 mb-2">Current Activity</h4>
            
            {workingProcesses.length > 0 ? (
              <div className="space-y-2">
                {workingProcesses.map((process) => (
                  <div key={process.id} className="bg-gray-700 rounded-lg p-2">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm">{getStatusIcon(process.type)}</span>
                      <span className="text-xs font-medium text-gray-300 capitalize">
                        {process.type}
                      </span>
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(process.type)} animate-pulse`} />
                    </div>
                    
                    <p className="text-xs text-gray-400 mb-2">{process.message}</p>
                    
                    {process.progress && (
                      <div className="w-full bg-gray-600 rounded-full h-1">
                        <div
                          className={`h-1 rounded-full ${getStatusColor(process.type)} transition-all duration-300`}
                          style={{ width: `${process.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <span className="text-2xl mb-2 block">😴</span>
                <p className="text-xs text-gray-400">Model is idle</p>
              </div>
            )}
          </div>
          
          {/* Performance Metrics */}
          <div className="border-t border-gray-600 pt-3">
            <h4 className="text-sm font-medium text-gray-200 mb-2">Performance</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-700 rounded p-2">
                <div className="text-gray-400">Response Time</div>
                <div className="text-white font-mono">2.3s</div>
              </div>
              <div className="bg-gray-700 rounded p-2">
                <div className="text-gray-400">Success Rate</div>
                <div className="text-green-400 font-mono">98%</div>
              </div>
              <div className="bg-gray-700 rounded p-2">
                <div className="text-gray-400">Tokens Used</div>
                <div className="text-blue-400 font-mono">1.2K</div>
              </div>
              <div className="bg-gray-700 rounded p-2">
                <div className="text-gray-400">Quality Score</div>
                <div className="text-purple-400 font-mono">9.2</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resize Handle (for detached windows) */}
      {isDetached && !isMinimized && (
        <div
          className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsResizing(true);
          }}
        >
          <div className="w-full h-full bg-gray-600 opacity-50" />
        </div>
      )}
    </div>
  );
};

export default LLMCardWindow;
