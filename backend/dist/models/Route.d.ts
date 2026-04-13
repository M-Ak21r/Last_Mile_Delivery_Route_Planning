import mongoose, { Document } from 'mongoose';
export type RouteStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export interface IGeoPoint {
    type: 'Point';
    coordinates: [number, number];
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
    startLocation: IGeoPoint & {
        address: string;
    };
    endLocation: IGeoPoint & {
        address: string;
    };
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
declare const _default: mongoose.Model<IRoute, {}, {}, {}, mongoose.Document<unknown, {}, IRoute, {}, {}> & IRoute & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Route.d.ts.map