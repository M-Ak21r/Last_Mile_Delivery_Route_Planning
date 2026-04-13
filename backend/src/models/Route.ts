import mongoose, { Document, Schema } from 'mongoose';

export type RouteStatus = 'planned' | 'active' | 'completed' | 'cancelled';

export interface IGeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IRouteStop {
  _id?: mongoose.Types.ObjectId;
  delivery: mongoose.Types.ObjectId;
  sequence: number;
  estimatedArrival: string;
  distanceFromPrev: number;
  status: 'pending' | 'completed' | 'skipped';
}

export interface IRoute extends Document {
  routeId: string;
  driver: mongoose.Types.ObjectId;
  stops: IRouteStop[];
  status: RouteStatus;
  totalDistanceKm: number;
  estimatedDurationMin: number;
  actualDurationMin?: number;
  startLocation: IGeoPoint & { address: string };
  endLocation: IGeoPoint & { address: string };
  /** GeoJSON LineString geometry returned by Mapbox Optimization API v1 */
  routeGeometry?: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  plannedDate: Date;
  startedAt?: Date;
  completedAt?: Date;
  optimizationScore: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const GeoPointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  { _id: false }
);

const RouteStopSchema = new Schema<IRouteStop>({
  delivery: { type: Schema.Types.ObjectId, ref: 'Delivery', required: true },
  sequence: { type: Number, required: true },
  estimatedArrival: { type: String },
  distanceFromPrev: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'completed', 'skipped'],
    default: 'pending',
  },
});

const RouteSchema = new Schema<IRoute>(
  {
    routeId: { type: String, required: true, unique: true },
    driver: { type: Schema.Types.ObjectId, ref: 'Driver', required: true },
    stops: [RouteStopSchema],
    status: {
      type: String,
      enum: ['planned', 'active', 'completed', 'cancelled'],
      default: 'planned',
    },
    totalDistanceKm: { type: Number, default: 0 },
    estimatedDurationMin: { type: Number, default: 0 },
    actualDurationMin: { type: Number },
    startLocation: {
      type: { type: String, enum: ['Point'], required: true, default: 'Point' },
      coordinates: { type: [Number], required: true },
      address: { type: String, required: true },
    },
    endLocation: {
      type: { type: String, enum: ['Point'], required: true, default: 'Point' },
      coordinates: { type: [Number], required: true },
      address: { type: String, required: true },
    },
    routeGeometry: {
      type: {
        type: String,
        enum: ['LineString'],
        default: 'LineString',
      },
      coordinates: { type: [[Number]] },
    },
    plannedDate: { type: Date, required: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
    optimizationScore: { type: Number, default: 0, min: 0, max: 100 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IRoute>('Route', RouteSchema);
