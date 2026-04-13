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
const DriverSchema = new mongoose_1.Schema({
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
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number],
            default: [77.209, 28.6139], // [lng, lat] — Delivery Center HQ, New Delhi
        },
        address: { type: String, default: 'Delivery Center HQ' },
    },
    totalDeliveries: { type: Number, default: 0 },
    rating: { type: Number, default: 4.5, min: 1, max: 5 },
}, { timestamps: true });
// 2dsphere index enables geo queries on driver position
DriverSchema.index({ currentLocation: '2dsphere' });
exports.default = mongoose_1.default.model('Driver', DriverSchema);
//# sourceMappingURL=Driver.js.map