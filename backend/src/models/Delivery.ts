import mongoose, { Document, Schema } from 'mongoose';

// ── State Machine ────────────────────────────────────────────────────────────
// PENDING_DISPATCH  → delivery created, awaiting VRP assignment
// ROUTE_OPTIMIZED   → included in a planned route
// IN_TRANSIT        → driver has started the route
// DELIVERED         → successfully handed off to customer
// FAILED_ATTEMPT    → delivery attempted but failed; eligible for retry
export type DeliveryStatus =
  | 'PENDING_DISPATCH'
  | 'ROUTE_OPTIMIZED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED_ATTEMPT';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// GeoJSON Point as stored in MongoDB (coordinates: [lng, lat])
export interface IGeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IDelivery extends Document {
  orderId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  location: IGeoPoint;
  weightKg: number;
  dimensions: { length: number; width: number; height: number };
  priority: Priority;
  status: DeliveryStatus;
  deliveryWindow: { start: string; end: string };
  specialInstructions: string;
  codAmount: number;
  assignedRoute?: mongoose.Types.ObjectId;
  deliveredAt?: Date;
  failureReason?: string;
  attempts: number;
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

const DeliverySchema = new Schema<IDelivery>(
  {
    orderId: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    address: { type: String, required: true },
    location: { type: GeoPointSchema, required: true },
    weightKg: { type: Number, required: true, min: 0.1 },
    dimensions: {
      length: { type: Number, default: 30 },
      width: { type: Number, default: 20 },
      height: { type: Number, default: 15 },
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['PENDING_DISPATCH', 'ROUTE_OPTIMIZED', 'IN_TRANSIT', 'DELIVERED', 'FAILED_ATTEMPT'],
      default: 'PENDING_DISPATCH',
    },
    deliveryWindow: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' },
    },
    specialInstructions: { type: String, default: '' },
    codAmount: { type: Number, default: 0 },
    assignedRoute: { type: Schema.Types.ObjectId, ref: 'Route' },
    deliveredAt: { type: Date },
    failureReason: { type: String },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// 2dsphere index enables geo queries on delivery locations
DeliverySchema.index({ location: '2dsphere' });

export default mongoose.model<IDelivery>('Delivery', DeliverySchema);
