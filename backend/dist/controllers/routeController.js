"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = exports.deleteRoute = exports.updateRouteStatus = exports.optimizeAndCreateRoute = exports.getRoute = exports.getAllRoutes = void 0;
const Route_1 = __importDefault(require("../models/Route"));
const Driver_1 = __importDefault(require("../models/Driver"));
const Delivery_1 = __importDefault(require("../models/Delivery"));
const routeOptimizer_1 = require("../services/routeOptimizer");
const socket_1 = require("../socket");
const uuid_1 = require("uuid");
// Centralised depot — update coordinates if the depot changes
const DEPOT = {
    lng: 77.209,
    lat: 28.6139,
    address: 'Delivery Center HQ, New Delhi',
};
// ── Helpers ──────────────────────────────────────────────────────────────────
function depotGeoPoint() {
    return { type: 'Point', coordinates: [DEPOT.lng, DEPOT.lat], address: DEPOT.address };
}
// ── Route CRUD ────────────────────────────────────────────────────────────────
const getAllRoutes = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        const skip = (Number(page) - 1) * Number(limit);
        const [routes, total] = await Promise.all([
            Route_1.default.find(filter)
                .populate('driver', 'name vehicleType vehicleNumber phone')
                .populate('stops.delivery', 'orderId customerName address status priority location')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Route_1.default.countDocuments(filter),
        ]);
        res.json({ success: true, data: routes, total, page: Number(page), limit: Number(limit) });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Server error', error: err });
    }
};
exports.getAllRoutes = getAllRoutes;
const getRoute = async (req, res) => {
    try {
        const route = await Route_1.default.findById(req.params.id)
            .populate('driver')
            .populate('stops.delivery');
        if (!route)
            return res.status(404).json({ success: false, message: 'Route not found' });
        res.json({ success: true, data: route });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Server error', error: err });
    }
};
exports.getRoute = getRoute;
// ── VRP Optimization Endpoint ─────────────────────────────────────────────────
//
// DELETE THIS if you want fully automated scheduling — this endpoint intentionally
// still accepts an optional driverId + deliveryIds for manual override, but falls
// back to auto-VRP across all PENDING_DISPATCH / available when omitted.
const optimizeAndCreateRoute = async (req, res) => {
    try {
        const { driverId, deliveryIds, plannedDate, notes } = req.body;
        // ── Fetch inputs ─────────────────────────────────────────────────────────
        let drivers, deliveries;
        if (driverId && deliveryIds?.length) {
            // Manual override: specific driver + deliveries
            const driver = await Driver_1.default.findById(driverId);
            if (!driver)
                return res.status(404).json({ success: false, message: 'Driver not found' });
            if (driver.status !== 'available') {
                return res.status(400).json({ success: false, message: 'Driver is not available' });
            }
            const found = await Delivery_1.default.find({
                _id: { $in: deliveryIds },
                status: 'PENDING_DISPATCH',
            });
            if (!found.length) {
                return res.status(400).json({ success: false, message: 'No PENDING_DISPATCH deliveries found' });
            }
            drivers = [driver];
            deliveries = found;
        }
        else {
            // Auto-VRP: all available drivers + all PENDING_DISPATCH deliveries
            [drivers, deliveries] = await Promise.all([
                Driver_1.default.find({ status: 'available' }),
                Delivery_1.default.find({ status: 'PENDING_DISPATCH' }),
            ]);
            if (!drivers.length) {
                return res.status(400).json({ success: false, message: 'No available drivers' });
            }
            if (!deliveries.length) {
                return res.status(400).json({ success: false, message: 'No PENDING_DISPATCH deliveries' });
            }
        }
        // ── Run VRP ──────────────────────────────────────────────────────────────
        const vrpResults = await (0, routeOptimizer_1.optimizeVRP)(DEPOT, drivers, deliveries);
        if (!vrpResults.length) {
            return res.status(422).json({ success: false, message: 'VRP produced no routes — check capacity constraints' });
        }
        const plannedDateParsed = plannedDate ? new Date(plannedDate) : new Date();
        const createdRoutes = [];
        for (const result of vrpResults) {
            if (!result.stops.length)
                continue;
            const stops = result.stops.map((s) => ({
                delivery: s.deliveryId,
                sequence: s.sequence,
                estimatedArrival: s.estimatedArrival,
                distanceFromPrev: s.distanceFromPrev,
                status: 'pending',
            }));
            const route = new Route_1.default({
                routeId: `RT-${(0, uuid_1.v4)().slice(0, 8).toUpperCase()}`,
                driver: result.driverId,
                stops,
                status: 'planned',
                totalDistanceKm: result.totalDistanceKm,
                estimatedDurationMin: result.estimatedDurationMin,
                startLocation: depotGeoPoint(),
                endLocation: depotGeoPoint(),
                routeGeometry: result.routeGeometry,
                plannedDate: plannedDateParsed,
                optimizationScore: result.optimizationScore,
                notes: notes ?? '',
            });
            await route.save();
            const deliveryIds = result.stops.map((s) => s.deliveryId);
            await Delivery_1.default.updateMany({ _id: { $in: deliveryIds } }, { status: 'ROUTE_OPTIMIZED', assignedRoute: route._id });
            await Driver_1.default.findByIdAndUpdate(result.driverId, { status: 'on_route' });
            const populated = await Route_1.default.findById(route._id)
                .populate('driver', 'name vehicleType vehicleNumber phone')
                .populate('stops.delivery', 'orderId customerName address status priority location');
            createdRoutes.push(populated);
        }
        res.status(201).json({ success: true, data: createdRoutes, count: createdRoutes.length });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Server error';
        // 503 on Mapbox API failures so client can surface the right error message
        const status = message.includes('Mapbox') || message.includes('MAPBOX') ? 503 : 500;
        res.status(status).json({ success: false, message, error: err });
    }
};
exports.optimizeAndCreateRoute = optimizeAndCreateRoute;
// ── Route Status Transitions ──────────────────────────────────────────────────
const updateRouteStatus = async (req, res) => {
    try {
        const { status, stopId, stopStatus } = req.body;
        const route = await Route_1.default.findById(req.params.id);
        if (!route)
            return res.status(404).json({ success: false, message: 'Route not found' });
        if (status) {
            route.status = status;
            if (status === 'active' && !route.startedAt) {
                route.startedAt = new Date();
                // Transition all ROUTE_OPTIMIZED deliveries on this route to IN_TRANSIT
                const deliveryIds = route.stops.map((s) => s.delivery);
                await Delivery_1.default.updateMany({ _id: { $in: deliveryIds }, status: 'ROUTE_OPTIMIZED' }, { status: 'IN_TRANSIT' });
                // Emit real-time event to all WebSocket clients
                try {
                    (0, socket_1.getIo)().emit('route:started', {
                        routeId: route.routeId,
                        driverId: route.driver.toString(),
                        stops: route.stops,
                    });
                }
                catch (socketErr) {
                    console.warn('[Socket] Could not emit route:started:', socketErr);
                }
            }
            if (status === 'completed') {
                route.completedAt = new Date();
                route.actualDurationMin = route.startedAt
                    ? Math.round((Date.now() - route.startedAt.getTime()) / 60000)
                    : undefined;
                await Driver_1.default.findByIdAndUpdate(route.driver, { status: 'available' });
                try {
                    (0, socket_1.getIo)().emit('route:completed', {
                        routeId: route.routeId,
                        driverId: route.driver.toString(),
                    });
                }
                catch (socketErr) {
                    console.warn('[Socket] Could not emit route:completed:', socketErr);
                }
            }
        }
        if (stopId && stopStatus) {
            const stop = route.stops.find((s) => s._id?.toString() === stopId);
            if (stop) {
                stop.status = stopStatus;
                if (stopStatus === 'completed') {
                    await Delivery_1.default.findByIdAndUpdate(stop.delivery, {
                        status: 'DELIVERED',
                        deliveredAt: new Date(),
                    });
                    try {
                        (0, socket_1.getIo)().emit('stop:completed', {
                            routeId: route.routeId,
                            stopId,
                            deliveryId: stop.delivery.toString(),
                        });
                    }
                    catch (socketErr) {
                        console.warn('[Socket] Could not emit stop:completed:', socketErr);
                    }
                }
                if (stopStatus === 'skipped') {
                    await Delivery_1.default.findByIdAndUpdate(stop.delivery, {
                        status: 'FAILED_ATTEMPT',
                        $inc: { attempts: 1 },
                    });
                }
            }
        }
        await route.save();
        const populated = await Route_1.default.findById(route._id)
            .populate('driver', 'name vehicleType')
            .populate('stops.delivery', 'orderId customerName address status');
        res.json({ success: true, data: populated });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Server error', error: err });
    }
};
exports.updateRouteStatus = updateRouteStatus;
const deleteRoute = async (req, res) => {
    try {
        const route = await Route_1.default.findById(req.params.id);
        if (!route)
            return res.status(404).json({ success: false, message: 'Route not found' });
        // Unassign deliveries — revert to PENDING_DISPATCH
        const deliveryIds = route.stops.map((s) => s.delivery);
        await Delivery_1.default.updateMany({ _id: { $in: deliveryIds }, status: { $in: ['ROUTE_OPTIMIZED', 'IN_TRANSIT'] } }, { status: 'PENDING_DISPATCH', $unset: { assignedRoute: 1 } });
        if (route.status === 'active' || route.status === 'planned') {
            await Driver_1.default.findByIdAndUpdate(route.driver, { status: 'available' });
        }
        await Route_1.default.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Route deleted and deliveries unassigned' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Server error', error: err });
    }
};
exports.deleteRoute = deleteRoute;
const getDashboardStats = async (_req, res) => {
    try {
        const [totalDeliveries, pendingDeliveries, deliveredToday, activeRoutes, availableDrivers, totalRoutes,] = await Promise.all([
            Delivery_1.default.countDocuments(),
            Delivery_1.default.countDocuments({ status: 'PENDING_DISPATCH' }),
            Delivery_1.default.countDocuments({
                status: 'DELIVERED',
                deliveredAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            }),
            Route_1.default.countDocuments({ status: 'active' }),
            Driver_1.default.countDocuments({ status: 'available' }),
            Route_1.default.countDocuments(),
        ]);
        const recentRoutes = await Route_1.default.find()
            .populate('driver', 'name vehicleType')
            .sort({ createdAt: -1 })
            .limit(5);
        const deliveryStatusBreakdown = await Delivery_1.default.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        const routeEfficiency = await Route_1.default.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: null,
                    avgScore: { $avg: '$optimizationScore' },
                    avgDistance: { $avg: '$totalDistanceKm' },
                    avgDuration: { $avg: '$estimatedDurationMin' },
                },
            },
        ]);
        res.json({
            success: true,
            data: {
                totalDeliveries,
                pendingDeliveries,
                deliveredToday,
                activeRoutes,
                availableDrivers,
                totalRoutes,
                recentRoutes,
                deliveryStatusBreakdown,
                routeEfficiency: routeEfficiency[0] ?? {},
            },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Server error', error: err });
    }
};
exports.getDashboardStats = getDashboardStats;
//# sourceMappingURL=routeController.js.map