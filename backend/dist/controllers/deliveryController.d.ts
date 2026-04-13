import { Request, Response } from 'express';
export declare const getAllDeliveries: (req: Request, res: Response) => Promise<void>;
export declare const getDelivery: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createDelivery: (req: Request, res: Response) => Promise<void>;
export declare const updateDelivery: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteDelivery: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getDeliveryStats: (_req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=deliveryController.d.ts.map