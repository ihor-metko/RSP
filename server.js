/**
 * Next.js Server with Socket.IO Integration
 * 
 * This server integrates Socket.IO with Next.js for WebSocket support.
 * Uses Next.js built-in server with Socket.IO attached for WebSocket upgrades.
 * 
 * Features:
 * - WebSocket-only transport (no polling fallback)
 * - Room-based architecture for club channels
 * - Singleton Socket.IO instance
 * - Production-ready for Docker + Nginx deployment
 * 
 * Usage:
 * - Development: npm run dev
 * - Production: npm start
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { initSocketIO } = require('./src/lib/socket-instance');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server for Next.js
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Initialize Socket.IO (singleton pattern in socket-instance.js)
  initSocketIO(httpServer);

  // Start the server
  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.IO path: /api/socket`);
      console.log(`> Transport: websocket only`);
    });
});
