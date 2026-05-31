// Production Server for EnzyXNova
// Serves frontend and proxies backend API calls

const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// API Proxy - Forward all /api requests to backend
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api'
  }
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA - Serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n✅ EnzyXNova Production Server`);
  console.log(`═══════════════════════════════`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`Backend:  ${BACKEND_URL}`);
  console.log(`Health:   http://localhost:${PORT}/health`);
  console.log(`═══════════════════════════════\n`);
});
