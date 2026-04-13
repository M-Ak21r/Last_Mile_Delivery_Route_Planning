// app.ts — main entry point and SPA router
import { renderDashboard } from './components/dashboard.js';
import { renderDeliveries } from './components/deliveries.js';
import { renderDrivers } from './components/drivers.js';
import { renderRoutes } from './components/routes.js';

type Page = 'dashboard' | 'deliveries' | 'drivers' | 'routes';

const pages: Record<Page, (el: HTMLElement) => Promise<void>> = {
  dashboard:  renderDashboard,
  deliveries: renderDeliveries,
  drivers:    renderDrivers,
  routes:     renderRoutes,
};

let currentPage: Page = 'dashboard';
const mainContent = document.getElementById('main-content') as HTMLElement;

async function navigate(page: Page): Promise<void> {
  currentPage = page;

  // Update nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', (el as HTMLElement).dataset.page === page);
  });

  // Render page
  await pages[page](mainContent);
}

// Expose globally for inline onclick
(window as unknown as Record<string, unknown>)['navigateTo'] = navigate;

// Navigation clicks
document.querySelectorAll('.nav-item[data-page]').forEach(el => {
  el.addEventListener('click', () => navigate((el as HTMLElement).dataset.page as Page));
});

// Live clock
function updateClock(): void {
  const el = document.getElementById('topbar-clock');
  if (el) {
    el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}
setInterval(updateClock, 1000);
updateClock();

// Boot
navigate('dashboard');
