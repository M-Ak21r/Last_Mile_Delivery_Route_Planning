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
const DeliverySchema = new mongoose_1.Schema({
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
    assignedRoute: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Route' },
    deliveredAt: { type: Date },
    failureReason: { type: String },
    attempts: { type: Number, default: 0 },
}, { timestamps: true });
// 2dsphere index enables geo queries on delivery locations
DeliverySchema.index({ location: '2dsphere' });
exports.default = mongoose_1.default.model('Delivery', DeliverySchema);
//# sourceMappingURL=Delivery.js.map