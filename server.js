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
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Singleton Socket.IO instance
let io = null;

/**
 * Initialize Socket.IO server (singleton pattern)
 */
function initSocketIO(httpServer) {
  if (io) {
    if (dev) {
      console.log('[WebSocket] Socket.IO already initialized (singleton)');
    }
    return io;
  }

  io = new Server(httpServer, {
    path: '/api/socket',
    transports: ['websocket'], // Websocket only - no polling
    cors: {
      origin: process.env.NEXTAUTH_URL || `http://${hostname}:${port}`,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    addTrailingSlash: false,
  });

  // Setup connection handlers
  io.on('connection', (socket) => {
    if (dev) {
      console.log(`[WebSocket] Client connected: ${socket.id}`);
    }

    socket.on('subscribe:club:bookings', (clubId) => {
      const room = `club:${clubId}:bookings`;
      socket.join(room);
      
      if (dev) {
        console.log(`[WebSocket] Client ${socket.id} joined room: ${room}`);
      }
      
      socket.emit('subscribed', { room, clubId });
    });

    socket.on('unsubscribe:club:bookings', (clubId) => {
      const room = `club:${clubId}:bookings`;
      socket.leave(room);
      
      if (dev) {
        console.log(`[WebSocket] Client ${socket.id} left room: ${room}`);
      }
      
      socket.emit('unsubscribed', { room, clubId });
    });

    socket.on('disconnect', () => {
      if (dev) {
        console.log(`[WebSocket] Client disconnected: ${socket.id}`);
      }
    });
  });

  // Make io accessible globally for API routes
  global.io = io;

  if (dev) {
    console.log('[WebSocket] Socket.IO server initialized');
    console.log('[WebSocket] Path: /api/socket');
    console.log('[WebSocket] Transport: websocket only');
  }

  return io;
}

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

  // Initialize Socket.IO (singleton pattern)
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
