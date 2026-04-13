import mongoose, { Document, Schema } from 'mongoose';

export type RouteStatus = 'planned' | 'active' | 'completed' | 'cancelled';

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
  startLocation: { lat: number; lng: number; address: string };
  endLocation: { lat: number; lng: number; address: string };
  plannedDate: Date;
  startedAt?: Date;
  completedAt?: Date;
  optimizationScore: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

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
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, required: true },
    },
    endLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, required: true },
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
