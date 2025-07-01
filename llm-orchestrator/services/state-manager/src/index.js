const express = require('express');
const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'state-manager' });
});

app.listen(PORT, () => {
  console.log(`State Manager service running on port ${PORT}`);
});
