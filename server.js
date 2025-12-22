/**
 * Next.js Custom Server with Socket.IO
 * 
 * HTTP server for Next.js with real-time WebSocket support
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { verifySocketToken } = require('./socketAuth');

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

  // Initialize Socket.IO server
  const io = new Server(httpServer, {
    cors: {
      origin: dev 
        ? 'http://localhost:3000' 
        : process.env.NEXT_PUBLIC_APP_URL || false,
      methods: ['GET', 'POST'],
    },
  });

  // Store io instance globally for API routes to access
  global.io = io;

  // Socket.IO authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const clubId = socket.handshake.auth.clubId; // Extract clubId from auth

      if (!token) {
        console.error('[SocketIO] Connection rejected: No token provided');
        return next(new Error('Authentication token required'));
      }

      // Verify token and get user data
      const userData = await verifySocketToken(token);

      if (!userData) {
        console.error('[SocketIO] Connection rejected: Invalid token');
        return next(new Error('Invalid authentication token'));
      }

      // Attach user data and clubId to socket
      socket.data.user = userData;
      socket.data.clubId = clubId || null; // Store requested clubId

      console.log('[SocketIO] User authenticated:', {
        socketId: socket.id,
        userId: userData.userId,
        isRoot: userData.isRoot,
        requestedClubId: clubId,
      });

      next();
    } catch (error) {
      console.error('[SocketIO] Authentication error:', error);
      return next(new Error('Authentication failed'));
    }
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    const userData = socket.data.user;
    const requestedClubId = socket.data.clubId;

    if (!userData) {
      console.error('[SocketIO] Connection without user data, disconnecting');
      socket.disconnect(true);
      return;
    }

    console.log('[SocketIO] Client connected:', {
      socketId: socket.id,
      userId: userData.userId,
      isRoot: userData.isRoot,
      requestedClubId,
    });

    // Server-controlled room subscription
    // Root admins join all rooms (represented by special room)
    if (userData.isRoot) {
      socket.join('root_admin');
      console.log('[SocketIO] Root admin joined root_admin room');
    }

    // Club-based room targeting
    // If a specific clubId was requested, join only that club room
    if (requestedClubId) {
      // Verify user has access to the requested club
      if (userData.clubIds.includes(requestedClubId) || userData.isRoot) {
        const clubRoom = `club:${requestedClubId}`;
        socket.join(clubRoom);
        console.log('[SocketIO] Joined club room:', clubRoom);
      } else {
        console.warn('[SocketIO] User requested club they don\'t have access to:', {
          userId: userData.userId,
          requestedClubId,
          userClubIds: userData.clubIds,
        });
      }
    } else {
      // Legacy behavior: Join all club rooms if no specific club requested
      // This maintains backward compatibility but will be deprecated
      console.warn('[SocketIO] No clubId provided, joining all accessible clubs (legacy mode)');
      userData.clubIds.forEach((clubId) => {
        const roomName = `club:${clubId}`;
        socket.join(roomName);
        console.log('[SocketIO] Joined room (legacy):', roomName);
      });
    }

    // Also join organization rooms for broader notifications if needed
    // This is kept for potential future use (e.g., org-wide announcements)
    userData.organizationIds.forEach((orgId) => {
      const roomName = `organization:${orgId}`;
      socket.join(roomName);
      console.log('[SocketIO] Joined organization room:', roomName);
    });

    console.log('[SocketIO] User rooms:', {
      userId: userData.userId,
      rooms: Array.from(socket.rooms).filter(r => r !== socket.id),
    });

    socket.on('disconnect', () => {
      console.log('[SocketIO] Client disconnected:', {
        socketId: socket.id,
        userId: userData.userId,
      });
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log('> Socket.IO server initialized');
    });
});
