"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDriverLocation = exports.deleteDriver = exports.updateDriver = exports.createDriver = exports.getDriver = exports.getAllDrivers = void 0;
const Driver_1 = __importDefault(require("../models/Driver"));
const Route_1 = __importDefault(require("../models/Route"));
const socket_1 = require("../socket");
const getAllDrivers = async (req, res) => {
    try {
        const { status, vehicleType } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        if (vehicleType)
            filter.vehicleType = vehicleType;
        const drivers = await Driver_1.default.find(filter).sort({ name: 1 });
        res.json({ success: true, data: drivers });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Server error', error: err });
    }
};
exports.getAllDrivers = getAllDrivers;
const getDriver = async (req, res) => {
    try {
        const driver = await Driver_1.default.findById(req.params.id);
        if (!driver)
            return res.status(404).json({ success: false, message: 'Driver not found' });
        const routes = await Route_1.default.find({ driver: driver._id })
            .populate('stops.delivery', 'orderId customerName status')
            .sort({ createdAt: -1 })
            .limit(10);
        res.json({ success: true, data: { driver, routes } });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Server error', error: err });
    }
};
exports.getDriver = getDriver;
const createDriver = async (req, res) => {
    try {
        const driver = new Driver_1.default(req.body);
        await driver.save();
        res.status(201).json({ success: true, data: driver });
    }
    catch (err) {
        res.status(400).json({ success: false, message: 'Validation error', error: err });
    }
};
exports.createDriver = createDriver;
const updateDriver = async (req, res) => {
    try {
        const driver = await Driver_1.default.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!driver)
            return res.status(404).json({ success: false, message: 'Driver not found' });
        res.json({ success: true, data: driver });
    }
    catch (err) {
        res.status(400).json({ success: false, message: 'Update failed', error: err });
    }
};
exports.updateDriver = updateDriver;
const deleteDriver = async (req, res) => {
    try {
        const driver = await Driver_1.default.findByIdAndDelete(req.params.id);
        if (!driver)
            return res.status(404).json({ success: false, message: 'Driver not found' });
        res.json({ success: true, message: 'Driver deleted' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Server error', error: err });
    }
};
exports.deleteDriver = deleteDriver;
/**
 * PUT /api/drivers/:id/location
 *
 * Accepts { lng, lat, address? } from a driver's mobile GPS.
 * Persists the GeoJSON Point and broadcasts a driver:location socket event
 * so the frontend map can move the driver marker in real-time.
 */
const updateDriverLocation = async (req, res) => {
    try {
        const { lng, lat, address } = req.body;
        if (typeof lng !== 'number' || typeof lat !== 'number') {
            return res.status(400).json({ success: false, message: 'lng and lat (numbers) are required' });
        }
        const update = {
            'currentLocation.coordinates': [lng, lat],
        };
        if (address)
            update['currentLocation.address'] = address;
        const driver = await Driver_1.default.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });
        if (!driver)
            return res.status(404).json({ success: false, message: 'Driver not found' });
        // Broadcast to all connected WebSocket clients
        try {
            (0, socket_1.getIo)().emit('driver:location', {
                driverId: driver._id.toString(),
                coordinates: [lng, lat],
                address: driver.currentLocation.address,
            });
        }
        catch (socketErr) {
            console.warn('[Socket] Could not emit driver:location:', socketErr);
        }
        res.json({ success: true, data: driver });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Server error', error: err });
    }
};
exports.updateDriverLocation = updateDriverLocation;
//# sourceMappingURL=driverController.js.map