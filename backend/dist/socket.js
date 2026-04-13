"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
exports.getIo = getIo;
const socket_io_1 = require("socket.io");
let _io = null;
function initSocket(httpServer) {
    _io = new socket_io_1.Server(httpServer, {
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
function getIo() {
    if (!_io) {
        throw new Error('Socket.io has not been initialized. Call initSocket(httpServer) first.');
    }
    return _io;
}
//# sourceMappingURL=socket.js.map