"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const deliveryController_1 = require("../controllers/deliveryController");
const driverController_1 = require("../controllers/driverController");
const routeController_1 = require("../controllers/routeController");
const router = (0, express_1.Router)();
// Dashboard
router.get('/dashboard', routeController_1.getDashboardStats);
// Config — exposes the Mapbox public token to the frontend
router.get('/config', (_req, res) => {
    res.json({ mapboxToken: process.env.MAPBOX_ACCESS_TOKEN ?? '' });
});
// Deliveries
router.get('/deliveries', deliveryController_1.getAllDeliveries);
router.get('/deliveries/stats', deliveryController_1.getDeliveryStats);
router.get('/deliveries/:id', deliveryController_1.getDelivery);
router.post('/deliveries', deliveryController_1.createDelivery);
router.put('/deliveries/:id', deliveryController_1.updateDelivery);
router.delete('/deliveries/:id', deliveryController_1.deleteDelivery);
// Drivers
router.get('/drivers', driverController_1.getAllDrivers);
router.get('/drivers/:id', driverController_1.getDriver);
router.post('/drivers', driverController_1.createDriver);
router.put('/drivers/:id', driverController_1.updateDriver);
router.delete('/drivers/:id', driverController_1.deleteDriver);
// Real-time GPS telemetry — called by driver mobile app / simulator
router.put('/drivers/:id/location', driverController_1.updateDriverLocation);
// Routes
router.get('/routes', routeController_1.getAllRoutes);
router.get('/routes/:id', routeController_1.getRoute);
router.post('/routes/optimize', routeController_1.optimizeAndCreateRoute);
router.put('/routes/:id', routeController_1.updateRouteStatus);
router.delete('/routes/:id', routeController_1.deleteRoute);
exports.default = router;
//# sourceMappingURL=api.js.map