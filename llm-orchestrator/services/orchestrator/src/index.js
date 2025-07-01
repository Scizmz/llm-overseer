const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');

const app = express();
const httpServer = createServer(app);

// Enhanced Socket.IO configuration
const io = new Server(httpServer, {
  cors: { 
    origin: "*",
    methods: ["GET", "POST"],
    credentials: false
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Redis for state management across instances
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

const PORT = process.env.PORT || 3000;

app.use(express.json());

// Enable CORS for Electron app
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'orchestrator',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    connections: {
      clients: clientNamespace.sockets.size,
      llms: connectedLLMs.size
    }
  });
});

// Basic API routes that your frontend expects
app.get('/api/models', async (req, res) => {
  try {
    // Return both mock data and connected LLMs
    const mockModels = [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        type: 'cloud',
        provider: 'openai',
        status: 'ready',
        capabilities: ['chat', 'completion'],
        endpoint: 'https://api.openai.com/v1',
        role: 'Primary Assistant'
      },
      {
        id: 'local-llama',
        name: 'Local Llama',
        type: 'local',
        provider: 'ollama',
        status: 'idle',
        capabilities: ['chat', 'completion'],
        endpoint: 'http://localhost:11434',
        role: 'Code Assistant'
      }
    ];
    
    // Combine with connected LLMs
    const connectedModels = Array.from(connectedLLMs.values()).map(llm => ({
      ...llm,
      role: llm.role || 'Connected Model'
    }));
    
    const allModels = [...mockModels, ...connectedModels];
    
    res.json({ success: true, models: allModels });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Discovery endpoints that frontend expects
app.get('/api/discovery/state', (req, res) => {
  res.json({
    scanning: false,
    scanProgress: 0,
    lastScan: null,
    discoveredDevices: [],
    newDevicesCount: 0
  });
});

app.post('/api/discovery/scan', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Network scan started',
    scanId: Date.now().toString()
  });
});

app.post('/api/discovery/stop', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Network scan stopped' 
  });
});

// Chat endpoint for HTTP fallback
app.post('/api/chat', async (req, res) => {
  try {
    const { message, framework = 'BMAD-METHOD', projectId } = req.body;
    
    // For now, return a mock response
    // Later this will integrate with actual LLM routing
    const response = {
      success: true,
      response: `Received message: "${message}" using ${framework} framework`,
      timestamp: new Date().toISOString(),
      framework,
      projectId
    };
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get connected LLMs
app.get('/api/llms', (req, res) => {
  res.json({
    success: true,
    llms: Array.from(connectedLLMs.values()),
    count: connectedLLMs.size
  });
});

// Namespaces for different connection types
const clientNamespace = io.of('/client');
const llmNamespace = io.of('/llm');
const stateNamespace = io.of('/state');

// Track connected LLMs and clients
const connectedLLMs = new Map();
const connectedClients = new Map();

// Client connections (frontend)
clientNamespace.on('connection', (socket) => {
  console.log(`📱 Client connected: ${socket.id}`);
  
  connectedClients.set(socket.id, {
    id: socket.id,
    connectedAt: new Date(),
    lastActivity: new Date()
  });  
  
  // Send initial state immediately
  socket.emit('connected', {
    type: 'connected',
    message: 'Connected to LLM Orchestrator',
    timestamp: new Date().toISOString(),
    availableLLMs: Array.from(connectedLLMs.values()),
    clientId: socket.id
  });
  
  // Handle ping/pong for connection monitoring
  socket.on('ping', (callback) => {
    const response = {
      type: 'pong',
      timestamp: new Date().toISOString(),
      serverTime: Date.now()
    };
    
    if (typeof callback === 'function') {
      callback(response);
    } else {
      socket.emit('pong', response);
    }
    
    // Update last activity
    const client = connectedClients.get(socket.id);
    if (client) {
      client.lastActivity = new Date();
    }
  });

  // Handle chat requests
  socket.on('chat', async (data, callback) => {
    try {
      const { message, models = ['all'], framework = 'BMAD-METHOD' } = data;
      console.log(`💬 Chat request from ${socket.id}:`, { message, framework });
      
      // Store in Redis for state management
      const chatId = `chat_${Date.now()}_${socket.id}`;
      await redis.hset(`chat:${chatId}`, {
        message,
        framework,
        models: JSON.stringify(models),
        clientId: socket.id,
        timestamp: new Date().toISOString(),
        status: 'received'
      });
      
      // For now, send a mock response
      // Later this will route to actual LLMs
      const response = {
        success: true,
        chatId,
        response: `Echo: ${message} (processed with ${framework})`,
        timestamp: new Date().toISOString(),
        framework,
        models
      };
      
      // Send response via callback
      if (typeof callback === 'function') {
        callback(response);
      }
      
      // Also emit as event for real-time updates
      socket.emit('llm-response', {
        chatId,
        message: response.response,
        framework,
        timestamp: response.timestamp
      });
      
    } catch (error) {
      console.error('❌ Chat error:', error);
      const errorResponse = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      if (typeof callback === 'function') {
        callback(errorResponse);
      }
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`📱❌ Client disconnected: ${socket.id}, reason: ${reason}`);
    connectedClients.delete(socket.id);
  });
  
  // Handle errors
  socket.on('error', (error) => {
    console.error(`📱⚠️ Client socket error for ${socket.id}:`, error);
  });
});

// LLM connections (for model adapters)
llmNamespace.on('connection', (socket) => {
  console.log(`🤖 LLM connected: ${socket.id}`);
  
  // Register LLM with enhanced info
  socket.on('register', (data) => {
    const { name, type, capabilities, endpoint, role } = data;
    const llmInfo = {
      id: socket.id,
      name,
      type, // 'local' or 'remote'
      capabilities,
      endpoint,
      role: role || 'AI Assistant',
      status: 'connected',
      registeredAt: new Date(),
      lastActivity: new Date()
    };
    
    connectedLLMs.set(socket.id, llmInfo);
    socket.join(socket.id); // Join own room for targeted messages
    
    // Notify all clients of new LLM
    clientNamespace.emit('llm-update', {
      type: 'connected',
      llm: llmInfo
    });
    
    console.log(`🤖✅ LLM registered: ${name} (${type}) - ${endpoint}`);
    
    // Send confirmation back to LLM
    socket.emit('registered', { 
      success: true, 
      id: socket.id,
      timestamp: new Date().toISOString()
    });
  });
  
  // Handle LLM responses
  socket.on('response', async (data) => {
    const { chatId, response, modelId, status = 'complete' } = data;
    
    // Store response in Redis
    await redis.hset(`response:${chatId}:${modelId}`, {
      response,
      modelId,
      status,
      timestamp: new Date().toISOString()
    });
    
    // Forward to all clients
    clientNamespace.emit('llm-response', {
      chatId,
      modelId,
      response,
      status,
      timestamp: new Date().toISOString()
    });
    
    console.log(`🤖💬 Response from ${modelId} for chat ${chatId}`);
  });
  
  // Handle file requests from LLMs
  socket.on('file-request', async (data, callback) => {
    const { fileId, operation } = data;
    console.log(`🤖📁 File request from ${socket.id}:`, { fileId, operation });
    
    // Forward to state manager
    stateNamespace.emit('file-operation', { 
      fileId, 
      operation, 
      requesterId: socket.id 
    });
    
    // TODO: Implement proper file handling
    if (typeof callback === 'function') {
      callback({ 
        status: 'processing',
        fileId,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Handle LLM status updates
  socket.on('status-update', (data) => {
    const llm = connectedLLMs.get(socket.id);
    if (llm) {
      llm.status = data.status;
      llm.lastActivity = new Date();
      
      // Notify clients of status change
      clientNamespace.emit('llm-update', {
        type: 'status-change',
        llmId: socket.id,
        status: data.status
      });
    }
  });
  
  socket.on('disconnect', (reason) => {
    const llm = connectedLLMs.get(socket.id);
    if (llm) {
      console.log(`🤖❌ LLM disconnected: ${llm.name}, reason: ${reason}`);
      connectedLLMs.delete(socket.id);
      
      // Notify all clients
      clientNamespace.emit('llm-update', {
        type: 'disconnected',
        llmId: socket.id
      });
    }
  });
});

// State manager connections
stateNamespace.on('connection', (socket) => {
  console.log(`💾 State manager connected: ${socket.id}`);
  
  socket.on('state-update', async (data) => {
    const { type, payload } = data;
    console.log(`💾🔄 State update: ${type}`);
    
    // Broadcast state changes to all clients
    clientNamespace.emit('state-change', { 
      type, 
      payload,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`💾❌ State manager disconnected: ${socket.id}, reason: ${reason}`);
  });
});

// Error handling for the main Socket.IO server
io.on('error', (error) => {
  console.error('🔌⚠️ Socket.IO server error:', error);
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`🚀 Orchestrator server running on port ${PORT}`);
  console.log(`🔌 Socket.IO server ready for connections`);
  console.log(`📡 Available namespaces:`);
  console.log(`   - /client (frontend connections)`);
  console.log(`   - /llm (model connections)`);
  console.log(`   - /state (state manager)`);
});
