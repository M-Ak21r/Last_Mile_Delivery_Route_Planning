// types.ts — shared types for the frontend

export type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'returned';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type VehicleType = 'bike' | 'scooter' | 'van' | 'truck';
export type DriverStatus = 'available' | 'on_route' | 'off_duty' | 'break';
export type RouteStatus = 'planned' | 'active' | 'completed' | 'cancelled';

export interface Delivery {
  _id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  coordinates: { lat: number; lng: number };
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
  currentLocation: { lat: number; lng: number; address: string };
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
  startLocation: { lat: number; lng: number; address: string };
  endLocation: { lat: number; lng: number; address: string };
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
