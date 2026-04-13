// utils/ui.ts — reusable UI helpers

export function badge(value: string): string {
  return `<span class="badge badge-${value}">${value.replace('_', ' ')}</span>`;
}

export function vehicleBadge(type: string): string {
  const icons: Record<string, string> = { bike: '🚲', scooter: '🛵', van: '🚐', truck: '🚛' };
  return `<span class="badge badge-${type}">${icons[type] ?? ''} ${type}</span>`;
}

export function driverAvatar(name: string): string {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return `<div class="driver-avatar">${initials}</div>`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function scoreBar(score: number): string {
  const color = score >= 85 ? 'var(--green)' : score >= 65 ? 'var(--amber)' : 'var(--red)';
  return `<div class="score-ring">
    <span style="font-family:var(--font-mono);font-size:0.75rem;color:${color}">${score}</span>
    <div class="score-bar"><div class="score-fill" style="width:${score}%;background:${color}"></div></div>
  </div>`;
}

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const container = document.getElementById('toast-container')!;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons: Record<string, string> = {
    success: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
    error:   '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    info:    '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>',
  };
  el.innerHTML = `${icons[type]}<span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(100%)'; el.style.transition = '0.3s'; setTimeout(() => el.remove(), 300); }, 3500);
}

export function loading(container: HTMLElement): void {
  container.innerHTML = `<div class="loading-overlay"><div class="spinner"></div></div>`;
}

export function emptyState(icon: string, title: string, desc: string): string {
  return `<div class="empty-state">${icon}<h3>${title}</h3><p>${desc}</p></div>`;
}

export function confirm(message: string): Promise<boolean> {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `
      <div class="modal" style="max-width:360px">
        <div class="modal-header"><span class="modal-title">Confirm Action</span></div>
        <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:4px">${message}</p>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancel-btn">Cancel</button>
          <button class="btn btn-danger" id="confirm-btn">Delete</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#cancel-btn')!.addEventListener('click', () => { overlay.remove(); resolve(false); });
    overlay.querySelector('#confirm-btn')!.addEventListener('click', () => { overlay.remove(); resolve(true); });
  });
}

export function openModal(id: string): void {
  document.getElementById(id)?.classList.add('open');
}
export function closeModal(id: string): void {
  document.getElementById(id)?.classList.remove('open');
}
