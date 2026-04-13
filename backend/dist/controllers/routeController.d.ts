import { Request, Response } from 'express';
export declare const getAllRoutes: (req: Request, res: Response) => Promise<void>;
export declare const getRoute: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const optimizeAndCreateRoute: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateRouteStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteRoute: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getDashboardStats: (_req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=routeController.d.ts.map