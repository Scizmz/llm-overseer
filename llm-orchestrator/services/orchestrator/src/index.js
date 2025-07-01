const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { 
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'], // Support both for reliability
});

// Redis for state management across instances
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379
});

const PORT = process.env.PORT || 3000;

app.use(express.json());

// Namespaces for different connection types
const clientNamespace = io.of('/client');
const llmNamespace = io.of('/llm');
const stateNamespace = io.of('/state');

// Track connected LLMs
const connectedLLMs = new Map();

// Client connections (frontend)
clientNamespace.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send initial state
  socket.emit('connected', {
    type: 'connected',
    message: 'Connected to Orchestrator',
    timestamp: new Date().toISOString(),
    availableLLMs: Array.from(connectedLLMs.values())
  });
  
  // Handle ping/pong for connection monitoring
  socket.on('ping', (callback) => {
    callback({
      type: 'pong',
      timestamp: new Date().toISOString()
    });
  });
  
  // Handle chat requests
  socket.on('chat', async (data, callback) => {
    const { message, models = ['all'], framework = 'BMAD-METHOD' } = data;
    
    // Store in state manager
    const chatId = Date.now().toString();
    await redis.hset(`chat:${chatId}`, {
      message,
      framework,
      models: JSON.stringify(models),
      timestamp: new Date().toISOString()
    });
    
    // Broadcast to selected LLMs
    if (models.includes('all')) {
      llmNamespace.emit('process', { chatId, message, framework });
    } else {
      models.forEach(modelId => {
        llmNamespace.to(modelId).emit('process', { chatId, message, framework });
      });
    }
    
    // Acknowledge receipt
    callback({ status: 'processing', chatId });
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// LLM connections
llmNamespace.on('connection', (socket) => {
  console.log('LLM connected:', socket.id);
  
  // Register LLM
  socket.on('register', (data) => {
    const { name, type, capabilities, endpoint } = data;
    const llmInfo = {
      id: socket.id,
      name,
      type, // 'local' or 'remote'
      capabilities,
      endpoint,
      status: 'ready'
    };
    
    connectedLLMs.set(socket.id, llmInfo);
    socket.join(socket.id); // Join own room for targeted messages
    
    // Notify clients of new LLM
    clientNamespace.emit('llm-update', {
      type: 'connected',
      llm: llmInfo
    });
    
    console.log(`LLM registered: ${name} (${type}) - ${endpoint}`);
  });
  
  // Handle LLM responses
  socket.on('response', async (data) => {
    const { chatId, response, modelId, status = 'complete' } = data;
    
    // Store response
    await redis.hset(`response:${chatId}:${modelId}`, {
      response,
      modelId,
      status,
      timestamp: new Date().toISOString()
    });
    
    // Forward to client
    clientNamespace.emit('llm-response', {
      chatId,
      modelId,
      response,
      status
    });
  });
  
  // Handle file requests from LLMs
  socket.on('file-request', async (data, callback) => {
    const { fileId, operation } = data;
    // Forward to state manager
    stateNamespace.emit('file-operation', { fileId, operation, requesterId: socket.id });
    // TODO: Implement file handling
    callback({ status: 'processing' });
  });
  
  socket.on('disconnect', () => {
    connectedLLMs.delete(socket.id);
    clientNamespace.emit('llm-update', {
      type: 'disconnected',
      llmId: socket.id
    });
    console.log('LLM disconnected:', socket.id);
  });
});

// State manager connections
stateNamespace.on('connection', (socket) => {
  console.log('State manager connected:', socket.id);
  
  socket.on('state-update', async (data) => {
    const { type, payload } = data;
    // Broadcast state changes to all clients
    clientNamespace.emit('state-change', { type, payload });
  });
});

// REST endpoints for health and status
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'orchestrator',
    connections: {
      clients: clientNamespace.sockets.size,
      llms: connectedLLMs.size
    }
  });
});

app.get('/api/llms', (req, res) => {
  res.json(Array.from(connectedLLMs.values()));
});

httpServer.listen(PORT, () => {
  console.log(`Orchestrator running on port ${PORT}`);
  console.log('Socket.io namespaces:');
  console.log('  - /client (frontend connections)');
  console.log('  - /llm (model connections)');
  console.log('  - /state (state manager)');
});
