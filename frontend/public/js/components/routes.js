import { getRoutes, getConfig, optimizeRoute, updateRoute, deleteRoute } from '../api.js';
import { badge, driverAvatar, scoreBar, showToast, confirm, openModal, closeModal } from '../utils/ui.js';
// ── Status color taxonomy for Mapbox markers ──────────────────────────────────
const STATUS_COLOR = {
    PENDING_DISPATCH: '#6b7280', // grey
    ROUTE_OPTIMIZED: '#f59e0b', // amber
    IN_TRANSIT: '#3b82f6', // blue
    DELIVERED: '#22c55e', // green
    FAILED_ATTEMPT: '#ef4444', // red
};
const DEPOT_COORDS = [77.209, 28.6139]; // [lng, lat]
// ── Module state ─────────────────────────────────────────────────────────────
let allRoutes = [];
let mapInstance = null;
/** driver._id  ->  mapboxgl.Marker for real-time tracking */
const driverMarkers = new Map();
/** routeId -> mapboxgl source/layer ids that were added */
const routeLayers = new Set();
/** socket connection (singleton per page) */
let socket = null;
// ── Entry point ───────────────────────────────────────────────────────────────
export async function renderRoutes(container) {
    container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-eyebrow">Route Planner</div>
        <h1 class="page-title">Routes</h1>
        <p class="page-subtitle">VRP-optimized multi-vehicle delivery routes</p>
      </div>
      <button class="btn btn-primary" id="new-route-btn">
        <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        Run VRP Optimization
      </button>
    </div>

    <!-- Live map -->
    <div id="route-map" style="width:100%;height:420px;border-radius:var(--radius-lg);overflow:hidden;margin-bottom:20px;background:var(--bg-elevated);border:1px solid var(--border)"></div>

    <div class="table-container">
      <div class="table-toolbar">
        <span class="table-toolbar-title">Route List</span>
        <div class="filter-bar">
          <button class="filter-chip active" data-status="">All</button>
          <button class="filter-chip" data-status="planned">Planned</button>
          <button class="filter-chip" data-status="active">Active</button>
          <button class="filter-chip" data-status="completed">Completed</button>
          <button class="filter-chip" data-status="cancelled">Cancelled</button>
        </div>
      </div>
      <div id="routes-table"><div class="loading-overlay"><div class="spinner"></div></div></div>
    </div>

    <!-- Route Detail Panel -->
    <div id="route-detail-panel" style="display:none;margin-top:16px"></div>

    <!-- VRP Modal -->
    <div class="modal-overlay" id="plan-route-modal">
      <div class="modal" style="max-width:480px">
        <div class="modal-header">
          <span class="modal-title">Run VRP Optimization</span>
          <button class="btn btn-ghost btn-icon" id="close-plan-modal">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div id="plan-modal-body"></div>
      </div>
    </div>
  `;
    await loadRoutes();
    await initMap(container);
    initSocket();
    bindRouteEvents(container);
}
// ── Map initialisation ────────────────────────────────────────────────────────
async function initMap(container) {
    const mapDiv = container.querySelector('#route-map');
    if (!mapDiv)
        return;
    let token = '';
    try {
        const cfg = await getConfig();
        token = cfg.mapboxToken;
    }
    catch {
        mapDiv.innerHTML = `<p style="color:var(--text-muted);padding:24px;text-align:center">Map unavailable — MAPBOX_ACCESS_TOKEN not configured.</p>`;
        return;
    }
    if (!token) {
        mapDiv.innerHTML = `<p style="color:var(--text-muted);padding:24px;text-align:center">Map unavailable — MAPBOX_ACCESS_TOKEN not configured.</p>`;
        return;
    }
    mapboxgl.accessToken = token;
    mapInstance = new mapboxgl.Map({
        container: mapDiv,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: DEPOT_COORDS,
        zoom: 11,
    });
    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapInstance.on('load', () => {
        // Depot marker
        new mapboxgl.Marker({ color: '#f59e0b', scale: 1.2 })
            .setLngLat(DEPOT_COORDS)
            .setPopup(new mapboxgl.Popup({ offset: 20 }).setText('Depot — Delivery Center HQ'))
            .addTo(mapInstance);
        // Render all current routes
        allRoutes.forEach(plotRoute);
    });
}
// ── Plot a route on the map ───────────────────────────────────────────────────
function plotRoute(route) {
    if (!mapInstance || !mapInstance.loaded())
        return;
    // Route polyline
    if (route.routeGeometry?.coordinates.length) {
        const srcId = `route-line-${route._id}`;
        if (!mapInstance.getSource(srcId)) {
            mapInstance.addSource(srcId, {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: { routeId: route.routeId, status: route.status },
                    geometry: route.routeGeometry,
                },
            });
            mapInstance.addLayer({
                id: srcId,
                type: 'line',
                source: srcId,
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': route.status === 'active' ? '#3b82f6' : '#f59e0b',
                    'line-width': route.status === 'active' ? 4 : 2,
                    'line-opacity': 0.85,
                    'line-dasharray': route.status === 'planned' ? [2, 2] : [1],
                },
            });
            routeLayers.add(srcId);
        }
    }
    // Delivery stop markers
    route.stops.forEach((stop) => {
        const delivery = stop.delivery;
        if (!delivery?.location?.coordinates)
            return;
        const [lng, lat] = delivery.location.coordinates;
        const color = STATUS_COLOR[delivery.status] ?? '#6b7280';
        // Small circle element for the marker
        const el = document.createElement('div');
        el.className = 'map-stop-marker';
        el.style.cssText = `
      width:22px;height:22px;border-radius:50%;
      background:${color};border:2px solid #fff;
      display:flex;align-items:center;justify-content:center;
      font-size:10px;font-weight:700;color:#fff;cursor:pointer;
    `;
        el.textContent = String(stop.sequence);
        new mapboxgl.Marker({ element: el })
            .setLngLat([lng, lat])
            .setPopup(new mapboxgl.Popup({ offset: 14 }).setHTML(`<strong>${delivery.customerName ?? ''}</strong><br>${delivery.address ?? ''}<br>
           <span style="color:${color}">${delivery.status}</span>`))
            .addTo(mapInstance);
    });
}
// ── Update an existing route line color when status changes ───────────────────
function updateRouteLineStyle(routeId, newStatus) {
    if (!mapInstance)
        return;
    const srcId = `route-line-${routeId}`;
    if (!mapInstance.getLayer(srcId))
        return;
    mapInstance.setPaintProperty(srcId, 'line-color', newStatus === 'active' ? '#3b82f6' : newStatus === 'completed' ? '#22c55e' : '#f59e0b');
    mapInstance.setPaintProperty(srcId, 'line-width', newStatus === 'active' ? 4 : 2);
}
// ── Socket.io client ──────────────────────────────────────────────────────────
function initSocket() {
    if (socket)
        return; // already connected
    try {
        socket = io(); // connects to same origin via Socket.io CDN bundle
        socket.on('connect', () => {
            const el = document.getElementById('ws-status');
            if (el) {
                el.textContent = '● LIVE';
                el.style.color = '#22c55e';
            }
        });
        socket.on('disconnect', () => {
            const el = document.getElementById('ws-status');
            if (el) {
                el.textContent = '● OFFLINE';
                el.style.color = '#ef4444';
            }
        });
        socket.on('route:started', (payload) => {
            showToast(`Route ${payload.routeId} is now IN TRANSIT`, 'success');
            updateRouteLineStyle(payload.routeId, 'active');
            loadRoutes();
        });
        socket.on('route:completed', (payload) => {
            showToast(`Route ${payload.routeId} completed`, 'success');
            updateRouteLineStyle(payload.routeId, 'completed');
            loadRoutes();
        });
        socket.on('stop:completed', (_payload) => {
            loadRoutes(); // refresh table; marker color update on next plotRoute
        });
        socket.on('driver:location', (payload) => {
            if (!mapInstance)
                return;
            const existing = driverMarkers.get(payload.driverId);
            if (existing) {
                existing.setLngLat(payload.coordinates);
            }
            else {
                const el = document.createElement('div');
                el.style.cssText = `
          width:28px;height:28px;border-radius:50%;
          background:#f59e0b;border:3px solid #fff;
          box-shadow:0 2px 8px rgba(0,0,0,.5);cursor:pointer;
        `;
                const marker = new mapboxgl.Marker({ element: el })
                    .setLngLat(payload.coordinates)
                    .setPopup(new mapboxgl.Popup({ offset: 16 }).setHTML(`<strong>Driver</strong><br>${payload.address ?? payload.coordinates.join(', ')}`))
                    .addTo(mapInstance);
                driverMarkers.set(payload.driverId, marker);
            }
        });
    }
    catch (err) {
        console.warn('[Socket] Could not connect:', err);
    }
}
// ── Data loading & table rendering ───────────────────────────────────────────
async function loadRoutes(statusFilter) {
    const tableDiv = document.getElementById('routes-table');
    tableDiv.innerHTML = `<div class="loading-overlay"><div class="spinner"></div></div>`;
    try {
        const params = {};
        if (statusFilter)
            params.status = statusFilter;
        const res = await getRoutes(params);
        allRoutes = res.data;
        renderRouteTable(allRoutes);
        // Replot routes on map after data refresh
        if (mapInstance?.loaded()) {
            allRoutes.forEach(plotRoute);
        }
    }
    catch {
        showToast('Failed to load routes', 'error');
        tableDiv.innerHTML = `<p style="color:var(--red);padding:24px">Failed to load routes</p>`;
    }
}
function renderRouteTable(routes) {
    const tableDiv = document.getElementById('routes-table');
    if (!routes.length) {
        tableDiv.innerHTML = `<div class="empty-state">
      <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      <h3>No routes yet</h3>
      <p>Click "Run VRP Optimization" to auto-assign pending deliveries.</p>
    </div>`;
        return;
    }
    tableDiv.innerHTML = `<table>
    <thead>
      <tr>
        <th>Route ID</th>
        <th>Driver</th>
        <th>Stops</th>
        <th>Distance</th>
        <th>Est. Duration</th>
        <th>Status</th>
        <th>Opt. Score</th>
        <th>Planned Date</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      ${routes.map(r => {
        const driver = r.driver;
        return `<tr>
          <td class="td-mono">${r.routeId}</td>
          <td>
            <div class="driver-cell">
              ${driverAvatar(driver?.name || '??')}
              <div>
                <div style="font-weight:500">${driver?.name || '-'}</div>
                <div style="font-size:0.72rem;color:var(--text-muted)">${driver?.vehicleType || ''}</div>
              </div>
            </div>
          </td>
          <td class="td-mono">${r.stops.length} stops</td>
          <td class="td-mono">${r.totalDistanceKm} km</td>
          <td class="td-mono">${r.estimatedDurationMin} min</td>
          <td>${badge(r.status)}</td>
          <td>${scoreBar(r.optimizationScore)}</td>
          <td class="td-dimmed" style="font-size:0.78rem">${new Date(r.plannedDate).toLocaleDateString('en-IN')}</td>
          <td>
            <div class="row-actions">
              <button class="btn btn-ghost btn-sm view-route-btn" data-id="${r._id}">View</button>
              ${r.status === 'planned' ? `<button class="btn btn-secondary btn-sm start-route-btn" data-id="${r._id}">Start</button>` : ''}
              ${r.status === 'active' ? `<button class="btn btn-primary btn-sm complete-route-btn" data-id="${r._id}">Complete</button>` : ''}
              <button class="btn btn-ghost btn-icon btn-sm delete-route-btn" data-id="${r._id}" style="color:var(--red)">
                <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('')}
    </tbody>
  </table>`;
}
// ── Event binding ─────────────────────────────────────────────────────────────
function bindRouteEvents(container) {
    container.querySelector('#new-route-btn')?.addEventListener('click', () => openVrpModal());
    container.querySelector('#close-plan-modal')?.addEventListener('click', () => closeModal('plan-route-modal'));
    container.querySelector('.table-toolbar')?.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip)
            return;
        container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        loadRoutes(chip.dataset.status || undefined);
    });
    container.addEventListener('click', async (e) => {
        const target = e.target;
        const viewBtn = target.closest('.view-route-btn');
        const startBtn = target.closest('.start-route-btn');
        const completeBtn = target.closest('.complete-route-btn');
        const deleteBtn = target.closest('.delete-route-btn');
        if (viewBtn)
            showRouteDetail(viewBtn.dataset.id);
        if (startBtn)
            await changeRouteStatus(startBtn.dataset.id, 'active');
        if (completeBtn)
            await changeRouteStatus(completeBtn.dataset.id, 'completed');
        if (deleteBtn) {
            const ok = await confirm('Delete this route? Deliveries will be unassigned.');
            if (!ok)
                return;
            try {
                await deleteRoute(deleteBtn.dataset.id);
                showToast('Route deleted', 'success');
                loadRoutes();
            }
            catch {
                showToast('Delete failed', 'error');
            }
        }
    });
}
async function changeRouteStatus(id, status) {
    try {
        await updateRoute(id, { status });
        showToast(`Route marked as ${status}`, 'success');
        loadRoutes();
        document.getElementById('route-detail-panel').style.display = 'none';
    }
    catch {
        showToast('Status update failed', 'error');
    }
}
// ── Route detail panel ────────────────────────────────────────────────────────
async function showRouteDetail(id) {
    const panel = document.getElementById('route-detail-panel');
    panel.style.display = 'block';
    panel.innerHTML = `<div class="card"><div class="loading-overlay"><div class="spinner"></div></div></div>`;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try {
        const { getRoute } = await import('../api.js');
        const res = await getRoute(id);
        const r = res.data;
        const driver = r.driver;
        panel.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--amber)">${r.routeId}</div>
            <div style="font-size:1.1rem;font-weight:600;margin-top:2px">Route Detail</div>
          </div>
          <button class="btn btn-ghost btn-sm" id="close-detail">Close</button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:20px;padding:16px;background:var(--bg-elevated);border-radius:var(--radius-md)">
          <div>
            <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:2px">Driver</div>
            <div class="driver-cell">${driverAvatar(driver?.name || '??')}<span style="font-weight:500">${driver?.name || '-'}</span></div>
          </div>
          <div>
            <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:2px">Status</div>
            ${badge(r.status)}
          </div>
          <div>
            <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:2px">Total Distance</div>
            <div style="font-family:var(--font-mono);font-size:1rem;color:var(--amber)">${r.totalDistanceKm} km</div>
          </div>
          <div>
            <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:2px">Est. Duration</div>
            <div style="font-family:var(--font-mono);font-size:1rem">${r.estimatedDurationMin} min</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div>
            <div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--text-muted);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px">Route Stops (${r.stops.length})</div>
            <div class="route-timeline">
              <div class="route-stop">
                <div class="stop-connector">
                  <div class="stop-dot depot">D</div>
                  <div class="stop-line"></div>
                </div>
                <div class="stop-content">
                  <div class="stop-header">
                    <span class="stop-name" style="color:var(--amber)">Depot / Start</span>
                    <span class="stop-time">08:30</span>
                  </div>
                  <div class="stop-address">${r.startLocation.address}</div>
                </div>
              </div>
              ${r.stops.map((stop, i) => {
            const del = stop.delivery;
            const isLast = i === r.stops.length - 1;
            return `<div class="route-stop">
                  <div class="stop-connector">
                    <div class="stop-dot ${stop.status}">${stop.sequence}</div>
                    ${!isLast ? '<div class="stop-line"></div>' : ''}
                  </div>
                  <div class="stop-content">
                    <div class="stop-header">
                      <span class="stop-name">${del?.customerName || 'Customer'}</span>
                      <span class="stop-time">${stop.estimatedArrival}</span>
                      ${badge(stop.status)}
                    </div>
                    <div class="stop-address">${del?.address || '-'}</div>
                    <div class="stop-meta">
                      <span>+${stop.distanceFromPrev} km</span>
                      ${del?.priority ? `<span>${badge(del.priority)}</span>` : ''}
                      ${del?.orderId ? `<span style="font-family:var(--font-mono)">${del.orderId}</span>` : ''}
                    </div>
                  </div>
                </div>`;
        }).join('')}
              <div class="route-stop">
                <div class="stop-connector">
                  <div class="stop-dot depot">D</div>
                </div>
                <div class="stop-content">
                  <div class="stop-header"><span class="stop-name" style="color:var(--amber)">Return to Depot</span></div>
                  <div class="stop-address">${r.endLocation.address}</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--text-muted);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px">Optimization</div>
            <div style="margin-bottom:16px">${scoreBar(r.optimizationScore)}</div>
            <div style="display:grid;gap:8px;font-size:0.82rem">
              <div style="display:flex;justify-content:space-between;padding:8px;background:var(--bg-elevated);border-radius:var(--radius-sm)">
                <span style="color:var(--text-secondary)">Planned Date</span>
                <span style="font-family:var(--font-mono)">${new Date(r.plannedDate).toLocaleDateString('en-IN')}</span>
              </div>
              ${r.startedAt ? `<div style="display:flex;justify-content:space-between;padding:8px;background:var(--bg-elevated);border-radius:var(--radius-sm)">
                <span style="color:var(--text-secondary)">Started At</span>
                <span style="font-family:var(--font-mono)">${new Date(r.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>` : ''}
              ${r.notes ? `<div style="padding:8px;background:var(--bg-elevated);border-radius:var(--radius-sm)">
                <div style="color:var(--text-muted);font-size:0.72rem;margin-bottom:4px">Notes</div>
                <div>${r.notes}</div>
              </div>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
        document.getElementById('close-detail')?.addEventListener('click', () => {
            panel.style.display = 'none';
        });
    }
    catch {
        showToast('Failed to load route detail', 'error');
        panel.style.display = 'none';
    }
}
// ── VRP optimization modal ────────────────────────────────────────────────────
function openVrpModal() {
    const body = document.getElementById('plan-modal-body');
    body.innerHTML = `
    <div class="form-group">
      <label class="form-label">Planned Date</label>
      <input class="form-input" type="date" id="pm-date" value="${new Date().toISOString().split('T')[0]}">
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <input class="form-input" id="pm-notes" placeholder="Optional route notes...">
    </div>
    <div style="background:var(--amber-glow);border:1px solid rgba(245,158,11,0.3);border-radius:var(--radius-md);padding:12px;font-size:0.8rem;color:var(--amber);margin-bottom:4px">
      The Mapbox Optimization API v1 will be called for each available driver.
      All <strong>PENDING_DISPATCH</strong> deliveries are automatically assigned
      using capacity-aware bin-packing, then routed per vehicle.
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="cancel-plan">Cancel</button>
      <button class="btn btn-primary" id="run-optimize-btn">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        Run VRP Optimization
      </button>
    </div>
  `;
    openModal('plan-route-modal');
    document.getElementById('cancel-plan')?.addEventListener('click', () => closeModal('plan-route-modal'));
    document.getElementById('run-optimize-btn')?.addEventListener('click', async () => {
        const plannedDate = document.getElementById('pm-date').value;
        const notes = document.getElementById('pm-notes').value;
        const btn = document.getElementById('run-optimize-btn');
        btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> Optimizing...';
        btn.setAttribute('disabled', 'true');
        try {
            const result = await optimizeRoute({ plannedDate, notes });
            const count = Array.isArray(result.data) ? result.data.length : 1;
            showToast(`VRP complete — ${count} route${count !== 1 ? 's' : ''} created`, 'success');
            closeModal('plan-route-modal');
            await loadRoutes();
        }
        catch (err) {
            showToast(err.message || 'Optimization failed', 'error');
            btn.innerHTML = 'Run VRP Optimization';
            btn.removeAttribute('disabled');
        }
    });
}
//# sourceMappingURL=routes.js.map