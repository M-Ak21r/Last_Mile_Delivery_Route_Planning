# 🚐 LastMile — Delivery Route Planning System

A full-stack, production-ready web application for managing last-mile delivery operations. Built with **Node.js**, **Express**, **MongoDB**, **TypeScript**, and vanilla **HTML/CSS**.

---

## 📋 Features

### 📊 Dashboard
- Live KPI cards: total deliveries, delivered today, pending, active routes, available drivers
- Delivery status breakdown with progress bars
- Route efficiency metrics (avg optimization score, avg distance/duration)
- Recent routes table with one-click navigation

### 📦 Delivery Management
- Full CRUD for delivery orders
- Filter by status (pending, assigned, in_transit, delivered, failed, returned)
- Filter by priority (urgent, high, medium, low)
- Live search across order ID, customer name, and address
- Delivery time windows, COD amounts, special instructions
- Auto-generated Order IDs (e.g. `ORD-A3F9B12C`)

### 👤 Driver Management
- Full CRUD for drivers
- Card + table dual-view
- Vehicle type support: bike, scooter, van, truck
- Capacity management (kg)
- Status tracking: available, on_route, off_duty, break
- Star ratings and delivery counts

### 🗺️ Route Planner
- **Nearest-Neighbour optimization algorithm** with priority weighting
  - Urgent deliveries are served first
  - Minimises total travel distance
  - Calculates estimated arrival times per stop
- Select available driver + pending deliveries → one click to optimize
- Capacity guard: rejects assignments over driver vehicle capacity
- Route stop timeline with sequence, ETA, and distance deltas
- Route lifecycle: Planned → Active → Completed
- Delete a route to automatically unassign deliveries back to pending

---

## 🏗️ Project Structure

```
lastmile/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── Delivery.ts        # Delivery order schema
│   │   │   ├── Driver.ts          # Driver/vehicle schema
│   │   │   └── Route.ts           # Route + stop schema
│   │   ├── controllers/
│   │   │   ├── deliveryController.ts
│   │   │   ├── driverController.ts
│   │   │   └── routeController.ts
│   │   ├── services/
│   │   │   └── routeOptimizer.ts  # Nearest-neighbour TSP solver
│   │   ├── routes/
│   │   │   └── api.ts             # All REST endpoints
│   │   ├── app.ts                 # Express app setup
│   │   ├── server.ts              # MongoDB connect + listen
│   │   └── seed.ts                # Sample data seeder
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard.ts
│   │   │   ├── deliveries.ts
│   │   │   ├── drivers.ts
│   │   │   └── routes.ts
│   │   ├── types/
│   │   │   └── index.ts           # Shared TypeScript types
│   │   ├── utils/
│   │   │   └── ui.ts              # Badges, toasts, modals, etc.
│   │   ├── api.ts                 # Typed API client
│   │   └── app.ts                 # SPA router + shell
│   ├── public/
│   │   ├── index.html             # App shell
│   │   ├── css/
│   │   │   └── main.css           # Full design system
│   │   └── js/                    # Compiled TypeScript output
│   ├── package.json
│   └── tsconfig.json
│
└── package.json                   # Root convenience scripts
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- **MongoDB** running locally on port 27017 (or Atlas URI)

### 1. Install Dependencies
```bash
# From project root
npm run install:all

# Or manually:
cd backend && npm install
cd frontend && npm install
```

### 2. Configure Environment
```bash
cd backend
cp .env.example .env
# Edit .env:
#   PORT=5000
#   MONGODB_URI=mongodb://localhost:27017/lastmile
#   NODE_ENV=development
```

### 3. Build TypeScript
```bash
# From project root
npm run build

# Or individually:
cd backend  && npx tsc
cd frontend && npx tsc
```

### 4. Seed Sample Data (Optional)
```bash
npm run seed
# Seeds: 5 drivers, 12 deliveries, 1 optimized route
```

### 5. Start the Server
```bash
npm start
# OR for development with ts-node:
npm run dev
```

Open **http://localhost:5000** in your browser.

---

## 📡 REST API Reference

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | KPIs, recent routes, efficiency stats |

### Deliveries
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/deliveries` | List all (filter: `status`, `priority`, `page`, `limit`) |
| GET | `/api/deliveries/stats` | Aggregated stats by status/priority |
| GET | `/api/deliveries/:id` | Single delivery |
| POST | `/api/deliveries` | Create delivery (auto-generates orderId) |
| PUT | `/api/deliveries/:id` | Update delivery |
| DELETE | `/api/deliveries/:id` | Delete delivery |

### Drivers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/drivers` | List all (filter: `status`, `vehicleType`) |
| GET | `/api/drivers/:id` | Driver + their recent routes |
| POST | `/api/drivers` | Create driver |
| PUT | `/api/drivers/:id` | Update driver |
| DELETE | `/api/drivers/:id` | Delete driver |

### Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/routes` | List all (filter: `status`, `page`, `limit`) |
| GET | `/api/routes/:id` | Full route with populated stops |
| POST | `/api/routes/optimize` | **Optimize + create route** (see below) |
| PUT | `/api/routes/:id` | Update status / stop status |
| DELETE | `/api/routes/:id` | Delete + unassign deliveries |

#### POST `/api/routes/optimize` — Body
```json
{
  "driverId": "<driver _id>",
  "deliveryIds": ["<delivery _id>", "..."],
  "plannedDate": "2025-06-01",
  "notes": "Morning batch run"
}
```

---

## ⚙️ Route Optimization Algorithm

The optimizer uses a **Nearest-Neighbour heuristic** with a priority bias:

1. Start at depot (HQ coordinates)
2. At each step, score all unvisited deliveries:
   - **Distance score** — Haversine distance from current position
   - **Priority bias** — Urgent deliveries get a lower (better) score adjustment
3. Visit the best-scored delivery next
4. Repeat until all deliveries are visited, then return to depot
5. Calculate ETAs assuming 25 km/h average city speed + 5 min per stop
6. Output: ordered stops, total distance (km), estimated duration (min), optimization score (0–100)

This gives near-optimal routes in O(n²) time and handles real-world priority constraints.

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Database | MongoDB + Mongoose |
| Language | TypeScript 5 (full-stack) |
| Frontend | Vanilla HTML5 + CSS3 + TypeScript (SPA) |
| Fonts | Space Mono · Barlow · Barlow Condensed |
| Theme | Dark industrial, amber accent |

---

## 🔧 Extending the Project

- **Real maps**: Integrate Leaflet.js or Google Maps for visual route display
- **Live tracking**: Add Socket.io for real-time driver location updates
- **Notifications**: SMS/email via Twilio or SendGrid on delivery status changes
- **Auth**: Add JWT authentication with role-based access (admin, dispatcher, driver)
- **Advanced optimization**: Replace nearest-neighbour with Google OR-Tools or a VRP solver for larger fleets
- **Mobile driver app**: Build a React Native companion app using the same REST API

---

## 📄 License

MIT — free to use and extend for commercial or personal projects.
