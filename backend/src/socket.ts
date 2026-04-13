/**
 * socket.ts
 *
 * Module-level Socket.io singleton.
 * Call initSocket(httpServer) once in server.ts, then use getIo() anywhere
 * in the application (controllers, services) to emit real-time events.
 *
 * Emitted events:
 *   route:started    { routeId, driverId, stops }      — route moved to IN_TRANSIT (active)
 *   route:completed  { routeId, driverId }             — route marked completed
 *   stop:completed   { routeId, stopId, deliveryId }   — individual stop delivered
 *   driver:location  { driverId, coordinates: [lng, lat] } — driver GPS update
 */

import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';

let _io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  _io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  _io.on('connection', (socket) => {
    console.log(`🔌 Socket client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`🔌 Socket client disconnected: ${socket.id}`);
    });
  });

  return _io;
}

/**
 * Returns the initialized Socket.io Server instance.
 * Throws if called before initSocket().
 */
export function getIo(): Server {
  if (!_io) {
    throw new Error('Socket.io has not been initialized. Call initSocket(httpServer) first.');
  }
  return _io;
}
