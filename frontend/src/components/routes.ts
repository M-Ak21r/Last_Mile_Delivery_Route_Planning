// components/routes.ts
import { getRoutes, getDrivers, getDeliveries, optimizeRoute, updateRoute, deleteRoute } from '../api.js';
import { badge, driverAvatar, scoreBar, loading, showToast, confirm, openModal, closeModal } from '../utils/ui.js';
import type { Route, Driver, Delivery } from '../types/index.js';

let allRoutes: Route[] = [];

export async function renderRoutes(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-eyebrow">Route Planner</div>
        <h1 class="page-title">Routes</h1>
        <p class="page-subtitle">Plan, optimize and manage delivery routes</p>
      </div>
      <button class="btn btn-primary" id="new-route-btn">
        <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        Plan New Route
      </button>
    </div>

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

    <!-- Plan Route Modal -->
    <div class="modal-overlay" id="plan-route-modal">
      <div class="modal" style="max-width:620px">
        <div class="modal-header">
          <span class="modal-title">Plan & Optimize Route</span>
          <button class="btn btn-ghost btn-icon" id="close-plan-modal">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div id="plan-modal-body"></div>
      </div>
    </div>
  `;

  await loadRoutes();
  bindRouteEvents(container);
}

async function loadRoutes(statusFilter?: string): Promise<void> {
  const tableDiv = document.getElementById('routes-table')!;
  tableDiv.innerHTML = `<div class="loading-overlay"><div class="spinner"></div></div>`;
  try {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    const res = await getRoutes(params);
    allRoutes = res.data;
    renderRouteTable(allRoutes);
  } catch {
    showToast('Failed to load routes', 'error');
    tableDiv.innerHTML = `<p style="color:var(--red);padding:24px">Failed to load routes</p>`;
  }
}

function renderRouteTable(routes: Route[]): void {
  const tableDiv = document.getElementById('routes-table')!;
  if (!routes.length) {
    tableDiv.innerHTML = `<div class="empty-state">
      <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      <h3>No routes yet</h3>
      <p>Click "Plan New Route" to create an optimized delivery route.</p>
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
        const driver = r.driver as Driver;
        return `<tr>
          <td class="td-mono">${r.routeId}</td>
          <td>
            <div class="driver-cell">
              ${driverAvatar(driver?.name || '??')}
              <div>
                <div style="font-weight:500">${driver?.name || '—'}</div>
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

function bindRouteEvents(container: HTMLElement): void {
  container.querySelector('#new-route-btn')?.addEventListener('click', () => openPlanRouteModal());
  container.querySelector('#close-plan-modal')?.addEventListener('click', () => closeModal('plan-route-modal'));

  container.querySelector('.table-toolbar')?.addEventListener('click', (e) => {
    const chip = (e.target as HTMLElement).closest('.filter-chip') as HTMLElement;
    if (!chip) return;
    container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    loadRoutes(chip.dataset.status || undefined);
  });

  container.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const viewBtn    = target.closest('.view-route-btn') as HTMLElement;
    const startBtn   = target.closest('.start-route-btn') as HTMLElement;
    const completeBtn= target.closest('.complete-route-btn') as HTMLElement;
    const deleteBtn  = target.closest('.delete-route-btn') as HTMLElement;

    if (viewBtn)     showRouteDetail(viewBtn.dataset.id!);
    if (startBtn)    await changeRouteStatus(startBtn.dataset.id!, 'active');
    if (completeBtn) await changeRouteStatus(completeBtn.dataset.id!, 'completed');
    if (deleteBtn) {
      const ok = await confirm('Delete this route? Deliveries will be unassigned.');
      if (!ok) return;
      try {
        await deleteRoute(deleteBtn.dataset.id!);
        showToast('Route deleted', 'success');
        loadRoutes();
      } catch { showToast('Delete failed', 'error'); }
    }
  });
}

async function changeRouteStatus(id: string, status: string): Promise<void> {
  try {
    await updateRoute(id, { status });
    showToast(`Route marked as ${status}`, 'success');
    loadRoutes();
    document.getElementById('route-detail-panel')!.style.display = 'none';
  } catch { showToast('Status update failed', 'error'); }
}

async function showRouteDetail(id: string): Promise<void> {
  const panel = document.getElementById('route-detail-panel')!;
  panel.style.display = 'block';
  panel.innerHTML = `<div class="card"><div class="loading-overlay"><div class="spinner"></div></div></div>`;
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const { getRoute } = await import('../api.js');
    const res = await getRoute(id);
    const r = res.data;
    const driver = r.driver as Driver;

    panel.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--amber)">${r.routeId}</div>
            <div style="font-size:1.1rem;font-weight:600;margin-top:2px">Route Detail</div>
          </div>
          <button class="btn btn-ghost btn-sm" id="close-detail">✕ Close</button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:20px;padding:16px;background:var(--bg-elevated);border-radius:var(--radius-md)">
          <div>
            <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:2px">Driver</div>
            <div class="driver-cell">${driverAvatar(driver?.name || '??')}<span style="font-weight:500">${driver?.name || '—'}</span></div>
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
              <!-- Depot Start -->
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
                const del = stop.delivery as Delivery;
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
                    <div class="stop-address">${del?.address || '—'}</div>
                    <div class="stop-meta">
                      <span>+${stop.distanceFromPrev} km</span>
                      ${del?.priority ? `<span>${badge(del.priority)}</span>` : ''}
                      ${del?.orderId ? `<span style="font-family:var(--font-mono)">${del.orderId}</span>` : ''}
                    </div>
                  </div>
                </div>`;
              }).join('')}
              <!-- Return to Depot -->
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
                <span style="font-family:var(--font-mono)">${new Date(r.startedAt).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'})}</span>
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
  } catch {
    showToast('Failed to load route detail', 'error');
    panel.style.display = 'none';
  }
}

async function openPlanRouteModal(): Promise<void> {
  const body = document.getElementById('plan-modal-body')!;
  body.innerHTML = `<div class="loading-overlay"><div class="spinner"></div></div>`;
  openModal('plan-route-modal');

  try {
    const [driversRes, deliveriesRes] = await Promise.all([
      getDrivers({ status: 'available' }),
      getDeliveries({ status: 'pending' }),
    ]);

    const drivers = driversRes.data;
    const deliveries = deliveriesRes.data;

    if (!drivers.length) {
      body.innerHTML = `<p style="color:var(--red);padding:16px">No available drivers. All drivers are busy or off duty.</p>`;
      return;
    }
    if (!deliveries.length) {
      body.innerHTML = `<p style="color:var(--amber);padding:16px">No pending deliveries to assign.</p>`;
      return;
    }

    body.innerHTML = `
      <div class="form-group">
        <label class="form-label">Select Driver *</label>
        <select class="form-select" id="pm-driver">
          <option value="">— Choose available driver —</option>
          ${drivers.map(d => `<option value="${d._id}" data-cap="${d.capacityKg}">${d.name} · ${d.vehicleType} · ${d.capacityKg}kg cap</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Planned Date</label>
        <input class="form-input" type="date" id="pm-date" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <label class="form-label" style="margin:0">Select Deliveries * <span id="sel-count" style="color:var(--amber)">(0 selected)</span></label>
          <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text-muted)">Total: <span id="total-weight">0</span> kg / <span id="cap-limit">—</span> kg</div>
        </div>
        <div style="max-height:260px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-elevated)">
          ${deliveries.map(d => `
            <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.1s" class="delivery-row-label">
              <input type="checkbox" class="del-checkbox" data-id="${d._id}" data-weight="${d.weightKg}" style="accent-color:var(--amber)">
              <div style="flex:1">
                <div style="display:flex;align-items:center;gap:6px">
                  <span style="font-weight:500">${d.customerName}</span>
                  ${badge(d.priority)}
                  <span style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text-muted)">${d.orderId}</span>
                </div>
                <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">${d.address}</div>
              </div>
              <span style="font-family:var(--font-mono);font-size:0.78rem;color:var(--text-secondary)">${d.weightKg}kg</span>
            </label>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <input class="form-input" id="pm-notes" placeholder="Optional route notes…">
      </div>
      <div style="background:var(--amber-glow);border:1px solid rgba(245,158,11,0.3);border-radius:var(--radius-md);padding:12px;font-size:0.8rem;color:var(--amber);margin-bottom:4px">
        ⚡ The optimizer uses a nearest-neighbor algorithm with priority weighting to minimize total distance.
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cancel-plan">Cancel</button>
        <button class="btn btn-primary" id="run-optimize-btn">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Optimize & Create Route
        </button>
      </div>
    `;

    // Weight tracker
    const updateWeightDisplay = () => {
      const checkboxes = document.querySelectorAll<HTMLInputElement>('.del-checkbox:checked');
      const total = Array.from(checkboxes).reduce((s, c) => s + parseFloat(c.dataset.weight!), 0);
      document.getElementById('sel-count')!.textContent = `(${checkboxes.length} selected)`;
      document.getElementById('total-weight')!.textContent = total.toFixed(1);
    };

    document.getElementById('pm-driver')?.addEventListener('change', (e) => {
      const sel = (e.target as HTMLSelectElement).selectedOptions[0];
      document.getElementById('cap-limit')!.textContent = sel?.dataset.cap || '—';
    });

    body.querySelectorAll('.del-checkbox').forEach(cb => cb.addEventListener('change', updateWeightDisplay));

    document.getElementById('cancel-plan')?.addEventListener('click', () => closeModal('plan-route-modal'));

    document.getElementById('run-optimize-btn')?.addEventListener('click', async () => {
      const driverId = (document.getElementById('pm-driver') as HTMLSelectElement).value;
      const plannedDate = (document.getElementById('pm-date') as HTMLInputElement).value;
      const notes = (document.getElementById('pm-notes') as HTMLInputElement).value;
      const deliveryIds = Array.from(document.querySelectorAll<HTMLInputElement>('.del-checkbox:checked')).map(c => c.dataset.id!);

      if (!driverId) { showToast('Please select a driver', 'error'); return; }
      if (!deliveryIds.length) { showToast('Select at least one delivery', 'error'); return; }

      const btn = document.getElementById('run-optimize-btn')!;
      btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> Optimizing…';
      btn.setAttribute('disabled', 'true');

      try {
        await optimizeRoute({ driverId, deliveryIds, plannedDate, notes });
        showToast('Route optimized and created!', 'success');
        closeModal('plan-route-modal');
        loadRoutes();
      } catch (err: unknown) {
        showToast((err as Error).message || 'Optimization failed', 'error');
        btn.innerHTML = '⚡ Optimize & Create Route';
        btn.removeAttribute('disabled');
      }
    });
  } catch {
    showToast('Failed to load data for route planning', 'error');
    body.innerHTML = `<p style="color:var(--red);padding:16px">Failed to load drivers or deliveries.</p>`;
  }
}
