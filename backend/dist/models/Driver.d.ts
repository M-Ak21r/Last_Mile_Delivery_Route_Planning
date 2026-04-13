import mongoose, { Document } from 'mongoose';
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
        type: 'Point';
        coordinates: [number, number];
        address: string;
    };
    totalDeliveries: number;
    rating: number;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IDriver, {}, {}, {}, mongoose.Document<unknown, {}, IDriver, {}, {}> & IDriver & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Driver.d.ts.map