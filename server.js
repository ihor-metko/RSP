/**
 * Next.js Custom Server with Socket.IO
 * 
 * Provides WebSocket support for real-time updates.
 * Required because Next.js doesn't natively support WebSocket upgrades.
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Initialize Socket.IO (singleton pattern)
  // Stored in global.io to allow API routes to emit events
  if (!global.io) {
    const io = new Server(httpServer, {
      path: '/api/socket',
      transports: ['websocket'],
      cors: {
        origin: process.env.NEXTAUTH_URL || `http://${hostname}:${port}`,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      addTrailingSlash: false,
    });

    // Connection handlers
    io.on('connection', (socket) => {
      if (dev) console.log(`[WebSocket] Client connected: ${socket.id}`);

      socket.on('subscribe:club:bookings', (clubId) => {
        const room = `club:${clubId}:bookings`;
        socket.join(room);
        if (dev) console.log(`[WebSocket] ${socket.id} joined ${room}`);
        socket.emit('subscribed', { room, clubId });
      });

      socket.on('unsubscribe:club:bookings', (clubId) => {
        const room = `club:${clubId}:bookings`;
        socket.leave(room);
        if (dev) console.log(`[WebSocket] ${socket.id} left ${room}`);
        socket.emit('unsubscribed', { room, clubId });
      });

      socket.on('disconnect', () => {
        if (dev) console.log(`[WebSocket] Client disconnected: ${socket.id}`);
      });
    });

    global.io = io;
    if (dev) console.log('[WebSocket] Socket.IO initialized on /api/socket');
  }

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
