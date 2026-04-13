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
export declare function initSocket(httpServer: HttpServer): Server;
/**
 * Returns the initialized Socket.io Server instance.
 * Throws if called before initSocket().
 */
export declare function getIo(): Server;
//# sourceMappingURL=socket.d.ts.map