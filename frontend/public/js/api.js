const BASE = '/api';
async function request(url, options) {
    const res = await fetch(`${BASE}${url}`, {
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        ...options,
    });
    const json = await res.json();
    if (!res.ok)
        throw new Error(json.message || 'Request failed');
    return json;
}
// ── Dashboard ────────────────────────────────────────────────
export const getDashboard = () => request('/dashboard');
// ── Deliveries ───────────────────────────────────────────────
export const getDeliveries = (params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/deliveries${qs}`);
};
export const getDelivery = (id) => request(`/deliveries/${id}`);
export const createDelivery = (body) => request('/deliveries', { method: 'POST', body: JSON.stringify(body) });
export const updateDelivery = (id, body) => request(`/deliveries/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteDelivery = (id) => request(`/deliveries/${id}`, { method: 'DELETE' });
export const getDeliveryStats = () => request('/deliveries/stats');
// ── Drivers ──────────────────────────────────────────────────
export const getDrivers = (params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/drivers${qs}`);
};
export const getDriver = (id) => request(`/drivers/${id}`);
export const createDriver = (body) => request('/drivers', { method: 'POST', body: JSON.stringify(body) });
export const updateDriver = (id, body) => request(`/drivers/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteDriver = (id) => request(`/drivers/${id}`, { method: 'DELETE' });
// ── Routes ───────────────────────────────────────────────────
export const getRoutes = (params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/routes${qs}`);
};
export const getRoute = (id) => request(`/routes/${id}`);
export const optimizeRoute = (body) => request('/routes/optimize', { method: 'POST', body: JSON.stringify(body) });
export const updateRoute = (id, body) => request(`/routes/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteRoute = (id) => request(`/routes/${id}`, { method: 'DELETE' });
//# sourceMappingURL=api.js.map