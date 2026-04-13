/**
 * routeOptimizer.ts
 *
 * Orchestrates a multi-vehicle VRP using the Mapbox Optimization API v1.
 *
 * Flow:
 *  1. Receive available drivers and PENDING_DISPATCH deliveries.
 *  2. Capacity-aware greedy allocation assigns deliveries to vehicles.
 *  3. For each vehicle, call the Mapbox Optimization API v1 to get the
 *     optimal stop ordering and driving geometry.
 *  4. Return a VRPResult per driver that the route controller persists.
 *
 * Architectural note:
 *  The Mapbox Optimization API v1 handles up to 12 coordinates per request
 *  (depot + max 11 delivery stops).  Drivers with more assigned stops would
 *  need the Optimization API v2; this limit is enforced during allocation.
 */
import { IDelivery } from '../models/Delivery';
import { IDriver } from '../models/Driver';
export interface DepotConfig {
    lng: number;
    lat: number;
    address: string;
}
export interface OptimizedStop {
    deliveryId: string;
    sequence: number;
    coordinates: [number, number];
    address: string;
    distanceFromPrev: number;
    estimatedArrival: string;
}
export interface VRPRouteResult {
    driverId: string;
    stops: OptimizedStop[];
    totalDistanceKm: number;
    estimatedDurationMin: number;
    optimizationScore: number;
    routeGeometry: {
        type: 'LineString';
        coordinates: [number, number][];
    };
}
/**
 * Entry point for the VRP orchestration layer.
 *
 * @param depot      Centralized depot configuration.
 * @param drivers    Available drivers with their capacityKg.
 * @param deliveries PENDING_DISPATCH deliveries to route.
 * @returns          One VRPRouteResult per driver that received deliveries.
 */
export declare function optimizeVRP(depot: DepotConfig, drivers: IDriver[], deliveries: IDelivery[]): Promise<VRPRouteResult[]>;
//# sourceMappingURL=routeOptimizer.d.ts.map