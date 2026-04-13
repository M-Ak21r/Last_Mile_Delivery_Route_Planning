import { Router } from 'express';
import {
  getAllDeliveries,
  getDelivery,
  createDelivery,
  updateDelivery,
  deleteDelivery,
  getDeliveryStats,
} from '../controllers/deliveryController';
import {
  getAllDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
  updateDriverLocation,
} from '../controllers/driverController';
import {
  getAllRoutes,
  getRoute,
  optimizeAndCreateRoute,
  updateRouteStatus,
  deleteRoute,
  getDashboardStats,
} from '../controllers/routeController';

const router = Router();

// Dashboard
router.get('/dashboard', getDashboardStats);

// Config — exposes the Mapbox public token to the frontend
router.get('/config', (_req, res) => {
  res.json({ mapboxToken: process.env.MAPBOX_ACCESS_TOKEN ?? '' });
});

// Deliveries
router.get('/deliveries', getAllDeliveries);
router.get('/deliveries/stats', getDeliveryStats);
router.get('/deliveries/:id', getDelivery);
router.post('/deliveries', createDelivery);
router.put('/deliveries/:id', updateDelivery);
router.delete('/deliveries/:id', deleteDelivery);

// Drivers
router.get('/drivers', getAllDrivers);
router.get('/drivers/:id', getDriver);
router.post('/drivers', createDriver);
router.put('/drivers/:id', updateDriver);
router.delete('/drivers/:id', deleteDriver);
// Real-time GPS telemetry — called by driver mobile app / simulator
router.put('/drivers/:id/location', updateDriverLocation);

// Routes
router.get('/routes', getAllRoutes);
router.get('/routes/:id', getRoute);
router.post('/routes/optimize', optimizeAndCreateRoute);
router.put('/routes/:id', updateRouteStatus);
router.delete('/routes/:id', deleteRoute);

export default router;
