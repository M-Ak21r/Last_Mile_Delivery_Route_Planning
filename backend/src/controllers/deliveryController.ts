import { Request, Response } from 'express';
import Delivery from '../models/Delivery';
import { v4 as uuidv4 } from 'uuid';

export const getAllDeliveries = async (req: Request, res: Response) => {
  try {
    const { status, priority, page = 1, limit = 20 } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const skip = (Number(page) - 1) * Number(limit);
    const [deliveries, total] = await Promise.all([
      Delivery.find(filter)
        .populate('assignedRoute', 'routeId status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Delivery.countDocuments(filter),
    ]);

    res.json({ success: true, data: deliveries, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err });
  }
};

export const getDelivery = async (req: Request, res: Response) => {
  try {
    const delivery = await Delivery.findById(req.params.id).populate('assignedRoute');
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    res.json({ success: true, data: delivery });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err });
  }
};

export const createDelivery = async (req: Request, res: Response) => {
  try {
    const orderId = `ORD-${uuidv4().slice(0, 8).toUpperCase()}`;
    const delivery = new Delivery({ ...req.body, orderId });
    await delivery.save();
    res.status(201).json({ success: true, data: delivery });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Validation error', error: err });
  }
};

export const updateDelivery = async (req: Request, res: Response) => {
  try {
    const delivery = await Delivery.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    res.json({ success: true, data: delivery });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Update failed', error: err });
  }
};

export const deleteDelivery = async (req: Request, res: Response) => {
  try {
    const delivery = await Delivery.findByIdAndDelete(req.params.id);
    if (!delivery) return res.status(404).json({ success: false, message: 'Delivery not found' });
    res.json({ success: true, message: 'Delivery deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err });
  }
};

export const getDeliveryStats = async (_req: Request, res: Response) => {
  try {
    const stats = await Delivery.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalWeight: { $sum: '$weightKg' },
          totalCOD: { $sum: '$codAmount' },
        },
      },
    ]);

    const priorityStats = await Delivery.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    const total = await Delivery.countDocuments();
    const delivered = await Delivery.countDocuments({ status: 'delivered' });

    res.json({
      success: true,
      data: {
        byStatus: stats,
        byPriority: priorityStats,
        total,
        successRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err });
  }
};
