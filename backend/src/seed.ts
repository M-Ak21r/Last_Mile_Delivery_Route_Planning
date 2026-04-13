import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Driver from './models/Driver';
import Delivery from './models/Delivery';
import Route from './models/Route';
import { v4 as uuidv4 } from 'uuid';
import { optimizeRoute } from './services/routeOptimizer';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lastmile';

const DEPOT = { lat: 28.6139, lng: 77.209, address: 'Delivery Center HQ, New Delhi' };

const driversData = [
  { name: 'Rahul Sharma', phone: '9876543210', email: 'rahul@lastmile.in', vehicleType: 'van', vehicleNumber: 'DL-01-AB-1234', capacityKg: 500, status: 'available', rating: 4.8, totalDeliveries: 342 },
  { name: 'Priya Verma', phone: '9876543211', email: 'priya@lastmile.in', vehicleType: 'bike', vehicleNumber: 'DL-02-CD-5678', capacityKg: 30, status: 'available', rating: 4.9, totalDeliveries: 215 },
  { name: 'Arjun Singh', phone: '9876543212', email: 'arjun@lastmile.in', vehicleType: 'scooter', vehicleNumber: 'DL-03-EF-9012', capacityKg: 50, status: 'on_route', rating: 4.6, totalDeliveries: 178 },
  { name: 'Neha Gupta', phone: '9876543213', email: 'neha@lastmile.in', vehicleType: 'truck', vehicleNumber: 'DL-04-GH-3456', capacityKg: 2000, status: 'available', rating: 4.7, totalDeliveries: 89 },
  { name: 'Vikram Patel', phone: '9876543214', email: 'vikram@lastmile.in', vehicleType: 'van', vehicleNumber: 'DL-05-IJ-7890', capacityKg: 500, status: 'off_duty', rating: 4.4, totalDeliveries: 267 },
];

const deliveriesData = [
  { customerName: 'Anita Reddy', customerPhone: '9811001001', address: 'Connaught Place, New Delhi', coordinates: { lat: 28.6315, lng: 77.2167 }, weightKg: 2.5, priority: 'high', status: 'pending', codAmount: 1299, deliveryWindow: { start: '10:00', end: '13:00' } },
  { customerName: 'Suresh Kumar', customerPhone: '9811001002', address: 'Karol Bagh, New Delhi', coordinates: { lat: 28.6517, lng: 77.1900 }, weightKg: 5.0, priority: 'medium', status: 'pending', codAmount: 0, deliveryWindow: { start: '09:00', end: '18:00' } },
  { customerName: 'Meera Joshi', customerPhone: '9811001003', address: 'Lajpat Nagar, New Delhi', coordinates: { lat: 28.5700, lng: 77.2432 }, weightKg: 1.2, priority: 'urgent', status: 'pending', codAmount: 2499, deliveryWindow: { start: '09:00', end: '12:00' } },
  { customerName: 'Deepak Malhotra', customerPhone: '9811001004', address: 'Dwarka, New Delhi', coordinates: { lat: 28.5921, lng: 77.0460 }, weightKg: 12.0, priority: 'low', status: 'delivered', codAmount: 0, deliveryWindow: { start: '14:00', end: '18:00' } },
  { customerName: 'Sonia Kapoor', customerPhone: '9811001005', address: 'Rohini, New Delhi', coordinates: { lat: 28.7384, lng: 77.0671 }, weightKg: 3.5, priority: 'medium', status: 'in_transit', codAmount: 899, deliveryWindow: { start: '11:00', end: '14:00' } },
  { customerName: 'Amit Trivedi', customerPhone: '9811001006', address: 'Saket, New Delhi', coordinates: { lat: 28.5274, lng: 77.2062 }, weightKg: 8.0, priority: 'high', status: 'pending', codAmount: 3200, deliveryWindow: { start: '10:00', end: '15:00' } },
  { customerName: 'Kavya Nair', customerPhone: '9811001007', address: 'Janakpuri, New Delhi', coordinates: { lat: 28.6288, lng: 77.0820 }, weightKg: 2.0, priority: 'medium', status: 'pending', codAmount: 599, deliveryWindow: { start: '09:00', end: '18:00' } },
  { customerName: 'Rajan Mehta', customerPhone: '9811001008', address: 'Vasant Kunj, New Delhi', coordinates: { lat: 28.5231, lng: 77.1584 }, weightKg: 6.5, priority: 'high', status: 'assigned', codAmount: 0, deliveryWindow: { start: '13:00', end: '17:00' } },
  { customerName: 'Pooja Agarwal', customerPhone: '9811001009', address: 'Mayur Vihar, New Delhi', coordinates: { lat: 28.6112, lng: 77.2947 }, weightKg: 1.5, priority: 'low', status: 'delivered', codAmount: 1100, deliveryWindow: { start: '09:00', end: '18:00' } },
  { customerName: 'Harish Pillai', customerPhone: '9811001010', address: 'Greater Kailash, New Delhi', coordinates: { lat: 28.5465, lng: 77.2432 }, weightKg: 4.0, priority: 'urgent', status: 'failed', codAmount: 4500, deliveryWindow: { start: '09:00', end: '11:00' }, failureReason: 'Customer not available' },
  { customerName: 'Ritu Bhatt', customerPhone: '9811001011', address: 'Pitampura, New Delhi', coordinates: { lat: 28.7011, lng: 77.1322 }, weightKg: 2.8, priority: 'medium', status: 'pending', codAmount: 799, deliveryWindow: { start: '09:00', end: '18:00' } },
  { customerName: 'Gaurav Saxena', customerPhone: '9811001012', address: 'Preet Vihar, New Delhi', coordinates: { lat: 28.6463, lng: 77.2965 }, weightKg: 9.0, priority: 'high', status: 'pending', codAmount: 0, deliveryWindow: { start: '10:00', end: '16:00' } },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([Driver.deleteMany({}), Delivery.deleteMany({}), Route.deleteMany({})]);
    console.log('Cleared existing data');

    // Insert drivers
    const drivers = await Driver.insertMany(driversData);
    console.log(`Inserted ${drivers.length} drivers`);

    // Insert deliveries with order IDs
    const deliveriesWithIds = deliveriesData.map((d) => ({
      ...d,
      orderId: `ORD-${uuidv4().slice(0, 8).toUpperCase()}`,
    }));
    const deliveries = await Delivery.insertMany(deliveriesWithIds);
    console.log(`Inserted ${deliveries.length} deliveries`);

    // Create a sample optimized route
    const pendingDeliveries = deliveries.filter((d) => d.status === 'pending').slice(0, 5);
    const result = optimizeRoute(DEPOT, pendingDeliveries as unknown as import('./models/Delivery').IDelivery[]);

    const route = new Route({
      routeId: `RT-${uuidv4().slice(0, 8).toUpperCase()}`,
      driver: drivers[0]._id,
      stops: result.stops.map((s) => ({
        delivery: s.deliveryId,
        sequence: s.sequence,
        estimatedArrival: s.estimatedArrival,
        distanceFromPrev: s.distanceFromPrev,
        status: 'pending',
      })),
      status: 'planned',
      totalDistanceKm: result.totalDistanceKm,
      estimatedDurationMin: result.estimatedDurationMin,
      startLocation: DEPOT,
      endLocation: DEPOT,
      plannedDate: new Date(),
      optimizationScore: result.optimizationScore,
      notes: 'Auto-generated seed route',
    });

    await route.save();
    console.log('Created sample route');

    console.log('\n✅ Database seeded successfully!');
    console.log(`   Drivers: ${drivers.length}`);
    console.log(`   Deliveries: ${deliveries.length}`);
    console.log(`   Routes: 1`);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
