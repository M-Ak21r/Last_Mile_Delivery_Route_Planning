"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const GeoPointSchema = new mongoose_1.Schema({
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
}, { _id: false });
const RouteStopSchema = new mongoose_1.Schema({
    delivery: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Delivery', required: true },
    sequence: { type: Number, required: true },
    estimatedArrival: { type: String },
    distanceFromPrev: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['pending', 'completed', 'skipped'],
        default: 'pending',
    },
});
const RouteSchema = new mongoose_1.Schema({
    routeId: { type: String, required: true, unique: true },
    driver: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Driver', required: true },
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
}, { timestamps: true });
exports.default = mongoose_1.default.model('Route', RouteSchema);
//# sourceMappingURL=Route.js.map