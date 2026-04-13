/**
 * global.d.ts
 *
 * Type declarations for libraries loaded via CDN (not npm imports).
 * These augment the global scope so TypeScript understands them without
 * requiring a bundler to resolve node_modules at runtime.
 */

// ── Mapbox GL JS (loaded via CDN <script> tag) ────────────────────────────────
// Re-export the mapbox-gl types as a global namespace so components can use
// `mapboxgl.Map`, `mapboxgl.Marker`, etc. without import statements.
import type * as MapboxGl from 'mapbox-gl';
declare global {
  const mapboxgl: typeof MapboxGl & { accessToken: string };
}

// ── Socket.io client (served by the backend at /socket.io/socket.io.js) ───────
import type { Socket } from 'socket.io-client';
declare global {
  // The Socket.io CDN bundle exposes `io` as a global factory function.
  function io(url?: string, opts?: Record<string, unknown>): Socket;
}
