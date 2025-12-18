/**
 * Custom Next.js Server with Socket.io
 * 
 * This custom server wraps Next.js to add Socket.io WebSocket support.
 * It's required because Next.js doesn't natively support WebSocket upgrades
 * in the App Router without a custom server.
 * 
 * Usage:
 * - Development: node server.js
 * - Production: NODE_ENV=production node server.js
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

app.prepare().then(() => {
  // Create HTTP server
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

  // Initialize Socket.io server
  const io = new Server(httpServer, {
    path: '/api/socket',
    cors: {
      origin: process.env.NEXTAUTH_URL || `http://${hostname}:${port}`,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    addTrailingSlash: false,
  });

  // Socket.io connection handler
  io.on('connection', (socket) => {
    if (dev) {
      console.log(`[WebSocket] Client connected: ${socket.id}`);
    }

    // Handle club room subscription
    socket.on('subscribe:club:bookings', (clubId) => {
      const room = `club:${clubId}:bookings`;
      socket.join(room);
      
      if (dev) {
        console.log(`[WebSocket] Client ${socket.id} joined room: ${room}`);
      }
      
      socket.emit('subscribed', { room, clubId });
    });

    // Handle club room unsubscription
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
    console.log('[WebSocket] Socket.io server initialized');
  }

  // Start the server
  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(
        `> Ready on http://${hostname}:${port} with Socket.io support`
      );
    });
});
