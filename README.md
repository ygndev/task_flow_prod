# TaskFlow

**Task-based time tracking with role-based access control.** A demo-ready MVP for small teams, freelancers, and admins who need to assign work, track time, and see who did what—without the complexity of enterprise tools.

---

## 1. Project Overview

### What Problem TaskFlow Solves

Teams and freelancers often juggle tasks and time in separate tools: one place for “what to do,” another for “how long it took.” TaskFlow unifies **tasks** and **time tracking** in a single flow. Assign work, start a timer on the right task, and complete it—with a clear audit trail and simple reports.

### Core Idea

- **Task-centric:** Every unit of work is a task. Tasks have status (TODO → IN_PROGRESS → DONE), can be assigned, and support comments and activity.
- **Time tracking built in:** Members start/stop a timer on the task they’re working on. Duration is computed server-side; one active timer per user.
- **RBAC from the ground up:** Two roles—**ADMIN** and **MEMBER**—with enforced boundaries: admins create and assign tasks and see reports; members work on assigned tasks and track time.

### Who It Is For

- **Small teams** that need lightweight task + time visibility without heavy project software.
- **Freelancers** who want to track time per deliverable and optionally report to a client/admin.
- **Admins** who assign work and need a simple “who worked on what and for how long” view.

---

## 2. Core Features

- **Firebase Authentication** — Email/password sign-up and sign-in; session handled via Firebase ID tokens.
- **Role-based access (ADMIN / MEMBER)** — Roles stored in Firestore and synced to Firebase custom claims; API and UI enforce access by role.
- **Task management** — Create tasks (title, description, optional assignee); assign/reassign; update status (TODO, IN_PROGRESS, DONE). Members can create tasks for themselves and start working immediately.
- **Time tracking** — Start/stop timer per task; server-side duration calculation; one active timer per user; “Now Working” card with live elapsed time.
- **Activity log & comments** — Per-task activity (created, assigned, status changed, timer started/stopped, comment added); comment thread per task with RBAC (members on assigned tasks, admins on any).
- **Reports** — Admin-only time report by date range: total time per user (aggregated from completed time entries).

---

## 3. Tech Stack

| Layer        | Technology |
|-------------|------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Backend**  | Node.js, Express, TypeScript (ESM) |
| **Database** | Firebase Firestore |
| **Auth**     | Firebase Auth (client) + Firebase Admin (API); custom claims for role |
| **Testing**  | Vitest (API unit tests) |

No heavy UI framework; custom CSS (theme + components) for a clean, product-like interface.

---

## 4. Architecture

### Monorepo Structure

```
taskflow/
├── apps/
│   ├── web/     # React SPA (Vite)
│   └── api/     # Express API
├── docs/        # Firestore schema, branching notes
├── package.json # npm workspaces root
└── README.md
```

### API: Domain-Driven Layering

The API is structured in four layers:

| Layer           | Path                  | Responsibility |
|----------------|-----------------------|----------------|
| **Domain**     | `src/domain/`         | Entities (Task, User, TimeEntry, Comment, Activity), enums (Role, TaskStatus, Priority), validators. No framework or infra imports. |
| **Data**       | `src/data/`           | Repository interfaces and Firestore implementations (tasks, time entries, comments, activity). |
| **Application**| `src/application/`   | Services (task, timeEntry, user, comment, activity, reports). Business rules and RBAC logic live here. |
| **Presentation** | `src/presentation/` | Routes, controllers, DTOs, auth/role middlewares. HTTP only. |
| **Infrastructure** | `src/infrastructure/` | Firebase Admin init, logger, config. |

### Repository Pattern

- **Interfaces** in `data/repositories/interfaces/` (e.g. `ITaskRepository`, `ITimeEntryRepository`).
- **Implementations** in `data/repositories/implementations/` (Firestore).
- Services depend on interfaces; tests inject mocks.

### RBAC Enforcement

- **Auth middleware** — Verifies Firebase ID token, attaches `uid`, `email`, `role` to request.
- **Role middleware** — `requireAdmin`, `requireMember` guard routes.
- **Service layer** — Business rules (e.g. “member can only update status of assigned tasks,” “member can only comment on assigned tasks”) enforced in application services.

---

## 5. Running Locally

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Firebase project** with Auth and Firestore enabled
- **Firebase service account** (JSON key) for the API

### Environment Variables

**API (`apps/api/.env`):**

```env
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Firebase Admin: path to service account JSON (or leave unset and use application default)
FIREBASE_SERVICE_ACCOUNT_PATH=serviceAccountKey.json
```

**Web (`apps/web/.env`):**

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_ENV=development

VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Copy from `apps/api/.env.example` and `apps/web/.env.example`, then fill in your Firebase values.

### Commands

```bash
# Install dependencies (root)
npm install

# Start API (port 4000)
npm run dev:api

# Start web app (port 3000) — in a second terminal
npm run dev:web
```

- **Web:** http://localhost:3000  
- **API:** http://localhost:4000  

Build and test:

```bash
npm run build          # Build both apps
npm run test:run --workspace=apps/api   # Run API unit tests
```

---

## 6. Demo Flow (Step-by-Step)

1. **Register / Login**  
   Use the web app to register with email/password or log in. First login creates a Firestore user document with default role **MEMBER**. An admin can promote a user to **ADMIN** via the admin role endpoint.

2. **Admin: Create a task**  
   Log in as **ADMIN** → go to **Tasks** → create a task (title, description, optional assignee). Task appears in the list.

3. **Admin: Assign to member**  
   In the task list, enter the member’s user ID in the assign field and click **Assign**.

4. **Member: Start working**  
   Log in as **MEMBER** → **My Tasks**. Either choose “Start working on a task” and pick an existing task (or create a new one), or click **Start** on a task row. Timer starts; “Now Working” card shows live elapsed time.

5. **Timer runs**  
   Elapsed time updates every second. Member can **Stop & Log Time** (saves duration) or **Mark Done** (stops timer and sets task to DONE in one action).

6. **Task completed**  
   After “Mark Done” or manual status update to DONE, the task is completed. Completed time entries are included in reports.

7. **Admin: View report**  
   As **ADMIN** → **Reports** → set date range → **Run Report**. Table shows total time per user (from completed time entries in that range).

---

## 7. Screenshots

_Screenshots can be added here for a polished demo._

| Area | Description |
|------|-------------|
| **Login / Register** | Auth screens with email/password. |
| **Member – Now Working** | Sticky card with active task, live timer, Stop & Log / Mark Done. |
| **Member – My Tasks** | List of assigned tasks with status, time today, Start/Complete. |
| **Member – Today Summary** | Total time today and tasks completed today. |
| **Admin – Tasks** | Create task, list all tasks, assign by user ID. |
| **Admin – Reports** | Date range and table of total time per user. |

---

## 8. Future Improvements

- **Mobile UI** — Responsive or native client for on-the-go time tracking.
- **Export reports** — CSV/PDF export of time reports for payroll or client billing.
- **Notifications** — In-app or email when a task is assigned or commented.
- **Team analytics** — Dashboards (e.g. time by task, by project, trends) for admins.

---

## Repository Layout

- **`apps/web`** — React app: auth, role-based routes, Member (Now Working, My Tasks, Today Summary), Admin (Tasks, Reports), task details drawer with comments and activity.
- **`apps/api`** — Express app: auth + role middlewares, task/time-entry/comment/activity/report endpoints, Firestore repositories, Vitest unit tests.
- **`docs/firestore-schema.md`** — Collections, fields, and access patterns.
- **`docs/GIT_BRANCHING.md`** — Branch naming and workflow.

TaskFlow is built as a **demo-ready MVP**: clear separation of concerns, testable services, and a single, consistent flow from “assign task” to “track time” to “complete” to “report.”

## Demo Accounts

Admin:
- Email: admin@taskflow.dev
- Password: demo123

Member:
- Email: member@taskflow.dev
- Password: demo123

## Submission Checklist
- [x] Auth works
- [x] Role-based access enforced
- [x] Tasks visible by role
- [x] Time tracking accurate
- [x] Reports functional
- [x] Tests passing
# task_flow
# task_flow
