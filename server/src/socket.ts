import { Server, type Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { verifyAccessToken } from './services/auth.service';
import { logger } from './utils/logger';

let io: Server;

export function setupSocketIO(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Authenticate Socket.IO connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = await verifyAccessToken(token as string);
      socket.data.userId = decoded.userId;
      socket.data.role = decoded.role;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    logger.info('Socket client connected', { socketId: socket.id, userId: socket.data.userId });

    socket.on('subscribe:route', (route: string) => {
      socket.join(`route:${route}`);
      logger.debug('Client subscribed to route', { socketId: socket.id, route });
    });

    socket.on('unsubscribe:route', (route: string) => {
      socket.leave(`route:${route}`);
      logger.debug('Client unsubscribed from route', { socketId: socket.id, route });
    });

    socket.on('subscribe:operator', (operatorId: string) => {
      socket.join(`operator:${operatorId}`);
    });

    socket.on('unsubscribe:operator', (operatorId: string) => {
      socket.leave(`operator:${operatorId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.debug('Socket client disconnected', { socketId: socket.id, reason });
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call setupSocketIO first.');
  }
  return io;
}

export function broadcastBusUpdate(position: { vehiclePlate: string; route: string; operatorId: string | null; [key: string]: unknown }) {
  const server = getIO();
  server.emit('bus:update', position);
  if (position.route) {
    server.to(`route:${position.route}`).emit('bus:update', position);
  }
  if (position.operatorId) {
    server.to(`operator:${position.operatorId}`).emit('bus:update', position);
  }
}

export function broadcastDelayAlert(alert: { vehiclePlate: string; route: string; delayMinutes: number; [key: string]: unknown }) {
  const server = getIO();
  server.emit('delay:alert', alert);
  if (alert.route) {
    server.to(`route:${alert.route}`).emit('delay:alert', alert);
  }
}