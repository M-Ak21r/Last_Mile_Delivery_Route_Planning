// api.ts — centralised API client
import type { Delivery, Driver, Route, DashboardStats, ApiResponse } from './types/index.js';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json;
}

// -- Config -------------------------------------------------------------------
export const getConfig = () =>
  request<{ mapboxToken: string }>('/config');

// -- Dashboard ----------------------------------------------------------------
export const getDashboard = () =>
  request<ApiResponse<DashboardStats>>('/dashboard');

// -- Deliveries ---------------------------------------------------------------
export const getDeliveries = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<ApiResponse<Delivery[]>>(`/deliveries${qs}`);
};
export const getDelivery = (id: string) =>
  request<ApiResponse<Delivery>>(`/deliveries/${id}`);
export const createDelivery = (body: Partial<Delivery>) =>
  request<ApiResponse<Delivery>>('/deliveries', { method: 'POST', body: JSON.stringify(body) });
export const updateDelivery = (id: string, body: Partial<Delivery>) =>
  request<ApiResponse<Delivery>>(`/deliveries/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteDelivery = (id: string) =>
  request<ApiResponse<null>>(`/deliveries/${id}`, { method: 'DELETE' });
export const getDeliveryStats = () =>
  request<ApiResponse<unknown>>('/deliveries/stats');

// -- Drivers ------------------------------------------------------------------
export const getDrivers = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<ApiResponse<Driver[]>>(`/drivers${qs}`);
};
export const getDriver = (id: string) =>
  request<ApiResponse<{ driver: Driver; routes: Route[] }>>(`/drivers/${id}`);
export const createDriver = (body: Partial<Driver>) =>
  request<ApiResponse<Driver>>('/drivers', { method: 'POST', body: JSON.stringify(body) });
export const updateDriver = (id: string, body: Partial<Driver>) =>
  request<ApiResponse<Driver>>(`/drivers/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteDriver = (id: string) =>
  request<ApiResponse<null>>(`/drivers/${id}`, { method: 'DELETE' });
/** Push a GPS coordinate update for a driver (triggers driver:location WS event) */
export const updateDriverLocation = (id: string, lng: number, lat: number, address?: string) =>
  request<ApiResponse<Driver>>(`/drivers/${id}/location`, {
    method: 'PUT',
    body: JSON.stringify({ lng, lat, address }),
  });

// -- Routes -------------------------------------------------------------------
export const getRoutes = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<ApiResponse<Route[]>>(`/routes${qs}`);
};
export const getRoute = (id: string) =>
  request<ApiResponse<Route>>(`/routes/${id}`);
/** Triggers full auto-VRP across all PENDING_DISPATCH deliveries + available drivers */
export const optimizeRoute = (body: { plannedDate?: string; notes?: string } = {}) =>
  request<ApiResponse<Route[]>>('/routes/optimize', { method: 'POST', body: JSON.stringify(body) });
export const updateRoute = (id: string, body: Record<string, unknown>) =>
  request<ApiResponse<Route>>(`/routes/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteRoute = (id: string) =>
  request<ApiResponse<null>>(`/routes/${id}`, { method: 'DELETE' });
