// components/drivers.ts
import { getDrivers, createDriver, updateDriver, deleteDriver } from '../api.js';
import { badge, vehicleBadge, driverAvatar, loading, showToast, confirm, openModal, closeModal } from '../utils/ui.js';
import type { Driver, VehicleType, DriverStatus } from '../types/index.js';

let allDrivers: Driver[] = [];

export async function renderDrivers(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-eyebrow">Fleet Management</div>
        <h1 class="page-title">Drivers</h1>
        <p class="page-subtitle">Manage your delivery fleet and driver assignments</p>
      </div>
      <button class="btn btn-primary" id="add-driver-btn">
        <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Driver
      </button>
    </div>

    <div id="driver-cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:24px">
      <div class="loading-overlay"><div class="spinner"></div></div>
    </div>

    <div class="table-container">
      <div class="table-toolbar">
        <span class="table-toolbar-title">Driver Roster</span>
        <div class="filter-bar">
          <button class="filter-chip active" data-status="">All</button>
          <button class="filter-chip" data-status="available">Available</button>
          <button class="filter-chip" data-status="on_route">On Route</button>
          <button class="filter-chip" data-status="off_duty">Off Duty</button>
        </div>
      </div>
      <div id="drivers-table"></div>
    </div>

    <!-- Modal -->
    <div class="modal-overlay" id="driver-modal">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title" id="driver-modal-title">Add Driver</span>
          <button class="btn btn-ghost btn-icon" id="close-driver-modal">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div id="driver-modal-body"></div>
      </div>
    </div>
  `;

  await loadDrivers();
  bindDriverEvents(container);
}

async function loadDrivers(statusFilter?: string): Promise<void> {
  const cards = document.getElementById('driver-cards')!;
  const tableDiv = document.getElementById('drivers-table')!;
  cards.innerHTML = `<div class="loading-overlay"><div class="spinner"></div></div>`;

  try {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    const res = await getDrivers(params);
    allDrivers = res.data;
    renderDriverCards(allDrivers);
    renderDriverTable(allDrivers);
  } catch {
    showToast('Failed to load drivers', 'error');
    cards.innerHTML = `<p style="color:var(--red);padding:24px">Failed to load</p>`;
    tableDiv.innerHTML = '';
  }
}

function renderDriverCards(drivers: Driver[]): void {
  const cards = document.getElementById('driver-cards')!;
  if (!drivers.length) {
    cards.innerHTML = `<p style="color:var(--text-muted);padding:24px">No drivers found.</p>`;
    return;
  }
  const vehicleIcons: Record<string, string> = { bike: '🚲', scooter: '🛵', van: '🚐', truck: '🚛' };
  cards.innerHTML = drivers.map(d => `
    <div class="card" style="cursor:default">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        ${driverAvatar(d.name)}
        <div>
          <div style="font-weight:600">${d.name}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">${d.email}</div>
        </div>
        <div style="margin-left:auto">${badge(d.status)}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.78rem;margin-bottom:12px">
        <div>
          <div style="color:var(--text-muted);margin-bottom:2px">Vehicle</div>
          <div>${vehicleIcons[d.vehicleType]} ${d.vehicleType} · ${d.vehicleNumber}</div>
        </div>
        <div>
          <div style="color:var(--text-muted);margin-bottom:2px">Capacity</div>
          <div style="font-family:var(--font-mono)">${d.capacityKg} kg</div>
        </div>
        <div>
          <div style="color:var(--text-muted);margin-bottom:2px">Deliveries</div>
          <div style="font-family:var(--font-mono)">${d.totalDeliveries}</div>
        </div>
        <div>
          <div style="color:var(--text-muted);margin-bottom:2px">Rating</div>
          <div style="color:var(--amber)">★ ${d.rating.toFixed(1)}</div>
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-secondary btn-sm edit-driver-btn" data-id="${d._id}" style="flex:1">Edit</button>
        <button class="btn btn-danger btn-sm delete-driver-btn" data-id="${d._id}">✕</button>
      </div>
    </div>`).join('');
}

function renderDriverTable(drivers: Driver[]): void {
  const tableDiv = document.getElementById('drivers-table')!;
  if (!drivers.length) {
    tableDiv.innerHTML = '';
    return;
  }
  tableDiv.innerHTML = `<table>
    <thead>
      <tr>
        <th>Driver</th>
        <th>Phone</th>
        <th>Vehicle</th>
        <th>Reg No.</th>
        <th>Capacity</th>
        <th>Status</th>
        <th>Rating</th>
        <th>Deliveries</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      ${drivers.map(d => `
        <tr>
          <td>
            <div class="driver-cell">
              ${driverAvatar(d.name)}
              <div>
                <div style="font-weight:500">${d.name}</div>
                <div style="font-size:0.72rem;color:var(--text-muted)">${d.email}</div>
              </div>
            </div>
          </td>
          <td class="td-mono">${d.phone}</td>
          <td>${vehicleBadge(d.vehicleType)}</td>
          <td class="td-mono">${d.vehicleNumber}</td>
          <td class="td-mono">${d.capacityKg} kg</td>
          <td>${badge(d.status)}</td>
          <td style="color:var(--amber)">★ ${d.rating.toFixed(1)}</td>
          <td class="td-mono">${d.totalDeliveries}</td>
          <td>
            <div class="row-actions">
              <button class="btn btn-ghost btn-icon btn-sm edit-driver-btn" data-id="${d._id}" title="Edit">
                <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-ghost btn-icon btn-sm delete-driver-btn" data-id="${d._id}" style="color:var(--red)" title="Delete">
                <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              </button>
            </div>
          </td>
        </tr>`).join('')}
    </tbody>
  </table>`;
}

function bindDriverEvents(container: HTMLElement): void {
  container.querySelector('#add-driver-btn')?.addEventListener('click', () => openDriverForm());
  container.querySelector('#close-driver-modal')?.addEventListener('click', () => closeModal('driver-modal'));

  container.querySelector('.table-toolbar')?.addEventListener('click', (e) => {
    const chip = (e.target as HTMLElement).closest('.filter-chip') as HTMLElement;
    if (!chip) return;
    container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    loadDrivers(chip.dataset.status || undefined);
  });

  container.addEventListener('click', async (e) => {
    const editBtn = (e.target as HTMLElement).closest('.edit-driver-btn') as HTMLElement;
    const deleteBtn = (e.target as HTMLElement).closest('.delete-driver-btn') as HTMLElement;
    if (editBtn) {
      const driver = allDrivers.find(d => d._id === editBtn.dataset.id);
      if (driver) openDriverForm(driver);
    }
    if (deleteBtn) {
      const ok = await confirm('Delete this driver?');
      if (!ok) return;
      try {
        await deleteDriver(deleteBtn.dataset.id!);
        showToast('Driver deleted', 'success');
        loadDrivers();
      } catch { showToast('Delete failed', 'error'); }
    }
  });
}

function openDriverForm(driver?: Driver): void {
  const isEdit = !!driver;
  document.getElementById('driver-modal-title')!.textContent = isEdit ? 'Edit Driver' : 'Add Driver';
  document.getElementById('driver-modal-body')!.innerHTML = `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Full Name *</label>
        <input class="form-input" id="df-name" value="${driver?.name || ''}" placeholder="Driver name">
      </div>
      <div class="form-group">
        <label class="form-label">Phone *</label>
        <input class="form-input" id="df-phone" value="${driver?.phone || ''}" placeholder="Mobile">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Email *</label>
      <input class="form-input" id="df-email" type="email" value="${driver?.email || ''}" placeholder="driver@example.com">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Vehicle Type *</label>
        <select class="form-select" id="df-vtype">
          ${(['bike','scooter','van','truck'] as VehicleType[]).map(v =>
            `<option value="${v}" ${driver?.vehicleType === v ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Vehicle Number *</label>
        <input class="form-input" id="df-vnum" value="${driver?.vehicleNumber || ''}" placeholder="DL-01-AB-1234">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Capacity (kg) *</label>
        <input class="form-input" id="df-cap" type="number" value="${driver?.capacityKg || ''}" placeholder="500">
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="df-status">
          ${(['available','on_route','off_duty','break'] as DriverStatus[]).map(s =>
            `<option value="${s}" ${driver?.status === s ? 'selected' : ''}>${s.replace('_',' ')}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="cancel-driver-form">Cancel</button>
      <button class="btn btn-primary" id="save-driver-btn">${isEdit ? 'Save Changes' : 'Add Driver'}</button>
    </div>
  `;

  openModal('driver-modal');

  document.getElementById('cancel-driver-form')?.addEventListener('click', () => closeModal('driver-modal'));
  document.getElementById('save-driver-btn')?.addEventListener('click', async () => {
    const body = {
      name:          (document.getElementById('df-name') as HTMLInputElement).value,
      phone:         (document.getElementById('df-phone') as HTMLInputElement).value,
      email:         (document.getElementById('df-email') as HTMLInputElement).value,
      vehicleType:   (document.getElementById('df-vtype') as HTMLSelectElement).value as VehicleType,
      vehicleNumber: (document.getElementById('df-vnum') as HTMLInputElement).value,
      capacityKg:    parseFloat((document.getElementById('df-cap') as HTMLInputElement).value),
      status:        (document.getElementById('df-status') as HTMLSelectElement).value as DriverStatus,
    };
    try {
      if (isEdit) { await updateDriver(driver!._id, body); showToast('Driver updated', 'success'); }
      else        { await createDriver(body); showToast('Driver added', 'success'); }
      closeModal('driver-modal');
      loadDrivers();
    } catch (err: unknown) { showToast((err as Error).message || 'Save failed', 'error'); }
  });
}
