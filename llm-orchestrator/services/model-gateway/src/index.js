const express = require('express');
const { OpenAI } = require('openai');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Model registry
const models = {
  'gpt-4': {
    type: 'openai',
    name: 'GPT-4',
    endpoint: 'chat/completions',
    model: 'gpt-4'
  },
  'gpt-3.5': {
    type: 'openai', 
    name: 'GPT-3.5 Turbo',
    endpoint: 'chat/completions',
    model: 'gpt-3.5-turbo'
  },
  'claude-3': {
    type: 'anthropic',
    name: 'Claude 3',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-opus-20240229'
  }
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'model-gateway' });
});

// List available models
app.get('/api/models', (req, res) => {
  res.json(Object.entries(models).map(([id, config]) => ({
    id,
    ...config,
    status: 'ready'
  })));
});

// Invoke a model
app.post('/api/models/:modelId/invoke', async (req, res) => {
  const { modelId } = req.params;
  const { prompt, temperature = 0.7, maxTokens = 1000 } = req.body;
  
  const model = models[modelId];
  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }

  try {
    let response;
    
    if (model.type === 'openai') {
      const completion = await openai.chat.completions.create({
        model: model.model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens
      });
      
      response = {
        modelId,
        content: completion.choices[0].message.content,
        usage: completion.usage
      };
    } else if (model.type === 'anthropic') {
      // Anthropic implementation
      const anthropicResponse = await axios.post(
        model.endpoint,
        {
          model: model.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens
        },
        {
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          }
        }
      );
      
      response = {
        modelId,
        content: anthropicResponse.data.content[0].text,
        usage: anthropicResponse.data.usage
      };
    }
    
    res.json(response);
  } catch (error) {
    console.error('Model invocation error:', error);
    res.status(500).json({ 
      error: 'Model invocation failed',
      details: error.message 
    });
  }
});

// Get model status
app.get('/api/models/:modelId/status', async (req, res) => {
  const { modelId } = req.params;
  const model = models[modelId];
  
  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }
  
  // TODO: Implement actual health checks
  res.json({
    modelId,
    status: 'ready',
    rateLimit: {
      remaining: 100,
      reset: new Date(Date.now() + 3600000)
    }
  });
});

app.listen(PORT, () => {
  console.log(`Model Gateway running on port ${PORT}`);
});
