# PLANЁRKA

PLANЁRKA is a full-stack student workspace for courses, tasks, calendar planning, notes, friends, and chat. It is built as a PERN-style app with a React/Vite client, an Express API, and PostgreSQL.

The current UI is designed to be responsive across desktop and mobile, with compact navigation, mobile bottom navigation, adaptive cards, polished chat surfaces, and a multilingual interface.

## Stack

- PostgreSQL
- Node.js + Express
- React + Vite
- Axios
- JWT authentication
- OpenAI integration for assistant and planning helpers

## Repo Structure

```text
client/   React + Vite frontend
server/   Express API, repositories, services, migrations, uploads
```

## Current Features

- Authentication with register, login, profile, avatar, and language preference.
- Interface language support for English, Russian, Korean, Kazakh, and Uzbek.
- Dashboard with task summary, upcoming tasks, course shortcuts, quick actions, and calendar overview.
- Courses with modern course cards, course detail pages, images/banners, schedules, exams, tasks, and notes.
- Tasks with list-first workflow, filters, attachments, status updates, duration estimation, and AI planning.
- Activities with list-first workflow and create dialog for fixed events.
- Daily/weekly calendar views for courses, exams, tasks, planned task blocks, and activities.
- Friends system with requests, accept/decline, block/unblock, and direct chat entry points.
- Chat with direct/group/self conversations, attachments, message edit/delete, polls, timers, and live updates.
- Note editor with course notes and assistant help.
- Statistics page with task and calendar insights.
- Mobile-friendly layouts for nav, dashboard, chat, course cards, tasks, activities, and calendar.

## Important Language Note

UI translations are stored locally in the frontend dictionary. Switching interface language does not call OpenAI and does not cost API tokens.

User language is stored in the database on the `users.language` column. If your database was created before language support was added, run migrations from `server/`.

## Prerequisites

Install:

- Node.js LTS
- npm
- PostgreSQL

Check versions:

```bash
node -v
npm -v
psql --version
```

On Windows, if `psql` or `createdb` are not found, add the PostgreSQL `bin` folder to PATH, for example:

```text
C:\Program Files\PostgreSQL\16\bin
```

Restart the terminal after changing PATH.

## Environment Setup

### Server Env

Create `server/.env` from `server/.env.example`.

PowerShell:

```powershell
Copy-Item server/.env.example server/.env
```

macOS/Linux/Git Bash:

```bash
cp server/.env.example server/.env
```

Example:

```env
PORT=5000
CORS_ORIGIN=http://localhost:5173

DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/planorka

JWT_SECRET=change_me_super_secret
JWT_EXPIRES_IN=7d

OPENAI_API_KEY=your_key_if_using_ai_features
OPENAI_MODEL=gpt-4o-mini
```

### Client Env

Create `client/.env` from `client/.env.example`.

PowerShell:

```powershell
Copy-Item client/.env.example client/.env
```

macOS/Linux/Git Bash:

```bash
cp client/.env.example client/.env
```

For local Vite proxy usage:

```env
VITE_API_BASE_URL=/api
```

## Database Setup

Create the database:

```bash
createdb -U postgres planorka
```

Enable UUID support:

```bash
psql -U postgres -d planorka -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

Run migrations:

```bash
cd server
npm run migrate
```

Run migrations whenever a new SQL file appears in `server/migrations/`.

Current migrations include schema for users, courses, tasks, calendar blocks, avatars, friends/messages, attachments, course notes, chat polls/timers, course date ranges, and user language.

Recent schema note:

- `012_add_user_language.sql` adds `users.language` with supported values: `en`, `ru`, `ko`, `kk`, `uz`.

## Install Dependencies

Server:

```bash
cd server
npm install
```

Client:

```bash
cd client
npm install
```

## Run Development

Use two terminals.

Terminal 1, API:

```bash
cd server
npm run dev
```

Server runs at:

```text
http://localhost:5000
```

Quick API test:

```text
http://localhost:5000/api/ping
```

Terminal 2, client:

```bash
cd client
npm run dev
```

Client runs at:

```text
http://localhost:5173
```

## Scripts

Server scripts, run from `server/`:

```bash
npm run dev      # start Express with nodemon
npm start        # start Express with node
npm run migrate  # apply pending SQL migrations
```

Client scripts, run from `client/`:

```bash
npm run dev      # start Vite dev server
npm run build    # build production frontend
npm run preview  # preview production build
npm run lint     # run ESLint
```

## API Overview

All protected routes require:

```http
Authorization: Bearer <token>
```

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

Register supports:

```json
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "Password123!",
  "avatarUrl": null,
  "language": "en"
}
```

### Users

- Profile/language/avatar update routes are under `/api/users`.

### Courses

- `GET /api/courses`
- `GET /api/courses/:id`
- `POST /api/courses`
- `PUT /api/courses/:id`
- `DELETE /api/courses/:id`
- `GET /api/courses/:courseId/notes`
- `POST /api/courses/:courseId/notes`

Course create/update supports multipart form data for `image` and `banner`.

### Notes

- `GET /api/notes/:noteId`
- `PUT /api/notes/:noteId`
- `DELETE /api/notes/:noteId`
- `POST /api/assistant/notes/help`

### Tasks

- `GET /api/tasks`
- `GET /api/tasks/:id`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `GET /api/tasks/summary`
- `POST /api/tasks/suggestions`
- `POST /api/tasks/estimate-duration`
- `POST /api/tasks/ai-plan`
- `GET /api/tasks/:id/attachments`
- `POST /api/tasks/:id/attachments`
- `DELETE /api/tasks/:id/attachments/:attachmentId`

Useful task list filters:

```text
/api/tasks?status=todo
/api/tasks?from=YYYY-MM-DD&to=YYYY-MM-DD
/api/tasks?courseId=<uuid>
```

### Calendar and Activities

- `GET /api/calendar/events`
- `GET /api/activities`
- `GET /api/activities/:id`
- `POST /api/activities`
- `PUT /api/activities/:id`
- `DELETE /api/activities/:id`
- `POST /api/activities/ai-plan`

### Friends and Chat

- `GET /api/friends`
- `POST /api/friends/request`
- `POST /api/friends/accept`
- `DELETE /api/friends/:userId`
- `POST /api/friends/block`
- `POST /api/friends/unblock`

- `GET /api/chats`
- `GET /api/chats/self`
- `POST /api/chats/direct/:userId`
- `POST /api/chats/group`
- `GET /api/chats/:chatId`
- `DELETE /api/chats/:chatId`
- `DELETE /api/chats/:chatId/messages`
- `GET /api/chats/:chatId/messages`
- `POST /api/chats/:chatId/messages`
- `PATCH /api/chats/:chatId/messages/:messageId`
- `DELETE /api/chats/:chatId/messages/:messageId`
- `POST /api/chats/:chatId/polls`
- `POST /api/chats/:chatId/polls/:messageId/vote`
- `POST /api/chats/:chatId/timers`

### Assistant and Stats

- `POST /api/assistant/message`
- `GET /api/stats`

AI assistant, planning, and note-help features require `OPENAI_API_KEY` on the server.

## Design Notes

- The desktop auth and landing pages are constrained to the viewport to avoid unnecessary page scrolling.
- Mobile uses compact top navigation plus bottom navigation for core sections.
- Course cards, chat messages, task/activity cards, dialogs, and dashboard panels have responsive layouts.
- Language switching is client-side and preserves dynamic values such as dashboard counts.

## Troubleshooting

### Blank client page

Run:

```bash
cd client
npm run build
```

Then check the browser console. A blank page is usually a frontend runtime error or failed API call.

### Login/register fails

Check:

- Server is running on `http://localhost:5000`
- Client is running on `http://localhost:5173`
- `server/.env` has a valid `DATABASE_URL`
- Migrations have been run
- `JWT_SECRET` is set

### DATABASE_URL is missing

Make sure `server/.env` exists and is not named `.env.txt`.

### Cannot GET /api/auth/register

That route is `POST`, not `GET`. Use the React UI or a REST client.

### Course day error: invalid input syntax for type smallint

Your database has an older `courses.day_of_week` schema. Run:

```bash
cd server
npm run migrate
```

### Language does not persist

Run migrations and confirm `012_add_user_language.sql` has been applied.

### AI features fail

Set these in `server/.env`:

```env
OPENAI_API_KEY=your_key
OPENAI_MODEL=your_model
```

Then restart the server.

## Git and Secrets

Commit:

- `server/.env.example`
- `client/.env.example`
- source files
- migrations

Do not commit:

- `server/.env`
- `client/.env`
- `node_modules/`
- `client/dist/`
- uploads containing private user data

## Team Workflow

Create feature branches:

```bash
git checkout -b feature/<short-name>
```

Use clear commit messages:

```text
feat: add language selector
fix: preserve dashboard stats while switching language
style: improve mobile chat composer
```

Run the relevant checks before sharing changes:

```bash
cd client
npm run build

cd ../server
npm run migrate
```
