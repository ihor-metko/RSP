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

      // Validate token exists
      if (!token) {
        console.error('[SocketIO] Connection rejected: No token provided');
        return next(new Error('Authentication token required'));
      }

      // Validate token is a string
      if (typeof token !== 'string') {
        console.error('[SocketIO] Connection rejected: Token must be a string, got:', typeof token);
        return next(new Error('Invalid token format'));
      }

      // Validate token is not empty
      if (token.trim() === '') {
        console.error('[SocketIO] Connection rejected: Token is empty');
        return next(new Error('Empty token provided'));
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
      requestedClubId: requestedClubId ?? '(notification socket)',
    });

    // Notification Socket Logic (when no clubId is provided)
    // This socket receives role-scoped notifications only
    if (!requestedClubId) {
      console.log('[SocketIO] Notification socket detected (no clubId)');
      
      // All users join their personal player room for player-specific notifications
      const playerRoom = `player:${userData.userId}`;
      socket.join(playerRoom);
      console.log('[SocketIO] Joined player room for personal notifications:', playerRoom);
      
      // Root admins join root_admin room for platform-wide notifications
      if (userData.isRoot) {
        socket.join('root_admin');
        console.log('[SocketIO] Root admin joined root_admin room for notifications');
      }

      // Organization admins join organization rooms for org-scoped notifications
      userData.organizationIds.forEach((orgId) => {
        const roomName = `organization:${orgId}`;
        socket.join(roomName);
        console.log('[SocketIO] Joined organization room for notifications:', roomName);
      });

      // Club admins and players join club rooms for club-scoped notifications
      userData.clubIds.forEach((clubId) => {
        const roomName = `club:${clubId}`;
        socket.join(roomName);
        console.log('[SocketIO] Joined club room for notifications:', roomName);
      });

      console.log('[SocketIO] Notification socket rooms:', {
        userId: userData.userId,
        rooms: Array.from(socket.rooms).filter(r => r !== socket.id),
      });
    } 
    // Booking Socket Logic (when clubId is provided) - LEGACY
    // TODO: This will be refactored into a separate booking socket in the future
    else {
      console.log('[SocketIO] Booking socket detected (clubId provided)');
      
      // Root admins join all rooms
      if (userData.isRoot) {
        socket.join('root_admin');
        console.log('[SocketIO] Root admin joined root_admin room');
      }

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

      // Also join organization rooms for broader notifications
      userData.organizationIds.forEach((orgId) => {
        const roomName = `organization:${orgId}`;
        socket.join(roomName);
        console.log('[SocketIO] Joined organization room:', roomName);
      });

      console.log('[SocketIO] Booking socket rooms:', {
        userId: userData.userId,
        rooms: Array.from(socket.rooms).filter(r => r !== socket.id),
      });
    }

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
