import { IDelivery } from '../models/Delivery';

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface OptimizedStop {
  deliveryId: string;
  sequence: number;
  coordinates: Coordinate;
  address: string;
  distanceFromPrev: number;
  estimatedArrival: string;
}

export interface OptimizationResult {
  stops: OptimizedStop[];
  totalDistanceKm: number;
  estimatedDurationMin: number;
  optimizationScore: number;
}

// Haversine formula — distance between two lat/lng points in km
function haversineDistance(a: Coordinate, b: Coordinate): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

// Priority weights — higher priority deliveries get served earlier
const PRIORITY_WEIGHT: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function optimizeRoute(
  depot: Coordinate,
  deliveries: IDelivery[]
): OptimizationResult {
  if (deliveries.length === 0) {
    return { stops: [], totalDistanceKm: 0, estimatedDurationMin: 0, optimizationScore: 100 };
  }

  // Nearest-neighbour with priority bias
  const unvisited = [...deliveries];
  const ordered: IDelivery[] = [];
  let current = depot;

  while (unvisited.length > 0) {
    let bestIdx = 0;
    let bestScore = Infinity;

    unvisited.forEach((d, i) => {
      const dist = haversineDistance(current, d.coordinates);
      const priorityBonus = (5 - PRIORITY_WEIGHT[d.priority]) * 2; // lower = better
      const score = dist + priorityBonus;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    });

    ordered.push(unvisited[bestIdx]);
    current = unvisited[bestIdx].coordinates;
    unvisited.splice(bestIdx, 1);
  }

  // Build stop list
  let totalDist = 0;
  let currentTime = '08:30'; // route start time
  let prev = depot;

  const stops: OptimizedStop[] = ordered.map((d, i) => {
    const dist = haversineDistance(prev, d.coordinates);
    totalDist += dist;
    // Avg delivery speed ~25 km/h in city + 5 min per stop
    const travelMin = Math.ceil((dist / 25) * 60) + 5;
    currentTime = addMinutes(currentTime, travelMin);
    prev = d.coordinates;

    return {
      deliveryId: (d._id as unknown as { toString(): string }).toString(),
      sequence: i + 1,
      coordinates: d.coordinates,
      address: d.address,
      distanceFromPrev: Math.round(dist * 100) / 100,
      estimatedArrival: currentTime,
    };
  });

  // Return to depot
  const returnDist = haversineDistance(prev, depot);
  totalDist += returnDist;

  const estimatedDurationMin = Math.ceil((totalDist / 25) * 60) + deliveries.length * 5;

  // Optimization score: simulated (decreases slightly per unoptimized sequence)
  const optimizationScore = Math.min(100, Math.max(60, 95 - deliveries.length * 0.5));

  return {
    stops,
    totalDistanceKm: Math.round(totalDist * 100) / 100,
    estimatedDurationMin,
    optimizationScore: Math.round(optimizationScore),
  };
}
