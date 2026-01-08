# Study Planner (PERN Capstone)

A Study Planner web app built with:
- PostgreSQL (database)
- Express + Node.js (API server)
- React (Vite) (client)

## Repo Structure

/server # Express API + PostgreSQL
/client # React (Vite) frontend


## Prerequisites

Install these first:

- Node.js (LTS recommended)  
  Verify:
  ```bash
  node -v
  npm -v

    PostgreSQL (local)
    Verify:

    psql --version

Windows note: If psql / createdb are “not found”, install PostgreSQL and add its bin folder to PATH.
Example: C:\Program Files\PostgreSQL\16\bin
Then restart your terminal.
1) Clone the repo

git clone <YOUR_REPO_URL>
cd std_planer

2) Setup environment variables
Server env

Copy the example file:

cp server/.env.example server/.env

Edit server/.env and set your local DB password and JWT secret.

Example server/.env:

PORT=5000
CORS_ORIGIN=http://localhost:5173

DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/study_planner

JWT_SECRET=change_me_super_secret
JWT_EXPIRES_IN=7d

Client env

Copy the example file:

cp client/.env.example client/.env

Example client/.env:

VITE_API_BASE_URL=/api

We use a Vite dev proxy, so the client calls /api/* and Vite forwards requests to the backend.
3) Create the database

Option A: CLI (recommended)

createdb -U postgres study_planner
psql -U postgres -d study_planner -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

Option B: pgAdmin

    Create a database named study_planner

    Run in Query Tool:

    CREATE EXTENSION IF NOT EXISTS pgcrypto;

4) Install dependencies

Server:

cd server
npm install

Client:

cd ../client
npm install

5) Run migrations (create tables)

From server/:

npm run migrate

First time you should see:

    ✅ Applied: 001_init.sql

Later runs should show:

    ✅ No pending migrations.

6) Run the app (development)

You need two terminals.

Terminal 1 — Server:

cd server
npm run dev

Server runs at:

    http://localhost:5000

Quick test:

    http://localhost:5000/api/ping

Terminal 2 — Client:

cd client
npm run dev

Client runs at:

    http://localhost:5173

MVP Features

    User accounts (register/login)

    Courses (create/list/delete)

    Tasks (create/list/update/delete)

    Weekly view

    Task statuses: todo | doing | done

    Dashboard summary endpoint: tasks overview counts

Useful API Endpoints (MVP)

Auth:

    POST /api/auth/register

    POST /api/auth/login

    GET /api/auth/me (requires Authorization: Bearer <token>)

Courses (protected):

    GET /api/courses

    POST /api/courses

    PUT /api/courses/:id

    DELETE /api/courses/:id

Body example:

{ "name": "CS101", "color": "blue" }

Tasks (protected):

    GET /api/tasks

    POST /api/tasks

    PUT /api/tasks/:id

    DELETE /api/tasks/:id

    GET /api/tasks/summary

Task body example:

{
  "title": "Homework 1",
  "dueDate": "2026-01-15",
  "status": "todo",
  "courseId": "<uuid>"
}

Query filters for listing tasks:

    /api/tasks?status=todo

    /api/tasks?from=YYYY-MM-DD&to=YYYY-MM-DD

    /api/tasks?courseId=<uuid>

Scripts

Server (run from server/):

    npm run dev — start API with nodemon

    npm start — start API (production style)

    npm run migrate — apply SQL migrations

Client (run from client/):

    npm run dev — start Vite dev server

    npm run build — build frontend

    npm run preview — preview production build locally

Common Troubleshooting

DATABASE_URL is missing:

    Ensure server/.env exists (not .env.txt)

    Ensure it contains DATABASE_URL=...

Cannot GET /api/auth/register:

    That endpoint is POST, not GET. Use the React UI or a REST client.

Register/Login fails from the client:

    Ensure both server + client are running

    Test server: http://localhost:5000/api/ping

    Ensure client proxy is configured (Vite proxy routes /api to the server)

Postgres tools not found (Windows):

    Install PostgreSQL

    Add Postgres bin folder to PATH

    Restart terminal

Git / Secrets

Commit:

    server/.env.example

    client/.env.example

Do NOT commit:

    server/.env

    client/.env

    node_modules/

    build output folders (dist/, build/)

Team Workflow (Recommended)

    Create feature branches:

git checkout -b feature/<short-name>

Commit often with clear messages:

    feat: add tasks CRUD

    fix: handle auth token

Use PRs to merge into main (or dev if you use one)