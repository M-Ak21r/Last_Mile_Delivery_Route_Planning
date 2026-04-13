// app.ts — main entry point and SPA router
import { renderDashboard } from './components/dashboard.js';
import { renderDeliveries } from './components/deliveries.js';
import { renderDrivers } from './components/drivers.js';
import { renderRoutes } from './components/routes.js';
const pages = {
    dashboard: renderDashboard,
    deliveries: renderDeliveries,
    drivers: renderDrivers,
    routes: renderRoutes,
};
let currentPage = 'dashboard';
const mainContent = document.getElementById('main-content');
async function navigate(page) {
    currentPage = page;
    // Update nav
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    // Render page
    await pages[page](mainContent);
}
// Expose globally for inline onclick
window['navigateTo'] = navigate;
// Navigation clicks
document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.page));
});
// Live clock
function updateClock() {
    const el = document.getElementById('topbar-clock');
    if (el) {
        el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
}
setInterval(updateClock, 1000);
updateClock();
// Boot
navigate('dashboard');
//# sourceMappingURL=app.js.map