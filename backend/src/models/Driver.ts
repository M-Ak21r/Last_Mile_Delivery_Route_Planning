import mongoose, { Document, Schema } from 'mongoose';

export type VehicleType = 'bike' | 'scooter' | 'van' | 'truck';
export type DriverStatus = 'available' | 'on_route' | 'off_duty' | 'break';

export interface IDriver extends Document {
  name: string;
  phone: string;
  email: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
  capacityKg: number;
  status: DriverStatus;
  currentLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  totalDeliveries: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

const DriverSchema = new Schema<IDriver>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    vehicleType: {
      type: String,
      enum: ['bike', 'scooter', 'van', 'truck'],
      required: true,
    },
    vehicleNumber: { type: String, required: true },
    capacityKg: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['available', 'on_route', 'off_duty', 'break'],
      default: 'available',
    },
    currentLocation: {
      lat: { type: Number, default: 28.6139 },
      lng: { type: Number, default: 77.209 },
      address: { type: String, default: 'Delivery Center HQ' },
    },
    totalDeliveries: { type: Number, default: 0 },
    rating: { type: Number, default: 4.5, min: 1, max: 5 },
  },
  { timestamps: true }
);

export default mongoose.model<IDriver>('Driver', DriverSchema);
