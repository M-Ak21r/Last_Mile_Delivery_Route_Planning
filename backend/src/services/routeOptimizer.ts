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

// ── Constants ────────────────────────────────────────────────────────────────

const MAPBOX_OPT_URL = 'https://api.mapbox.com/optimized-trips/v1/mapbox/driving';
/** API v1 hard limit: depot + N stops ≤ 12 coordinates total */
const MAX_STOPS_PER_VEHICLE = 11;
/** Average city driving speed used for ETA estimates (km/h) */
const AVG_SPEED_KMH = 25;
/** Time budget per stop for loading/handoff (minutes) */
const STOP_SERVICE_MIN = 5;
/** Retry budget when Mapbox returns HTTP 429 (rate-limited) */
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1_000;

// ── Types ────────────────────────────────────────────────────────────────────

export interface DepotConfig {
  lng: number;
  lat: number;
  address: string;
}

export interface OptimizedStop {
  deliveryId: string;
  sequence: number;
  coordinates: [number, number]; // [lng, lat]
  address: string;
  distanceFromPrev: number; // km (straight-line fallback if not in legs)
  estimatedArrival: string; // "HH:MM"
}

export interface VRPRouteResult {
  driverId: string;
  stops: OptimizedStop[];
  totalDistanceKm: number;
  estimatedDurationMin: number;
  optimizationScore: number;
  routeGeometry: { type: 'LineString'; coordinates: [number, number][] };
}

// Mapbox Optimization API v1 response shapes
interface MapboxWaypoint {
  waypoint_index: number;
  trips_index: number;
  location: [number, number];
  name: string;
}
interface MapboxTrip {
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  duration: number; // seconds
  distance: number; // metres
  legs: { distance: number; duration: number }[];
}
interface MapboxOptResponse {
  code: string;
  message?: string;
  trips: MapboxTrip[];
  waypoints: MapboxWaypoint[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Priority → numeric weight (higher = serve earlier) */
const PRIORITY_WEIGHT: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + Math.round(minutes);
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function haversineKm([lng1, lat1]: [number, number], [lng2, lat2]: [number, number]): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Exponential backoff sleep */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Capacity-aware greedy allocation ─────────────────────────────────────────

/**
 * Assigns deliveries to drivers respecting each driver's capacityKg limit
 * and the Mapbox API's 11-stop-per-request ceiling.
 *
 * Strategy:
 *  - Sort deliveries by priority desc, then weight asc (urgent light items first).
 *  - For each delivery find the driver with remaining capacity who already has
 *    the most assigned weight (best-fit decreasing bin-packing).
 */
function allocateDeliveries(
  drivers: IDriver[],
  deliveries: IDelivery[]
): Map<string, IDelivery[]> {
  const allocation = new Map<string, IDelivery[]>();
  const remaining = new Map<string, number>();

  for (const d of drivers) {
    const id = (d._id as { toString(): string }).toString();
    allocation.set(id, []);
    remaining.set(id, d.capacityKg);
  }

  const sorted = [...deliveries].sort((a, b) => {
    const pw = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    return pw !== 0 ? pw : a.weightKg - b.weightKg;
  });

  for (const delivery of sorted) {
    let bestDriverId: string | null = null;
    let bestRemainingAfter = Infinity;

    for (const driver of drivers) {
      const id = (driver._id as { toString(): string }).toString();
      const cap = remaining.get(id)!;
      const current = allocation.get(id)!;

      if (cap < delivery.weightKg) continue;
      if (current.length >= MAX_STOPS_PER_VEHICLE) continue;

      const remainingAfter = cap - delivery.weightKg;
      // Best-fit: prefer the driver where remaining capacity is smallest (tightest fit)
      if (remainingAfter < bestRemainingAfter) {
        bestRemainingAfter = remainingAfter;
        bestDriverId = id;
      }
    }

    if (bestDriverId) {
      allocation.get(bestDriverId)!.push(delivery);
      remaining.set(bestDriverId, remaining.get(bestDriverId)! - delivery.weightKg);
    } else {
      console.warn(
        `[VRP] Delivery ${delivery.orderId} (${delivery.weightKg}kg) could not be allocated — ` +
          `no driver has sufficient remaining capacity or stop slots.`
      );
    }
  }

  return allocation;
}

// ── Mapbox Optimization API v1 client ────────────────────────────────────────

async function callMapboxOptimization(
  depot: DepotConfig,
  deliveries: IDelivery[],
  accessToken: string
): Promise<MapboxOptResponse> {
  if (!deliveries.length) {
    throw new Error('callMapboxOptimization requires at least one delivery');
  }

  // Build coordinate string: depot first, then each delivery location (lng,lat)
  const coords = [
    `${depot.lng},${depot.lat}`,
    ...deliveries.map((d) => `${d.location.coordinates[0]},${d.location.coordinates[1]}`),
  ].join(';');

  const url =
    `${MAPBOX_OPT_URL}/${coords}` +
    `?roundtrip=true` +
    `&source=first` +
    `&destination=last` +
    `&geometries=geojson` +
    `&overview=full` +
    `&access_token=${accessToken}`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_BASE_MS * 2 ** (attempt - 1));
    }

    let res: Response;
    try {
      res = await fetch(url);
    } catch (networkErr) {
      lastError = networkErr instanceof Error ? networkErr : new Error(String(networkErr));
      console.warn(`[VRP] Mapbox API network error (attempt ${attempt + 1}):`, lastError.message);
      continue;
    }

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('Retry-After') ?? RETRY_BASE_MS * 2 ** attempt);
      console.warn(`[VRP] Mapbox API rate-limited; retrying after ${retryAfter}ms`);
      await sleep(retryAfter);
      lastError = new Error('Mapbox API rate limit exceeded');
      continue;
    }

    const body = (await res.json()) as MapboxOptResponse;

    if (!res.ok || body.code !== 'Ok') {
      lastError = new Error(
        `Mapbox Optimization API error (${res.status}): ${body.message ?? body.code}`
      );
      // 4xx errors (bad payload, invalid token) are non-retryable
      if (res.status < 500) break;
      continue;
    }

    return body;
  }

  throw lastError ?? new Error('Mapbox Optimization API request failed after retries');
}

// ── Per-vehicle optimizer ─────────────────────────────────────────────────────

async function optimizeVehicleRoute(
  driver: IDriver,
  deliveries: IDelivery[],
  depot: DepotConfig,
  accessToken: string
): Promise<VRPRouteResult> {
  const driverId = (driver._id as { toString(): string }).toString();

  if (!deliveries.length) {
    return {
      driverId,
      stops: [],
      totalDistanceKm: 0,
      estimatedDurationMin: 0,
      optimizationScore: 100,
      routeGeometry: { type: 'LineString', coordinates: [] },
    };
  }

  const mbResponse = await callMapboxOptimization(depot, deliveries, accessToken);
  const trip = mbResponse.trips[0];

  // Mapbox waypoints[] are indexed by input coordinate position.
  // waypoint_index = position in the optimized tour (0 = depot kept at front).
  // Re-order deliveries according to the optimized sequence.
  const depotCoord: [number, number] = [depot.lng, depot.lat];
  const orderedDeliveries: IDelivery[] = new Array(deliveries.length);

  mbResponse.waypoints
    .slice(1) // skip depot (index 0)
    .forEach((wp, inputIdx) => {
      // waypoint_index 0 is the depot; delivery slots start at 1
      orderedDeliveries[wp.waypoint_index - 1] = deliveries[inputIdx];
    });

  // Build stop list with estimated arrival times
  let currentTime = '08:30';
  let prevCoord = depotCoord;
  let cumulativeDistKm = 0;

  const stops: OptimizedStop[] = orderedDeliveries.map((delivery, i) => {
    const delivCoord = delivery.location.coordinates as [number, number];
    const legDistKm =
      trip.legs[i] != null
        ? trip.legs[i].distance / 1000
        : haversineKm(prevCoord, delivCoord);

    cumulativeDistKm += legDistKm;

    const travelMin = (legDistKm / AVG_SPEED_KMH) * 60;
    currentTime = addMinutes(currentTime, travelMin + STOP_SERVICE_MIN);
    prevCoord = delivCoord;

    return {
      deliveryId: (delivery._id as { toString(): string }).toString(),
      sequence: i + 1,
      coordinates: delivCoord,
      address: delivery.address,
      distanceFromPrev: Math.round(legDistKm * 100) / 100,
      estimatedArrival: currentTime,
    };
  });

  // Add return leg distance
  const returnLeg = trip.legs[trip.legs.length - 1];
  const returnDistKm = returnLeg ? returnLeg.distance / 1000 : haversineKm(prevCoord, depotCoord);
  const totalDistanceKm = Math.round((cumulativeDistKm + returnDistKm) * 100) / 100;

  const estimatedDurationMin =
    Math.ceil(trip.duration / 60) + deliveries.length * STOP_SERVICE_MIN;

  // Optimization score: Mapbox returned a proper VRP solution, so baseline is 90.
  // Deduct slightly for large tours (heuristic signal to dispatcher).
  const optimizationScore = Math.round(Math.max(70, 92 - deliveries.length * 0.8));

  return {
    driverId,
    stops,
    totalDistanceKm,
    estimatedDurationMin,
    optimizationScore,
    routeGeometry: trip.geometry,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Entry point for the VRP orchestration layer.
 *
 * @param depot      Centralized depot configuration.
 * @param drivers    Available drivers with their capacityKg.
 * @param deliveries PENDING_DISPATCH deliveries to route.
 * @returns          One VRPRouteResult per driver that received deliveries.
 */
export async function optimizeVRP(
  depot: DepotConfig,
  drivers: IDriver[],
  deliveries: IDelivery[]
): Promise<VRPRouteResult[]> {
  const accessToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error(
      'MAPBOX_ACCESS_TOKEN is not set. Add it to your .env file to enable VRP optimization.'
    );
  }

  if (!drivers.length) throw new Error('No available drivers for VRP allocation.');
  if (!deliveries.length) throw new Error('No PENDING_DISPATCH deliveries to optimize.');

  const allocation = allocateDeliveries(drivers, deliveries);

  // Run per-vehicle optimization concurrently
  const results = await Promise.all(
    drivers
      .filter((d) => {
        const id = (d._id as { toString(): string }).toString();
        return (allocation.get(id) ?? []).length > 0;
      })
      .map((d) => {
        const id = (d._id as { toString(): string }).toString();
        return optimizeVehicleRoute(d, allocation.get(id)!, depot, accessToken);
      })
  );

  return results;
}
