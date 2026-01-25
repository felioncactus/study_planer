# Study Planner (PERN Capstone)

A Study Planner web app built with:

- **PostgreSQL** (database)
- **Express + Node.js** (API server)
- **React + Vite** (client)

---

## Table of contents

- [Repo structure](#repo-structure)
- [Prerequisites](#prerequisites)
- [Setup (from scratch)](#setup-from-scratch)
- [MVP features](#mvp-features)
- [API endpoints](#api-endpoints)
- [Scripts](#scripts)
- [Troubleshooting](#troubleshooting)
- [Git / secrets](#git--secrets)
- [Team workflow](#team-workflow)

---

## Repo structure

```
/server   # Express API + PostgreSQL
/client   # React (Vite) frontend
```

---

## Prerequisites

Install these first:

- **Node.js (LTS recommended)**  
  Verify:
  ```bash
  node -v
  npm -v
  ```

- **PostgreSQL (local)**  
  Verify:
  ```bash
  psql --version
  ```

### Windows PATH note (Postgres tools)

If `psql` or `createdb` are “not found” on Windows:

1. Install PostgreSQL
2. Add Postgres **bin** folder to PATH, e.g.
   `C:\Program Files\PostgreSQL\16\bin`
3. Restart your terminal

---

## Setup (from scratch)

### 1) Clone the repo

```bash
git clone <YOUR_REPO_URL>
cd std_planer
```

---

### 2) Environment variables

#### Server

Copy the example env file and edit it:

**macOS / Linux / Git Bash**
```bash
cp server/.env.example server/.env
```

**Windows PowerShell**
```powershell
Copy-Item server/.env.example server/.env
```

Edit `server/.env` and set your local DB password and JWT secret.

Example `server/.env`:

```env
PORT=5000
CORS_ORIGIN=http://localhost:5173

DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/study_planner

JWT_SECRET=change_me_super_secret
JWT_EXPIRES_IN=7d
```

#### Client

Copy the example env file:

**macOS / Linux / Git Bash**
```bash
cp client/.env.example client/.env
```

**Windows PowerShell**
```powershell
Copy-Item client/.env.example client/.env
```

Example `client/.env`:

```env
VITE_API_BASE_URL=/api
```

> We use a **Vite dev proxy**, so the client calls `/api/*` and Vite forwards requests to the backend.

---

### 3) Create the database

#### Option A: CLI (recommended)

Create the DB:

```bash
createdb -U postgres study_planner
```

Enable UUID extension (recommended):

```bash
psql -U postgres -d study_planner -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

#### Option B: pgAdmin

- Create a database named `study_planner`
- Run in Query Tool:
  ```sql
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  ```

---

### 4) Install dependencies

#### Server

```bash
cd server
npm install
```

#### Client

```bash
cd ../client
npm install
```

---

### 5) Run migrations (create tables)

From `server/`:

```bash
npm run migrate
```

Expected output:

- First time: `✅ Applied: 001_init.sql`
- Later runs: `✅ No pending migrations.`

---

### 6) Run the app (development)

You need **two terminals**.

#### Terminal 1 — Server

```bash
cd server
npm run dev
```

Server runs at: `http://localhost:5000`

Quick test: `http://localhost:5000/api/ping`

#### Terminal 2 — Client

```bash
cd client
npm run dev
```

Client runs at: `http://localhost:5173`

---

## MVP features

- User accounts (register / login)
- Courses (create / list / delete)
- Tasks (create / list / update / delete)
- Weekly view
- Task statuses: `todo | doing | done`
- Dashboard summary endpoint (counts)

---

## API endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (requires `Authorization: Bearer <token>`)

### Courses (protected)

- `GET /api/courses`
- `POST /api/courses`
- `PUT /api/courses/:id`
- `DELETE /api/courses/:id`

Body example:

```json
{ "name": "CS101", "color": "blue" }
```

### Tasks (protected)

- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `GET /api/tasks/summary`

Task body example:

```json
{
  "title": "Homework 1",
  "dueDate": "2026-01-15",
  "status": "todo",
  "courseId": "<uuid>"
}
```

Query filters for listing tasks:

- `/api/tasks?status=todo`
- `/api/tasks?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `/api/tasks?courseId=<uuid>`

---

## Scripts

### Server (run from `server/`)

- `npm run dev` — start API with nodemon
- `npm start` — start API (production style)
- `npm run migrate` — apply SQL migrations

### Client (run from `client/`)

- `npm run dev` — start Vite dev server
- `npm run build` — build frontend
- `npm run preview` — preview production build locally

---

## Troubleshooting

### DATABASE_URL is missing

- Ensure `server/.env` exists (**not** `.env.txt`)
- Ensure `server/.env` contains `DATABASE_URL=...`
- Restart `npm run dev` after changes

### Cannot GET /api/auth/register

That endpoint is **POST**, not GET. Use the React UI or a REST client.

### Register/Login fails from the client

- Ensure **both** server + client are running
- Test server: `http://localhost:5000/api/ping`
- Ensure the client is using `/api` via the Vite proxy (`VITE_API_BASE_URL=/api`)


### error: invalid input syntax for type smallint: "Tue"

This means your existing database has an older `courses.day_of_week` column stored as a number.
Run migrations again to auto-fix it:

```bash
cd server
npm run migrate
```

This repo includes a migration that converts `day_of_week` to TEXT so values like `Mon/Tue/...` work.

### Postgres tools not found \(Windows\)

- Install PostgreSQL
- Add Postgres `bin` folder to PATH
- Restart terminal

---

## Git / secrets

✅ Commit:

- `server/.env.example`
- `client/.env.example`

❌ Do **NOT** commit:

- `server/.env`
- `client/.env`
- `node_modules/`
- build output (`dist/`, `build/`)

---

## Team workflow

- Create feature branches:
  ```bash
  git checkout -b feature/<short-name>
  ```
- Commit often with clear messages:
  - `feat: add tasks CRUD`
  - `fix: handle auth token`
- Use PRs to merge into `main` (or `dev` if you use one)
