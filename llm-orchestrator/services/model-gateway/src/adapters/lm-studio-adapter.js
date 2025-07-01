const { io } = require('socket.io-client');
const axios = require('axios');

class LMStudioAdapter {
  constructor(orchestratorUrl, lmStudioUrl, name = 'LM Studio') {
    this.orchestratorUrl = orchestratorUrl;
    this.lmStudioUrl = lmStudioUrl;
    this.name = name;
    this.socket = null;
    this.connected = false;
    this.modelInfo = {
      name: this.name,
      type: 'local',
      subtype: 'lm-studio',
      capabilities: ['chat', 'completion'],
      endpoint: this.lmStudioUrl,
      models: []
    };
    
    // Set axios timeout for LM Studio requests (longer for consumer hardware)
    this.axiosInstance = axios.create({
      timeout: 30000, // 30 seconds for slower hardware
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async connect() {
    try {
      // Test connection to LM Studio first
      await this.testConnection();
      
      // Connect to orchestrator
      this.socket = io(`${this.orchestratorUrl}/llm`, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true
      });

      this.setupSocketHandlers();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Connection timeout for ${this.name}`));
        }, 45000); // Extended timeout for slower hardware

        this.socket.on('connect', async () => {
          clearTimeout(timeout);
          console.log(`[${this.name}] Connected to orchestrator`);
          this.connected = true;
          
          try {
            // Wait for LM Studio to be fully ready (especially important after model loading)
            console.log(`[${this.name}] Waiting for service to be fully ready...`);
            await this.waitForServiceReady();
            
            await this.fetchModels();
            this.socket.emit('register', this.modelInfo);
            resolve();
          } catch (error) {
            console.error(`[${this.name}] Failed to register:`, error.message);
            reject(error);
          }
        });

        this.socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Failed to connect to orchestrator: ${error.message}`));
        });
      });
    } catch (error) {
      throw new Error(`Failed to initialize ${this.name}: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      console.log(`[${this.name}] Testing connection to ${this.lmStudioUrl}...`);
      // Try to hit the models endpoint to verify LM Studio is running
      const response = await this.axiosInstance.get(`${this.lmStudioUrl}/v1/models`);
      console.log(`[${this.name}] LM Studio is responding`);
    } catch (error) {
      throw new Error(`Cannot connect to LM Studio at ${this.lmStudioUrl}: ${error.message}`);
    }
  }

  async waitForServiceReady() {
    const maxRetries = 6;
    const retryDelay = 2000; // 2 seconds between retries
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Test if we can get a response from the models endpoint
        await this.axiosInstance.get(`${this.lmStudioUrl}/v1/models`);
        console.log(`[${this.name}] Service ready after ${attempt} attempt(s)`);
        return;
      } catch (error) {
        console.log(`[${this.name}] Service not ready (attempt ${attempt}/${maxRetries}): ${error.message}`);
        
        if (attempt === maxRetries) {
          console.warn(`[${this.name}] Service may still be loading models, proceeding anyway...`);
          return;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  async fetchModels() {
    const maxRetries = 3;
    const retryDelay = 3000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[${this.name}] Fetching models (attempt ${attempt}/${maxRetries})...`);
        const response = await this.axiosInstance.get(`${this.lmStudioUrl}/v1/models`);
        this.modelInfo.models = response.data.data || [];
        console.log(`[${this.name}] Found ${this.modelInfo.models.length} models`);
        return;
      } catch (error) {
        console.error(`[${this.name}] Failed to fetch models (attempt ${attempt}):`, error.message);
        
        if (attempt === maxRetries) {
          console.warn(`[${this.name}] Could not fetch models, will retry later`);
          this.modelInfo.models = [];
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  setupSocketHandlers() {
    this.socket.on('process', async (data) => {
      const { chatId, message, framework, model } = data;
      
      if (!this.connected) {
        this.socket.emit('response', {
          chatId,
          response: 'Adapter not properly connected',
          modelId: this.socket.id,
          status: 'error'
        });
        return;
      }

      try {
        const selectedModel = this.selectModel(model);
        const response = await this.generateResponse(message, framework, selectedModel);
        
        this.socket.emit('response', {
          chatId,
          response: response,
          modelId: this.socket.id,
          status: 'complete'
        });
      } catch (error) {
        console.error(`[${this.name}] Processing error:`, error.message);
        this.socket.emit('response', {
          chatId,
          response: `Error: ${error.message}`,
          modelId: this.socket.id,
          status: 'error'
        });
      }
    });

    this.socket.on('disconnect', () => {
      console.log(`[${this.name}] Disconnected from orchestrator`);
      this.connected = false;
    });

    this.socket.on('error', (error) => {
      console.error(`[${this.name}] Socket error:`, error.message);
    });
  }

  selectModel(requestedModel) {
    if (requestedModel && this.modelInfo.models.some(m => m.id === requestedModel)) {
      return requestedModel;
    }
    
    if (this.modelInfo.models.length > 0) {
      return this.modelInfo.models[0].id;
    }
    
    throw new Error('No models available');
  }

  async generateResponse(message, framework, model) {
    // Extended timeout for inference on slower hardware
    const inferenceTimeout = 120000; // 2 minutes
    const originalTimeout = this.axiosInstance.defaults.timeout;
    this.axiosInstance.defaults.timeout = inferenceTimeout;

    const payload = {
      model: model,
      messages: [
        { role: 'system', content: `You are using the ${framework} framework.` },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: false
    };

    try {
      console.log(`[${this.name}] Generating response with model: ${model}`);
      const response = await this.axiosInstance.post(`${this.lmStudioUrl}/v1/chat/completions`, payload);
      
      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error('No response generated from LM Studio');
      }
      
      return response.data.choices[0].message.content;
    } finally {
      // Restore original timeout
      this.axiosInstance.defaults.timeout = originalTimeout;
    }
  }

  disconnect() {
    this.connected = false;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    console.log(`[${this.name}] Adapter disconnected`);
  }

  getStatus() {
    return {
      name: this.name,
      connected: this.connected,
      modelCount: this.modelInfo.models.length,
      endpoint: this.lmStudioUrl
    };
  }
}

module.exports = LMStudioAdapter;
