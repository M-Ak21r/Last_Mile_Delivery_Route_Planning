import { Request, Response } from 'express';
import Driver from '../models/Driver';
import Route from '../models/Route';
import { getIo } from '../socket';

export const getAllDrivers = async (req: Request, res: Response) => {
  try {
    const { status, vehicleType } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (vehicleType) filter.vehicleType = vehicleType;

    const drivers = await Driver.find(filter).sort({ name: 1 });
    res.json({ success: true, data: drivers });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err });
  }
};

export const getDriver = async (req: Request, res: Response) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    const routes = await Route.find({ driver: driver._id })
      .populate('stops.delivery', 'orderId customerName status')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ success: true, data: { driver, routes } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err });
  }
};

export const createDriver = async (req: Request, res: Response) => {
  try {
    const driver = new Driver(req.body);
    await driver.save();
    res.status(201).json({ success: true, data: driver });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Validation error', error: err });
  }
};

export const updateDriver = async (req: Request, res: Response) => {
  try {
    const driver = await Driver.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    res.json({ success: true, data: driver });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Update failed', error: err });
  }
};

export const deleteDriver = async (req: Request, res: Response) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    res.json({ success: true, message: 'Driver deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err });
  }
};

/**
 * PUT /api/drivers/:id/location
 *
 * Accepts { lng, lat, address? } from a driver's mobile GPS.
 * Persists the GeoJSON Point and broadcasts a driver:location socket event
 * so the frontend map can move the driver marker in real-time.
 */
export const updateDriverLocation = async (req: Request, res: Response) => {
  try {
    const { lng, lat, address } = req.body as { lng: number; lat: number; address?: string };

    if (typeof lng !== 'number' || typeof lat !== 'number') {
      return res.status(400).json({ success: false, message: 'lng and lat (numbers) are required' });
    }

    const update: Record<string, unknown> = {
      'currentLocation.coordinates': [lng, lat],
    };
    if (address) update['currentLocation.address'] = address;

    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    // Broadcast to all connected WebSocket clients
    try {
      getIo().emit('driver:location', {
        driverId: (driver._id as { toString(): string }).toString(),
        coordinates: [lng, lat] as [number, number],
        address: driver.currentLocation.address,
      });
    } catch (socketErr) {
      console.warn('[Socket] Could not emit driver:location:', socketErr);
    }

    res.json({ success: true, data: driver });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err });
  }
};
