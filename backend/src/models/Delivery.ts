import mongoose, { Document, Schema } from 'mongoose';

export type DeliveryStatus =
  | 'pending'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'returned';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface IDelivery extends Document {
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
  assignedRoute?: mongoose.Types.ObjectId;
  deliveredAt?: Date;
  failureReason?: string;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const DeliverySchema = new Schema<IDelivery>(
  {
    orderId: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    address: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
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
      enum: ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'returned'],
      default: 'pending',
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

export default mongoose.model<IDelivery>('Delivery', DeliverySchema);
