import { Request, Response } from 'express';
import Route from '../models/Route';
import Driver from '../models/Driver';
import Delivery from '../models/Delivery';
import { optimizeRoute } from '../services/routeOptimizer';
import { v4 as uuidv4 } from 'uuid';

const DEPOT = { lat: 28.6139, lng: 77.209, address: 'Delivery Center HQ, New Delhi' };

export const getAllRoutes = async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [routes, total] = await Promise.all([
      Route.find(filter)
        .populate('driver', 'name vehicleType vehicleNumber phone')
        .populate('stops.delivery', 'orderId customerName address status priority')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Route.countDocuments(filter),
    ]);

    res.json({ success: true, data: routes, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err });
  }
};

export const getRoute = async (req: Request, res: Response) => {
  try {
    const route = await Route.findById(req.params.id)
      .populate('driver')
      .populate('stops.delivery');
    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
    res.json({ success: true, data: route });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err });
  }
};

export const optimizeAndCreateRoute = async (req: Request, res: Response) => {
  try {
    const { driverId, deliveryIds, plannedDate, notes } = req.body;

    if (!driverId || !deliveryIds?.length) {
      return res.status(400).json({ success: false, message: 'driverId and deliveryIds are required' });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    const deliveries = await Delivery.find({ _id: { $in: deliveryIds }, status: 'pending' });
    if (!deliveries.length) {
      return res.status(400).json({ success: false, message: 'No pending deliveries found' });
    }

    // Check driver capacity
    const totalWeight = deliveries.reduce((s, d) => s + d.weightKg, 0);
    if (totalWeight > driver.capacityKg) {
      return res.status(400).json({
        success: false,
        message: `Total weight ${totalWeight}kg exceeds driver capacity ${driver.capacityKg}kg`,
      });
    }

    // Run optimization
    const result = optimizeRoute(DEPOT, deliveries);

    // Build stops from result
    const stops = result.stops.map((s) => ({
      delivery: s.deliveryId,
      sequence: s.sequence,
      estimatedArrival: s.estimatedArrival,
      distanceFromPrev: s.distanceFromPrev,
      status: 'pending' as const,
    }));

    const route = new Route({
      routeId: `RT-${uuidv4().slice(0, 8).toUpperCase()}`,
      driver: driverId,
      stops,
      status: 'planned',
      totalDistanceKm: result.totalDistanceKm,
      estimatedDurationMin: result.estimatedDurationMin,
      startLocation: DEPOT,
      endLocation: DEPOT,
      plannedDate: plannedDate ? new Date(plannedDate) : new Date(),
      optimizationScore: result.optimizationScore,
      notes: notes || '',
    });

    await route.save();

    // Mark deliveries as assigned
    await Delivery.updateMany(
      { _id: { $in: deliveryIds } },
      { status: 'assigned', assignedRoute: route._id }
    );

    // Update driver status
    await Driver.findByIdAndUpdate(driverId, { status: 'on_route' });

    const populated = await Route.findById(route._id)
      .populate('driver', 'name vehicleType vehicleNumber phone')
      .populate('stops.delivery', 'orderId customerName address status priority coordinates');

    res.status(201).json({ success: true, data: populated, optimization: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err });
  }
};

export const updateRouteStatus = async (req: Request, res: Response) => {
  try {
    const { status, stopId, stopStatus } = req.body;
    const route = await Route.findById(req.params.id);
    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });

    if (status) {
      route.status = status;
      if (status === 'active' && !route.startedAt) route.startedAt = new Date();
      if (status === 'completed') {
        route.completedAt = new Date();
        route.actualDurationMin = route.startedAt
          ? Math.round((Date.now() - route.startedAt.getTime()) / 60000)
          : undefined;
        await Driver.findByIdAndUpdate(route.driver, { status: 'available' });
      }
    }

    if (stopId && stopStatus) {
      const stop = route.stops.find((s) => s._id?.toString() === stopId);
      if (stop) {
        stop.status = stopStatus;
        if (stopStatus === 'completed') {
          await Delivery.findByIdAndUpdate(stop.delivery, {
            status: 'delivered',
            deliveredAt: new Date(),
          });
        }
      }
    }

    await route.save();
    const populated = await Route.findById(route._id)
      .populate('driver', 'name vehicleType')
      .populate('stops.delivery', 'orderId customerName address status');

    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err });
  }
};

export const deleteRoute = async (req: Request, res: Response) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });

    // Unassign deliveries
    const deliveryIds = route.stops.map((s) => s.delivery);
    await Delivery.updateMany(
      { _id: { $in: deliveryIds }, status: 'assigned' },
      { status: 'pending', $unset: { assignedRoute: 1 } }
    );

    await Route.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Route deleted and deliveries unassigned' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err });
  }
};

export const getDashboardStats = async (_req: Request, res: Response) => {
  try {
    const [
      totalDeliveries,
      pendingDeliveries,
      deliveredToday,
      activeRoutes,
      availableDrivers,
      totalRoutes,
    ] = await Promise.all([
      Delivery.countDocuments(),
      Delivery.countDocuments({ status: 'pending' }),
      Delivery.countDocuments({
        status: 'delivered',
        deliveredAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      Route.countDocuments({ status: 'active' }),
      Driver.countDocuments({ status: 'available' }),
      Route.countDocuments(),
    ]);

    const recentRoutes = await Route.find()
      .populate('driver', 'name vehicleType')
      .sort({ createdAt: -1 })
      .limit(5);

    const deliveryStatusBreakdown = await Delivery.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const routeEfficiency = await Route.aggregate([
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
        routeEfficiency: routeEfficiency[0] || {},
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err });
  }
};
