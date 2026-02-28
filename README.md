# EV Charger Map

> Find and reserve EV charging points around you.

A full-stack EV charging station management platform built for the NTUA Software Engineering course (2025-2026). Users can locate chargers on an interactive map, reserve time slots, start charging sessions, and pay seamlessly via Stripe. While the professor provided a high-level specification outlining core functional requirements and example API endpoints for grading purposes, the team was fully responsible for:

- Requirements analysis and refinement

- UML modeling (use case, sequence, component, deployment diagrams)

- Architectural design decisions

- Technology stack selection

- Infrastructure setup

- Concurrency and state management strategy

- External API integrations

- Payment flow design

- DevOps setup and environment automation

Key architectural decisions — such as introducing Redis with Lua scripts for atomic reservations, integrating the ENTSO-E wholesale energy pricing API, implementing Stripe pre-authorization capture flows, and designing a dynamic pricing engine — were independently researched, justified, and implemented by the team.

Additionally, we implemented several advanced features beyond the original assignment scope, including:

- Personalized charging statistics per vehicle

- Live charging session feed with real-time kWh and cost tracking

- Dynamic time-of-day pricing adjustments


The project was rated 10/10 by the professor and was selected as one of the best submissions of the year to serve as a reference example for future classes.
---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Running the App](#running-the-app)
- [Phone Access](#phone-access)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [CLI Client](#cli-client)
- [Default Credentials](#default-credentials)
- [Environment Variables](#environment-variables)
- [Scripts Reference](#scripts-reference)
- [Team](#team)

---

## Features

**For Users:**
- Interactive map with clustered charger pins (color-coded by status)
- Real-time charger availability with status indicators
- Reserve a charger with automatic expiry and countdown timer
- Start/stop charging sessions with live kWh and cost tracking
- Battery-aware charging (auto-stop when full based on your EV's specs)
- Stripe payment integration with pre-authorization holds
- Billing history with monthly/yearly spending summaries and custom date-range stats
- Vehicle management (select your EV from a 200+ car catalog)
- User profile and preferences
- Problem reporting for charger issues

**For Admins:**
- Admin dashboard for user and charger management
- Dynamic pricing profiles with time-of-day adjustments
- Wholesale energy price integration (ENTSO-E)
- System health monitoring
- Bulk charger import/reset from JSON datasets

**Technical:**
- Atomic reservations via Redis (Lua scripts) preventing double-booking
- DB + Redis dual-state sync for consistent charger status
- Expired reservation cleanup (background job every 60s)
- JWT authentication with role-based access control
- Stripe pre-authorization and capture payment flow
- CLI client for scripted/automated operations

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS |
| **Backend** | Express 5, TypeScript, Prisma ORM |
| **Database** | PostgreSQL 15 |
| **Cache** | Redis 7 |
| **Payments** | Stripe (Elements + Payment Intents) |
| **Maps** | Pigeon Maps (OpenStreetMap) |
| **Charts** | Recharts |
| **UI Library** | Radix UI + shadcn/ui components |
| **CLI** | Commander.js |
| **Infra** | Docker Compose |

---

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│   Next.js Frontend  │────▶│   Express Backend    │
│   (Port 3000)       │     │   (Port 9876)        │
│                     │     │                      │
│  - Map View         │     │  - REST API /api/v1  │
│  - Charger Details  │     │  - JWT Auth          │
│  - Billing/Stats    │     │  - Stripe Payments   │
│  - Vehicle Mgmt     │     │  - Pricing Engine    │
└─────────────────────┘     └──────┬───────┬───────┘
                                   │       │
                            ┌──────▼──┐ ┌──▼──────┐
                            │ Postgres│ │  Redis  │
                            │  (5432) │ │ (6379)  │
                            │         │ │         │
                            │ Users   │ │ Locks   │
                            │ Chargers│ │ Status  │
                            │ Sessions│ │ Reserve │
                            └─────────┘ └─────────┘
```

---

## Quick Start

### Prerequisites

- **Docker Desktop** (for PostgreSQL and Redis)
- **Node.js** v20+ and npm

### One-Command Setup

**macOS / Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

**Windows (PowerShell):**
```powershell
.\setup.ps1
```

The setup script will:
1. Start PostgreSQL and Redis via Docker
2. Install all dependencies (backend, frontend, CLI)
3. Create `.env` files with default configuration
4. Initialize the database schema and seed data
5. Load the car catalog (200+ EV models)
6. Import demo charger locations
7. Auto-detect your LAN IP for phone access

---

## Running the App

After setup, start both services in separate terminals:

**Terminal 1 — Backend:**
```bash
cd back-end && npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd front-end && npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Phone Access

The frontend runs on `0.0.0.0:3000` and the setup script auto-detects your LAN IP. To access from a phone on the same Wi-Fi network:

1. Find your LAN IP (printed during setup, or check `.env.local`)
2. Open `http://<YOUR_LAN_IP>:3000` on your phone
3. The backend API URL in `.env.local` already points to your LAN IP

If your IP changes, update `NEXT_PUBLIC_API_URL` in `front-end/.env.local`.

---

## Project Structure

```
softeng25-02/
├── front-end/                  Next.js React application
│   ├── src/
│   │   ├── app/                Page routes
│   │   │   ├── page.tsx        Home (Map view)
│   │   │   ├── signin/         Login page
│   │   │   ├── signup/         Registration page
│   │   │   ├── profile/        User profile
│   │   │   ├── vehicles/       Vehicle management
│   │   │   ├── billing/        Billing & spending stats
│   │   │   └── report-problem/ Problem reporting
│   │   ├── components/         React components
│   │   ├── hooks/              Custom React hooks
│   │   ├── utils/              API utilities
│   │   └── types/              TypeScript type definitions
│   └── .env.local              Frontend environment config
│
├── back-end/                   Express REST API
│   ├── src/
│   │   ├── routes/             API endpoint handlers
│   │   ├── controllers/        Business logic (payments, etc.)
│   │   ├── middleware/         Auth, error handling
│   │   ├── services/           Redis operations
│   │   ├── pricing/            Dynamic pricing engine
│   │   ├── scripts/            Seed scripts (cars, fake data)
│   │   └── data/               Demo datasets (chargers, CSV)
│   ├── prisma/
│   │   ├── schema.prisma       Database schema
│   │   └── seed.ts             Initial seed (admin user)
│   └── .env                    Backend environment config
│
├── cli-client/                 CLI tool (se2502)
│   └── se2502.js               CLI executable
│
├── documentation/              Project documentation
│   └── openapi.yaml            OpenAPI 3.0 spec
│
├── tests/                      Integration tests
├── docker-compose.yml          PostgreSQL + Redis
├── setup.sh                    Setup script (macOS/Linux)
├── setup.ps1                   Setup script (Windows)
├── reset-for-testing.sh        Reset to fresh state (macOS/Linux)
└── reset-for-testing.ps1       Reset to fresh state (Windows)
```

---

## API Reference

Base URL: `http://localhost:9876/api/v1`

Full OpenAPI 3.0 specification available at [`documentation/openapi.yaml`](documentation/openapi.yaml).

### Key Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/signup` | - | Register new user |
| `POST` | `/auth/signin` | - | Login, returns JWT |
| `GET`  | `/points` | Optional | List all chargers with status |
| `GET`  | `/points/:id` | Optional | Get charger details |
| `POST` | `/reserve/:id` | JWT | Reserve a charger |
| `POST` | `/reserve/:id/cancel` | JWT | Cancel reservation |
| `POST` | `/charging/start` | JWT | Start charging session |
| `POST` | `/charging/stop` | JWT | Stop charging session |
| `GET`  | `/charging/status/:id` | JWT | Poll session status |
| `GET`  | `/charging/active` | JWT | Get active session/reservation |
| `GET`  | `/me` | JWT | Get user profile |
| `GET`  | `/payments/history` | JWT | Billing history |
| `GET`  | `/cars` | - | Browse EV catalog |
| `POST` | `/admin/resetpoints` | Admin | Load demo chargers |
| `GET`  | `/admin/healthcheck` | Admin | System health status |

---

## CLI Client

After setup, the CLI is available globally as `se2502`:

```bash
# Login
se2502 login --username admin@ev.local --passw admin123

# Load demo chargers
se2502 resetpoints

# View charger status
se2502 pointstatus --id 3 --from 20260211 --to 20260212
```

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@ev.local` | `admin123` |

---

## Environment Variables

### Backend (`back-end/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/ev_app` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `JWT_SECRET` | `supersecretkey` | JWT signing secret |
| `PORT` | `9876` | API server port |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Stripe secret key (test mode) |
| `ENTSOE_TOKEN` | `...` | ENTSO-E energy price API token |
| `ENABLE_PRICING` | `1` | Enable dynamic pricing engine |

### Frontend (`front-end/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://<LAN_IP>:9876/api/v1` | Backend API URL |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Stripe publishable key |
| `NEXT_PUBLIC_WEB3FORMS_KEY` | `...` | Contact form service key |
| `NEXT_PUBLIC_ENABLE_MOCK_SESSION` | `0` | Enable mock session button |

---

## Scripts Reference

### Setup & Reset

| Script | Description |
|--------|-------------|
| `./setup.sh` | Full dev environment setup (macOS/Linux) |
| `.\setup.ps1` | Full dev environment setup (Windows) |
| `./reset-for-testing.sh` | Wipe everything for a fresh setup test |
| `.\reset-for-testing.ps1` | Same for Windows |

### Backend (`cd back-end`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start in watch mode |
| `npm start` | Start production mode |
| `npm run build` | TypeScript type check |
| `npm run prisma:seed` | Seed admin user |
| `npm run prisma:studio` | Open Prisma Studio GUI |
| `npx tsx src/scripts/seedCars.ts` | Seed car catalog |

### Frontend (`cd front-end`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |

---

## Team

NTUA School of Electrical and Computer Engineering — Software Engineering 2025-2026, Team 02

       Zakynthinos Iasonas         el23408
       Ntontos Stergios            el23406
       Mantzaris Konstantinos      el22406
       Pallis Georgios             el22144
       Stamatopoulos Grigorios     el22039
       Fragkos Nikolas-Dionysios   el22028
