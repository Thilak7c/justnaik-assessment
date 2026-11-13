# Location Manager (Full Stack Technical Assessment)

A web app where each user signs up, saves locations (name, latitude, longitude) and sees them on an interactive map. Locations can be added one at a time or imported from a ZIP file. Every user only ever sees and changes their own data.

| Area | Choice |
|---|---|
| Frontend | React 19 + TypeScript (Vite), Tailwind CSS, react-leaflet, TanStack Query, React Router, Axios |
| Backend | Node.js + Express 5 + TypeScript, Zod validation, Multer + adm-zip for uploads |
| Database | PostgreSQL 16 with Knex (query builder + migrations) |
| Auth | JWT (HS256, `Authorization: Bearer`), bcrypt password hashing |
| Tests | Vitest + Supertest against a real PostgreSQL test database (backend), Vitest + Testing Library (frontend) |
| Bonus | Dockerised backend (plus optional frontend + database) via `docker compose` |

---

## 1. Quick start with Docker (easiest)

Requires Docker Desktop.

```bash
docker compose up --build
```

- App: http://localhost:8080
- API health check: http://localhost:4000/api/health

The backend container runs the database migrations automatically before it starts.

## 2. Local development setup

### Prerequisites
- Node.js 20 or newer (built with Node 22)
- PostgreSQL 14 or newer running locally, or just the database from Docker: `docker compose up -d db`

### 2.1 Database
Create two databases: one for the app and one used only by the tests.
```bash
createdb -U postgres locations
createdb -U postgres locations_test
```
(If you started `docker compose up -d db`, both are created for you.)

### 2.2 Backend
```bash
cd backend
cp .env.example .env        # then edit DATABASE_URL / JWT_SECRET if needed
npm install
npm run migrate             # creates the users and locations tables
npm run dev                 # http://localhost:4000
```

### 2.3 Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```
In development Vite proxies `/api/*` to `http://localhost:4000`, so no CORS setup is needed.

## 3. Using the app
1. Open http://localhost:5173 and **Register** (email + password of at least 8 characters).
2. **Map page**:
   - Add a location with the form. Clicking the map fills in the coordinates for you.
   - Click a marker or a list item to see its name. Use **Edit** or **Delete** in the list (or Edit in the marker popup).
   - Search by name. The list and the map both show the current page of results.
3. **Upload file** page: upload `sample-data/sample-locations.zip`. Uploading it a second time adds nothing (duplicates are skipped). Try `sample-data/invalid-locations.zip` to see line-by-line errors with nothing saved.
4. **Log out** from the sidebar.

### Upload file format
A `.zip` containing exactly one `.txt` file:
```
Name, Latitude, Longitude
Suria KLCC,3.157324409,101.7121981
Zoo Negara,3.21054160,101.75920504
```

## 4. Running the tests

```bash
# backend: needs PostgreSQL and TEST_DATABASE_URL (the test DB is wiped before every test)
cd backend && npm test

# frontend
cd frontend && npm test
```

| Suite | What is covered |
|---|---|
| `backend/tests/auth.test.ts` | register/login, bcrypt hashing, duplicate email (case-insensitive), generic login error, missing/expired/forged tokens |
| `backend/tests/locations.test.ts` | CRUD, validation (ranges, types, empty name), **user data isolation** (read/update/delete/list, ignoring `userId` in the body), server-side search + pagination, LIKE wildcard escaping |
| `backend/tests/upload.test.ts` | valid import, re-upload adds no duplicates, numeric-precision duplicates, duplicates inside one file, **all-or-nothing on invalid rows** with line numbers, wrong ZIP contents, fake ZIP, auth required, parser unit tests |
| `frontend/src/lib/validation.test.ts` | client-side form validation rules |
| `frontend/src/components/LocationForm.test.tsx` | validation messages, **no double submit**, input kept on server/network error |
| `frontend/src/pages/UploadPage.test.tsx` | client file checks, success summary, line-by-line server errors |
| `frontend/src/api/client.test.ts` | token header, automatic logout on expired session, error messages |

Current result: backend **52 passing**, frontend **24 passing**.

## 5. API reference

All endpoints are under `/api`. Errors always use this shape: `{ "error": { "code", "message", "details?": [{ "field" | "line", "message" }] } }`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | – | `{ email, password }` → `201 { user, token }` |
| POST | `/auth/login` | – | `{ email, password }` → `{ user, token }` |
| GET | `/auth/me` | ✔ | Current user |
| GET | `/locations?q=&page=1&limit=10` | ✔ | `{ items, page, limit, total, totalPages }` (newest first) |
| GET | `/locations/:id` | ✔ | One location (404 if it is not yours) |
| POST | `/locations` | ✔ | `{ name, latitude, longitude }` → 201 |
| PUT | `/locations/:id` | ✔ | Update → 200 |
| DELETE | `/locations/:id` | ✔ | → 204 |
| POST | `/uploads` | ✔ | multipart field `file` (.zip) → `201 { message, totalRows, inserted, skippedDuplicates }` |

Status codes used: 400 malformed request, 401 not logged in / expired / invalid token, 404 not found (including other users' records), 409 duplicate, 413 file too large, 422 validation failed, 429 too many login attempts.

## 6. Project structure

```
backend/
  src/
    app.ts                  Express app (routes + middleware), no listen() so tests can import it
    server.ts               starts the HTTP server, graceful shutdown
    config.ts               validated environment variables
    db/knex.ts, db/migrate.ts, db/migrations/   database connection + migrations
    middleware/             requireAuth (JWT), errorHandler, validate (zod)
    routes/                 auth, locations, uploads (thin HTTP layer)
    services/               business logic + SQL (auth, location, upload)
    schemas/                zod schemas shared by routes
  tests/                    integration + unit tests
frontend/
  src/
    api/                    axios client (token + 401 handling), endpoints, error helpers, types
    auth/                   AuthContext (session), ProtectedRoute / PublicOnlyRoute
    hooks/                  React Query hooks (list + mutations), debounce
    components/             Layout (sidebar), LocationForm, LocationList, LocationMap, Pagination, ui
    pages/                  AuthPage (login/register), MapPage, UploadPage
    lib/                    validation rules, JWT expiry helper
sample-data/                sample + invalid ZIP files for the upload feature
docker-compose.yml          db + backend (+ optional frontend)
```

## 7. Design decisions and trade-offs

- **Data isolation:** the user ID comes only from the verified JWT. Every location query is built from `where user_id = <from token>`, and update/delete include the same condition in the SQL, so there is no "check then act" gap. Another user's record returns **404**, not 403, so its existence is not revealed.
- **Passwords:** bcrypt with cost 10, never returned by the API. Login gives the same message for an unknown email and a wrong password, and compares against a dummy hash when the email is unknown so the response time does not leak which emails exist. Auth routes are rate limited.
- **Sessions:** short-lived JWT (default 1 hour). The frontend logs out automatically on any 401, and also exactly when the token's `exp` time arrives, with a "session expired" message. The React Query cache is cleared on logout so the next user never sees the previous user's data.
- **Token storage:** `localStorage` for simplicity. Trade-off: an httpOnly, SameSite cookie would protect against token theft through XSS but needs CSRF handling. Next step: refresh tokens + httpOnly cookie.
- **Coordinates:** stored as `NUMERIC(12,9)` rather than float, because the sample data has 9 decimal places and float rounding would break duplicate detection. A database CHECK constraint also enforces the valid ranges.
- **Duplicates:** a unique index on `(user_id, lower(name), latitude, longitude)`. Uploads use `INSERT … ON CONFLICT DO NOTHING`, so the same file can be uploaded any number of times. A manual add of an existing place returns 409.
- **Upload is all-or-nothing:** every line is validated first and all errors are returned with line numbers, then the rows are inserted inside one transaction. Zip-bomb protection checks the declared uncompressed size before extracting, and the request size is limited.
- **Upload parsing rules:** the header row is optional, blank lines are ignored, spaces are trimmed, and a UTF-8 BOM and Windows line endings are handled. If a name contains commas, the last two fields are the coordinates. macOS `__MACOSX/` metadata entries are ignored. Scientific notation (`1e5`) is rejected.
- **Map and list consistency:** both read the same React Query result (the current page of the current search), and every add/edit/delete/upload invalidates it, so they never disagree and nothing needs a page refresh. Trade-off: the map shows the current page, not every location. For thousands of markers, a better approach is a bounding-box endpoint plus marker clustering.
- **Slow or failed requests:** search is debounced (350 ms). The query key contains the search text and page, and old requests are cancelled with an `AbortSignal`, so an old response can never replace newer results. While the next page loads, previous rows stay visible but greyed out and not clickable, and map markers are hidden. Errors show a Retry button. Forms keep the user's input on failure, and a ref-based guard plus disabled buttons prevent double submits. Axios has a 15 s timeout.

## 8. Assumptions and unfinished work
- The same name at the same coordinates (ignoring letter case) counts as a duplicate. The same name at different coordinates is allowed.
- Location names are 1–100 characters. Uploads allow up to 10,000 rows and 5 MB (configurable via environment variables).
- No refresh tokens, password reset or email verification. These are out of scope for the assessment.
- Map tiles come from the public OpenStreetMap tile server (fine for a demo, not for heavy production use).
- Not included: end-to-end browser tests in CI. The flows were checked manually and with an ad-hoc Playwright script.
