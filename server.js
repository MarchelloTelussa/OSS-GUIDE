require('dotenv').config();

const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.APP_PORT || 3000;

// Middleware for parsing JSON requests
app.use(express.json());

// 1. Serve static frontend assets from /public (js, media, index.html)
app.use(express.static(path.join(__dirname, 'public')));

// 2. Serve JSON files from /data at the root level (temporary until PostgreSQL migration)
app.use('/data', express.static(path.join(__dirname, 'data')));

// 3. API Routes placeholder
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is operational' });
});

// 4. Catch-all route to serve public/index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});