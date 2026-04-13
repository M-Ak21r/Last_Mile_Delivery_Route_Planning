// types/index.ts — shared strict TypeScript interfaces for the frontend

// ── State Machine ─────────────────────────────────────────────────────────────
/** Delivery lifecycle enforced by the VRP orchestration layer */
export type DeliveryStatus =
  | 'PENDING_DISPATCH'
  | 'ROUTE_OPTIMIZED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED_ATTEMPT';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type VehicleType = 'bike' | 'scooter' | 'van' | 'truck';
export type DriverStatus = 'available' | 'on_route' | 'off_duty' | 'break';
export type RouteStatus = 'planned' | 'active' | 'completed' | 'cancelled';

// ── GeoJSON ───────────────────────────────────────────────────────────────────
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface GeoLineString {
  type: 'LineString';
  coordinates: [number, number][]; // array of [lng, lat]
}

// ── Domain Models ─────────────────────────────────────────────────────────────
export interface Delivery {
  _id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  /** GeoJSON Point — coordinates are [lng, lat] */
  location: GeoPoint;
  weightKg: number;
  dimensions: { length: number; width: number; height: number };
  priority: Priority;
  status: DeliveryStatus;
  deliveryWindow: { start: string; end: string };
  specialInstructions: string;
  codAmount: number;
  assignedRoute?: { routeId: string; status: RouteStatus } | string;
  deliveredAt?: string;
  failureReason?: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  _id: string;
  name: string;
  phone: string;
  email: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
  capacityKg: number;
  status: DriverStatus;
  /** GeoJSON Point for driver's current position */
  currentLocation: GeoPoint & { address: string };
  totalDeliveries: number;
  rating: number;
  createdAt: string;
}

export interface RouteStop {
  _id: string;
  delivery: Delivery | string;
  sequence: number;
  estimatedArrival: string;
  distanceFromPrev: number;
  status: 'pending' | 'completed' | 'skipped';
}

export interface Route {
  _id: string;
  routeId: string;
  driver: Driver | string;
  stops: RouteStop[];
  status: RouteStatus;
  totalDistanceKm: number;
  estimatedDurationMin: number;
  actualDurationMin?: number;
  startLocation: GeoPoint & { address: string };
  endLocation: GeoPoint & { address: string };
  /** Driving geometry returned by Mapbox Optimization API v1 */
  routeGeometry?: GeoLineString;
  plannedDate: string;
  startedAt?: string;
  completedAt?: string;
  optimizationScore: number;
  notes: string;
  createdAt: string;
}

export interface DashboardStats {
  totalDeliveries: number;
  pendingDeliveries: number;
  deliveredToday: number;
  activeRoutes: number;
  availableDrivers: number;
  totalRoutes: number;
  recentRoutes: Route[];
  deliveryStatusBreakdown: { _id: string; count: number }[];
  routeEfficiency: { avgScore?: number; avgDistance?: number; avgDuration?: number };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  total?: number;
  message?: string;
}

// ── VRP Payload Shapes ────────────────────────────────────────────────────────
/** Mapbox Optimization API v1 waypoint entry */
export interface MapboxWaypoint {
  waypoint_index: number;
  trips_index: number;
  location: [number, number];
  name: string;
}

/** Mapbox Optimization API v1 trip entry */
export interface MapboxTrip {
  geometry: GeoLineString;
  duration: number;
  distance: number;
  legs: { distance: number; duration: number }[];
}

// ── WebSocket Payload Interfaces ──────────────────────────────────────────────
/** Emitted when a route transitions to IN_TRANSIT (active) */
export interface WsRouteStarted {
  routeId: string;
  driverId: string;
  stops: RouteStop[];
}

/** Emitted when a route is marked completed */
export interface WsRouteCompleted {
  routeId: string;
  driverId: string;
}

/** Emitted when an individual delivery stop is completed */
export interface WsStopCompleted {
  routeId: string;
  stopId: string;
  deliveryId: string;
}

/** Emitted when a driver sends a GPS update */
export interface WsDriverLocation {
  driverId: string;
  coordinates: [number, number]; // [lng, lat]
  address?: string;
}

