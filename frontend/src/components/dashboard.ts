// components/dashboard.ts
import { getDashboard } from '../api.js';
import { badge, formatDate, timeSince, scoreBar, loading, showToast } from '../utils/ui.js';
import type { Route, Driver } from '../types/index.js';

export async function renderDashboard(container: HTMLElement): Promise<void> {
  loading(container);
  try {
    const res = await getDashboard();
    const d = res.data;

    const statusMap: Record<string, number> = {};
    d.deliveryStatusBreakdown.forEach(s => { statusMap[s._id] = s.count; });

    const successRate = d.totalDeliveries > 0
      ? Math.round(((statusMap['delivered'] || 0) / d.totalDeliveries) * 100)
      : 0;

    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-eyebrow">Operations Center</div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Live snapshot of your delivery operations</p>
        </div>
        <button class="btn btn-primary" id="dash-refresh">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Refresh
        </button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          </div>
          <div class="stat-value">${d.totalDeliveries}</div>
          <div class="stat-label">Total Deliveries</div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="stat-value">${d.deliveredToday}</div>
          <div class="stat-label">Delivered Today</div>
          <div class="stat-delta">↑ ${successRate}% success rate</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="stat-value">${d.pendingDeliveries}</div>
          <div class="stat-label">Pending Deliveries</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-icon">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 17l2-10h14l2 10H3z"/><path d="M9 17V9"/><path d="M15 17V9"/></svg>
          </div>
          <div class="stat-value">${d.activeRoutes}</div>
          <div class="stat-label">Active Routes</div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div class="stat-value">${d.availableDrivers}</div>
          <div class="stat-label">Available Drivers</div>
        </div>
        <div class="stat-card purple">
          <div class="stat-icon">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
          </div>
          <div class="stat-value">${d.totalRoutes}</div>
          <div class="stat-label">Total Routes</div>
        </div>
      </div>

      <div class="dashboard-grid">
        <!-- Status Breakdown -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Delivery Status Breakdown</span>
          </div>
          <div id="status-chart">
            ${renderStatusBreakdown(statusMap, d.totalDeliveries)}
          </div>
        </div>

        <!-- Route Efficiency -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Route Efficiency Metrics</span>
          </div>
          ${renderEfficiency(d.routeEfficiency)}
        </div>

        <!-- Recent Routes -->
        <div class="card span-2">
          <div class="card-header">
            <span class="card-title">Recent Routes</span>
            <button class="btn btn-ghost btn-sm" onclick="window.navigateTo('routes')">View all →</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Route ID</th>
                <th>Driver</th>
                <th>Stops</th>
                <th>Distance</th>
                <th>Status</th>
                <th>Opt. Score</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              ${d.recentRoutes.length === 0
                ? `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">No routes yet</td></tr>`
                : d.recentRoutes.map(r => renderRouteRow(r)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('dash-refresh')?.addEventListener('click', () => renderDashboard(container));
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p style="color:var(--red)">Failed to load dashboard. Is the server running?</p></div>`;
    showToast('Failed to load dashboard', 'error');
  }
}

function renderStatusBreakdown(map: Record<string, number>, total: number): string {
  const statuses = ['pending', 'assigned', 'in_transit', 'delivered', 'failed', 'returned'];
  const colors: Record<string, string> = {
    pending: 'var(--amber)', assigned: 'var(--blue)', in_transit: 'var(--purple)',
    delivered: 'var(--green)', failed: 'var(--red)', returned: '#ef4444'
  };
  return statuses.map(s => {
    const count = map[s] || 0;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return `
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.8rem">
          <span style="color:var(--text-secondary);text-transform:capitalize">${s.replace('_', ' ')}</span>
          <span style="font-family:var(--font-mono);color:var(--text-primary)">${count} <span style="color:var(--text-muted)">(${pct}%)</span></span>
        </div>
        <div class="progress">
          <div class="progress-fill" style="width:${pct}%;background:${colors[s]}"></div>
        </div>
      </div>`;
  }).join('');
}

function renderEfficiency(eff: { avgScore?: number; avgDistance?: number; avgDuration?: number }): string {
  if (!eff || !eff.avgScore) {
    return `<p style="color:var(--text-muted);font-size:0.82rem;text-align:center;padding:24px">No completed routes yet</p>`;
  }
  const score = Math.round(eff.avgScore || 0);
  const dist = (eff.avgDistance || 0).toFixed(1);
  const dur = Math.round(eff.avgDuration || 0);
  return `
    <div style="display:grid;gap:16px">
      <div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:6px;font-family:var(--font-mono)">AVG OPTIMIZATION SCORE</div>
        ${scoreBar(score)}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px;text-align:center">
          <div style="font-family:var(--font-mono);font-size:1.4rem;color:var(--amber)">${dist}</div>
          <div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px">Avg km/route</div>
        </div>
        <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px;text-align:center">
          <div style="font-family:var(--font-mono);font-size:1.4rem;color:var(--blue)">${dur}</div>
          <div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px">Avg min/route</div>
        </div>
      </div>
    </div>`;
}

function renderRouteRow(r: Route): string {
  const driver = r.driver as Driver;
  return `<tr>
    <td class="td-mono">${r.routeId}</td>
    <td>
      <div class="driver-cell">
        <div class="driver-avatar">${driver?.name?.split(' ').map((w:string) => w[0]).join('').slice(0,2).toUpperCase() || 'NA'}</div>
        <span>${driver?.name || '—'}</span>
      </div>
    </td>
    <td class="td-mono">${r.stops.length}</td>
    <td class="td-mono">${r.totalDistanceKm} km</td>
    <td>${badge(r.status)}</td>
    <td>${scoreBar(r.optimizationScore)}</td>
    <td class="td-dimmed">${timeSince(r.createdAt)}</td>
  </tr>`;
}
