import { io, Socket } from 'socket.io-client';

interface LLMInfo {
  id: string;
  name: string;
  type: 'local' | 'remote';
  capabilities: string[];
  endpoint: string;
  status: string;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectInterval = 5000;
  private url: string;
  private messageHandlers: Map<string, Set<Function>> = new Map();

  constructor() {
    this.url = process.env.REACT_APP_WS_URL || 'http://localhost:3000';
  }

  connect(): void {
    // Connect to client namespace
    this.socket = io(`${this.url}/client`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.reconnectInterval,
    });
    
    // Set up event handlers
    this.socket.on('connect', () => {
      console.log('Connected to orchestrator');
      this.emit('socket-connected', true);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from orchestrator');
      this.emit('socket-connected', false);
    });

    this.socket.on('connected', (data) => {
      console.log('Initial connection data:', data);
      this.emit('initial-state', data);
    });

    this.socket.on('llm-update', (data) => {
      console.log('LLM update:', data);
      this.emit('llm-update', data);
    });

    this.socket.on('llm-response', (data) => {
      console.log('LLM response:', data);
      this.emit('llm-response', data);
    });

    this.socket.on('state-change', (data) => {
      console.log('State change:', data);
      this.emit('state-change', data);
    });
  }

  // Send chat message with acknowledgment
  sendChat(message: string, models: string[] = ['all'], framework: string = 'BMAD-METHOD'): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      this.socket.emit('chat', { message, models, framework }, (response: any) => {
        if (response.error) {
          reject(response.error);
        } else {
          resolve(response);
        }
      });
    });
  }

  // Ping with callback for connection testing
  ping(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 5000);

      this.socket.emit('ping', (response: any) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });
  }

  // Event handling
  on(event: string, handler: Function): void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, new Set());
    }
    this.messageHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

const websocketService = new WebSocketService();
export default websocketService;
