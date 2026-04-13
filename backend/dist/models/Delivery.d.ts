import mongoose, { Document } from 'mongoose';
export type DeliveryStatus = 'PENDING_DISPATCH' | 'ROUTE_OPTIMIZED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED_ATTEMPT';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export interface IGeoPoint {
    type: 'Point';
    coordinates: [number, number];
}
export interface IDelivery extends Document {
    orderId: string;
    customerName: string;
    customerPhone: string;
    address: string;
    location: IGeoPoint;
    weightKg: number;
    dimensions: {
        length: number;
        width: number;
        height: number;
    };
    priority: Priority;
    status: DeliveryStatus;
    deliveryWindow: {
        start: string;
        end: string;
    };
    specialInstructions: string;
    codAmount: number;
    assignedRoute?: mongoose.Types.ObjectId;
    deliveredAt?: Date;
    failureReason?: string;
    attempts: number;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IDelivery, {}, {}, {}, mongoose.Document<unknown, {}, IDelivery, {}, {}> & IDelivery & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Delivery.d.ts.map