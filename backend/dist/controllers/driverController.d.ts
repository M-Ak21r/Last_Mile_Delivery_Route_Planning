import { Request, Response } from 'express';
export declare const getAllDrivers: (req: Request, res: Response) => Promise<void>;
export declare const getDriver: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createDriver: (req: Request, res: Response) => Promise<void>;
export declare const updateDriver: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteDriver: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * PUT /api/drivers/:id/location
 *
 * Accepts { lng, lat, address? } from a driver's mobile GPS.
 * Persists the GeoJSON Point and broadcasts a driver:location socket event
 * so the frontend map can move the driver marker in real-time.
 */
export declare const updateDriverLocation: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=driverController.d.ts.map