// components/deliveries.ts
import { getDeliveries, createDelivery, updateDelivery, deleteDelivery } from '../api.js';
import { badge, formatDate, showToast, confirm, openModal, closeModal } from '../utils/ui.js';
let currentFilter = {};
let allDeliveries = [];
export async function renderDeliveries(container) {
    container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-eyebrow">Package Management</div>
        <h1 class="page-title">Deliveries</h1>
        <p class="page-subtitle">Manage and track all delivery orders</p>
      </div>
      <button class="btn btn-primary" id="add-delivery-btn">
        <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Delivery
      </button>
    </div>

    <div class="table-container">
      <div class="table-toolbar">
        <span class="table-toolbar-title">All Orders</span>
        <div class="filter-bar" id="status-filters">
          <button class="filter-chip active" data-status="">All</button>
          <button class="filter-chip" data-status="pending">Pending</button>
          <button class="filter-chip" data-status="assigned">Assigned</button>
          <button class="filter-chip" data-status="in_transit">In Transit</button>
          <button class="filter-chip" data-status="delivered">Delivered</button>
          <button class="filter-chip" data-status="failed">Failed</button>
        </div>
        <div class="filter-bar" style="margin-left:auto">
          <select class="form-select" id="priority-filter" style="width:130px">
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <div class="search-wrap">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="search-input" id="search-input" placeholder="Search orders…">
          </div>
        </div>
      </div>
      <div id="deliveries-table-body">
        <div class="loading-overlay"><div class="spinner"></div></div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div class="modal-overlay" id="delivery-modal">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title" id="modal-title">Add Delivery</span>
          <button class="btn btn-ghost btn-icon" id="close-modal">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div id="modal-form-body"></div>
      </div>
    </div>
  `;
    await loadDeliveries();
    bindDeliveryEvents(container);
}
async function loadDeliveries() {
    const tbody = document.getElementById('deliveries-table-body');
    tbody.innerHTML = `<div class="loading-overlay"><div class="spinner"></div></div>`;
    try {
        const res = await getDeliveries(currentFilter);
        allDeliveries = res.data;
        renderTable(allDeliveries);
    }
    catch {
        showToast('Failed to load deliveries', 'error');
        tbody.innerHTML = `<p style="padding:24px;color:var(--red)">Failed to load deliveries</p>`;
    }
}
function renderTable(deliveries) {
    const tbody = document.getElementById('deliveries-table-body');
    const searchVal = document.getElementById('search-input')?.value?.toLowerCase() || '';
    const filtered = searchVal
        ? deliveries.filter(d => d.orderId.toLowerCase().includes(searchVal) ||
            d.customerName.toLowerCase().includes(searchVal) ||
            d.address.toLowerCase().includes(searchVal))
        : deliveries;
    if (!filtered.length) {
        tbody.innerHTML = `<div class="empty-state">
      <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <h3>No deliveries found</h3>
      <p>Try adjusting your filters or add a new delivery.</p>
    </div>`;
        return;
    }
    tbody.innerHTML = `<table>
    <thead>
      <tr>
        <th>Order ID</th>
        <th>Customer</th>
        <th>Address</th>
        <th>Weight</th>
        <th>Priority</th>
        <th>Status</th>
        <th>COD</th>
        <th>Window</th>
        <th>Created</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      ${filtered.map(d => `
        <tr>
          <td class="td-mono">${d.orderId}</td>
          <td>
            <div style="font-weight:500">${d.customerName}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">${d.customerPhone}</div>
          </td>
          <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.8rem">${d.address}</td>
          <td class="td-mono">${d.weightKg} kg</td>
          <td>${badge(d.priority)}</td>
          <td>${badge(d.status)}</td>
          <td class="td-mono">${d.codAmount > 0 ? '₹' + d.codAmount.toLocaleString() : '—'}</td>
          <td class="td-mono" style="font-size:0.72rem">${d.deliveryWindow.start}–${d.deliveryWindow.end}</td>
          <td class="td-dimmed" style="font-size:0.78rem">${formatDate(d.createdAt)}</td>
          <td>
            <div class="row-actions">
              <button class="btn btn-ghost btn-icon btn-sm edit-btn" data-id="${d._id}" title="Edit">
                <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-ghost btn-icon btn-sm delete-btn" data-id="${d._id}" title="Delete" style="color:var(--red)">
                <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </button>
            </div>
          </td>
        </tr>`).join('')}
    </tbody>
  </table>`;
}
function bindDeliveryEvents(container) {
    container.querySelector('#add-delivery-btn')?.addEventListener('click', () => openDeliveryForm());
    container.querySelector('#close-modal')?.addEventListener('click', () => closeModal('delivery-modal'));
    container.querySelector('#status-filters')?.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip)
            return;
        container.querySelectorAll('#status-filters .filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const status = chip.dataset.status || '';
        if (status)
            currentFilter.status = status;
        else
            delete currentFilter.status;
        loadDeliveries();
    });
    container.querySelector('#priority-filter')?.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val)
            currentFilter.priority = val;
        else
            delete currentFilter.priority;
        loadDeliveries();
    });
    let searchTimer;
    container.querySelector('#search-input')?.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => renderTable(allDeliveries), 250);
    });
    container.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        if (editBtn) {
            const delivery = allDeliveries.find(d => d._id === editBtn.dataset.id);
            if (delivery)
                openDeliveryForm(delivery);
        }
        if (deleteBtn) {
            const ok = await confirm('Delete this delivery? This cannot be undone.');
            if (!ok)
                return;
            try {
                await deleteDelivery(deleteBtn.dataset.id);
                showToast('Delivery deleted', 'success');
                loadDeliveries();
            }
            catch {
                showToast('Delete failed', 'error');
            }
        }
    });
}
function openDeliveryForm(delivery) {
    const isEdit = !!delivery;
    document.getElementById('modal-title').textContent = isEdit ? 'Edit Delivery' : 'Add Delivery';
    document.getElementById('modal-form-body').innerHTML = `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Customer Name *</label>
        <input class="form-input" id="f-name" value="${delivery?.customerName || ''}" placeholder="Full name">
      </div>
      <div class="form-group">
        <label class="form-label">Phone *</label>
        <input class="form-input" id="f-phone" value="${delivery?.customerPhone || ''}" placeholder="Mobile number">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Delivery Address *</label>
      <input class="form-input" id="f-address" value="${delivery?.address || ''}" placeholder="Full delivery address">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Latitude *</label>
        <input class="form-input" id="f-lat" type="number" step="0.0001" value="${delivery?.location.coordinates[1] || ''}" placeholder="28.6139">
      </div>
      <div class="form-group">
        <label class="form-label">Longitude *</label>
        <input class="form-input" id="f-lng" type="number" step="0.0001" value="${delivery?.location.coordinates[0] || ''}" placeholder="77.2090">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Weight (kg) *</label>
        <input class="form-input" id="f-weight" type="number" step="0.1" value="${delivery?.weightKg || ''}" placeholder="2.5">
      </div>
      <div class="form-group">
        <label class="form-label">COD Amount (₹)</label>
        <input class="form-input" id="f-cod" type="number" value="${delivery?.codAmount || 0}" placeholder="0">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Priority</label>
        <select class="form-select" id="f-priority">
          ${['low', 'medium', 'high', 'urgent'].map(p => `<option value="${p}" ${delivery?.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="f-status">
          ${['PENDING_DISPATCH', 'ROUTE_OPTIMIZED', 'IN_TRANSIT', 'DELIVERED', 'FAILED_ATTEMPT'].map(s => `<option value="${s}" ${delivery?.status === s ? 'selected' : ''}>${s.replace('_', ' ')}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Window Start</label>
        <input class="form-input" id="f-wstart" type="time" value="${delivery?.deliveryWindow.start || '09:00'}">
      </div>
      <div class="form-group">
        <label class="form-label">Window End</label>
        <input class="form-input" id="f-wend" type="time" value="${delivery?.deliveryWindow.end || '18:00'}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Special Instructions</label>
      <textarea class="form-textarea" id="f-notes" rows="2" placeholder="Leave at door, fragile, etc.">${delivery?.specialInstructions || ''}</textarea>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="cancel-delivery-form">Cancel</button>
      <button class="btn btn-primary" id="save-delivery-btn">${isEdit ? 'Save Changes' : 'Add Delivery'}</button>
    </div>
  `;
    openModal('delivery-modal');
    document.getElementById('cancel-delivery-form')?.addEventListener('click', () => closeModal('delivery-modal'));
    document.getElementById('save-delivery-btn')?.addEventListener('click', async () => {
        const body = {
            customerName: document.getElementById('f-name').value,
            customerPhone: document.getElementById('f-phone').value,
            address: document.getElementById('f-address').value,
            location: {
                type: 'Point',
                coordinates: [
                    parseFloat(document.getElementById('f-lng').value),
                    parseFloat(document.getElementById('f-lat').value),
                ],
            },
            weightKg: parseFloat(document.getElementById('f-weight').value),
            codAmount: parseFloat(document.getElementById('f-cod').value) || 0,
            priority: document.getElementById('f-priority').value,
            status: document.getElementById('f-status').value,
            deliveryWindow: {
                start: document.getElementById('f-wstart').value,
                end: document.getElementById('f-wend').value,
            },
            specialInstructions: document.getElementById('f-notes').value,
        };
        try {
            if (isEdit) {
                await updateDelivery(delivery._id, body);
                showToast('Delivery updated', 'success');
            }
            else {
                await createDelivery(body);
                showToast('Delivery added', 'success');
            }
            closeModal('delivery-modal');
            loadDeliveries();
        }
        catch (err) {
            showToast(err.message || 'Save failed', 'error');
        }
    });
}
//# sourceMappingURL=deliveries.js.map