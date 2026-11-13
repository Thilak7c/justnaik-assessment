# Justnaik Technical Assessment: Complete Guide

This guide covers what the assessment asks for, how this project meets each requirement, how to set it up and run it, how to demo and test it, and how to prepare for the interview.

> **Most important:** the reviewers will ask you to *explain your implementation and make a small change live*. Read sections 3, 7 and 9 until you can explain every file without looking. Practise the live-change tasks in section 10 at least once.

---

## Contents
1. [What the assessment is](#1-what-the-assessment-is)
2. [Requirement checklist: where each one is implemented](#2-requirement-checklist)
3. [Architecture and how a request flows](#3-architecture)
4. [Setup (Windows / macOS / Linux)](#4-setup)
5. [Running the app](#5-running-the-app)
6. [Demo script for the interview (about 7 minutes)](#6-demo-script)
7. [Testing: automated + manual checklist](#7-testing)
8. [Before you submit](#8-before-you-submit)
9. [Likely interview questions with answers](#9-likely-interview-questions)
10. [Live-change practice tasks](#10-live-change-practice)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. What the assessment is

The PDF contains **two separate exercises**:

| | Web (this project) | Mobile (not built here) |
|---|---|---|
| App | Full-stack **Location Management** app | React Native **Task Management** app |
| Stack | React/Next + Tailwind/Bootstrap, Node (Express/NestJS), PostgreSQL/MySQL, JWT, **react-leaflet**, TypeScript | Expo + TypeScript, FlatList, AsyncStorage/SQLite, JSONPlaceholder API |
| Focus | Secure per-user data, map + list, server-side search/pagination, ZIP upload, tests | Offline support, local storage, merging remote + local changes, tests |

Before starting, they want you to tell them **when you will start and how many hours you estimate**. A reasonable estimate for the web app is **18–24 hours**. Also check whether they want both exercises or just one.

### What they really evaluate (web)
1. **Security:** JWT auth, hashed passwords, expired sessions handled, and **users can never see or change each other's data**, through the UI or the API.
2. **Reliable data handling:** backend search + pagination, loading/empty/success/error states, no double submits, no stale results, no lost input.
3. **The upload:** exactly one .txt inside a ZIP, validation with useful errors, **all-or-nothing**, **no duplicates on re-upload**.
4. **Code quality:** clear structure, reusable code, env variables, **tests for isolation/validation/upload/errors**, and a good README with trade-offs.
5. **Bonus:** Docker.

---

## 2. Requirement checklist

| Requirement (from the PDF) | How it is done | Where |
|---|---|---|
| Register, login, map and upload pages | 4 routes with React Router | `frontend/src/App.tsx`, `pages/` |
| Sidebar navigation with logout | `Layout` with NavLinks + Log out (top bar on mobile) | `components/Layout.tsx` |
| JWT authentication | `jsonwebtoken` HS256, `sub` = user id, expiry from env | `backend/src/services/auth.service.ts` |
| Protect pages that need login | `ProtectedRoute` redirects to /login. `PublicOnlyRoute` keeps logged-in users away from /login | `frontend/src/auth/RouteGuards.tsx` |
| Store passwords securely | bcrypt (cost 10). The hash is never returned | `auth.service.ts` |
| Handle expired/invalid sessions | API returns `401 TOKEN_EXPIRED` or `INVALID_TOKEN`. The axios interceptor logs out with a message. There is also a timer at the token's `exp` | `middleware/requireAuth.ts`, `frontend/src/api/client.ts`, `auth/AuthContext.tsx` |
| Users can't access others' data (UI + API) | Every query is scoped with `user_id` from the JWT. Others' records give **404**. The cache is cleared on logout | `services/location.service.ts` (`ownedBy`), tests in `locations.test.ts` |
| react-leaflet interactive map | `MapContainer`, markers, popups, fly-to, fit-bounds, click to pick coordinates | `components/LocationMap.tsx` |
| Form for name/lat/lng + validation | Client rules mirror the backend zod schema | `components/LocationForm.tsx`, `lib/validation.ts`, `schemas/location.schema.ts` |
| Add / edit / delete own locations | REST endpoints + React Query mutations | `routes/location.routes.ts`, `hooks/useLocations.ts` |
| Clickable markers with names, update without refresh | Popup shows the name. Mutations invalidate the query, so map and list refetch | `LocationMap.tsx`, `useLocations.ts` |
| Searchable, paginated list next to the map, consistent | List and map render **the same query result** | `pages/MapPage.tsx` |
| Search + pagination on the backend | `GET /locations?q=&page=&limit=` with `ILIKE`, `LIMIT/OFFSET`, `COUNT` | `location.service.ts` (`listLocations`) |
| Loading / empty / success / error states | Spinners, empty messages, toasts, error alerts with Retry | `MapPage.tsx`, `LocationList.tsx`, `Toaster.tsx`, `ui.tsx` |
| Prevent repeated submission | `useRef` in-flight guard + disabled buttons + `isPending` | `LocationForm.tsx`, `AuthPage.tsx`, `UploadPage.tsx` |
| Slow/failed requests: no outdated results, no lost input | Debounce, query key per search/page, AbortSignal, 15 s timeout, form reset only on success | `useLocations.ts`, `useDebouncedValue.ts`, `api/client.ts` |
| ZIP with exactly one .txt | ZIP signature check, metadata entries filtered out, count must be 1, must end in .txt | `services/upload.service.ts` (`extractSingleTextFile`) |
| Validate file + contents, useful errors, no partial save | Every line validated first, errors returned with **line numbers**, then one **transaction** | `parseLocationsText`, `importLocations` |
| No duplicates on re-upload | Unique index `(user_id, lower(name), latitude, longitude)` + `ON CONFLICT DO NOTHING` + in-file dedupe | migration `..._create_locations.ts`, `importLocations` |
| Confirmation + list/map update after upload | Success panel + toast. The mutation invalidates the locations query | `UploadPage.tsx` |
| TypeScript everywhere | Backend and frontend are both TS | – |
| Env vars, no committed secrets | `.env.example` files, `.env` git-ignored, config validated on startup | `backend/src/config.ts`, `.gitignore` |
| Tests: isolation, validation, upload, errors | 52 backend + 24 frontend tests | `backend/tests`, `frontend/src/**/*.test.ts(x)` |
| DB setup / migrations | Knex migrations, `npm run migrate` | `backend/src/db/migrations` |
| README (setup, usage, tests, assumptions) | Done | `README.md` |
| Bonus: Docker backend | Multi-stage Dockerfile + compose (db, backend, frontend) | `backend/Dockerfile`, `docker-compose.yml` |

---

## 3. Architecture

```
Browser (React)                           Express API                         PostgreSQL
───────────────                           ───────────                         ──────────
Pages ─► hooks (React Query) ─► api/endpoints ─► axios client ──HTTP──► routes ─► services ─► Knex ─► users, locations
             ▲ cache                │ adds "Bearer <token>"           │ requireAuth (JWT → req.userId)
             │                      │ 401 → logout()                  │ zod validation (parseOrThrow)
             └── invalidate after   │                                 │ errorHandler → { error: {code,message,details} }
                 add/edit/delete/upload
```

**Layers (backend):**
- **routes/**: the HTTP layer only. Reads the request, validates it with zod, calls a service and sends the response.
- **services/**: business rules and SQL. Knows nothing about Express.
- **middleware/**: `requireAuth` (who is calling), `errorHandler` (one error format), `validate` (zod → 422).
- **app.ts vs server.ts**: `createApp()` builds the app without listening, so Supertest can use it in tests.

**Layers (frontend):**
- **api/**: the *only* place that knows URLs. Has one axios instance with interceptors.
- **hooks/useLocations.ts**: all server state (React Query). Pages never call axios directly.
- **auth/AuthContext.tsx**: session state (token, user, login/register/logout, expiry timer).
- **components/**: reusable UI. **pages/**: screens that wire hooks to components.

### Walkthrough: "user adds a location"
1. `LocationForm` validates locally (`validateLocation`). If invalid, it shows field errors and sends nothing.
2. If valid, the in-flight ref is set, the button is disabled, and `onSubmit` → `useCreateLocation().mutateAsync()` → `locationsApi.create()`.
3. The axios interceptor adds `Authorization: Bearer <token>`.
4. Backend: `requireAuth` verifies the JWT and sets `req.userId`. The route parses the body with `locationInputSchema` (which has **no userId field**). `createLocation(req.userId, input)` inserts the row.
5. If the unique index fails → 409 "already have this location". Validation failure → 422 with field details.
6. On success, `invalidateQueries(['locations'])` refetches the list, and **map + list update together**. The form clears and a toast is shown.
7. On failure, the form keeps the values and shows the server message.

### Walkthrough: "user uploads a ZIP"
1. Client checks the `.zip` extension and size ≤ 5 MB. The button is disabled while uploading, and a progress bar shows.
2. Multer keeps the file **in memory** with a size limit. The route checks that the name ends in `.zip`.
3. `extractSingleTextFile`: checks the `PK` signature, opens the archive, ignores `__MACOSX`/`.DS_Store`, requires exactly 1 `.txt`, and checks the declared uncompressed size (zip-bomb guard).
4. `parseLocationsText`: skips the optional header, trims fields, and validates **every** line. Any invalid line → 422 listing them all (with line numbers). **Nothing is saved.**
5. `importLocations`: removes duplicates within the file, then runs one transaction inserting in batches of 500 with `ON CONFLICT DO NOTHING`. Returns inserted vs skipped counts.
6. The frontend shows "8 rows read · 8 added · 0 duplicates skipped" and invalidates the list.

### Database
```sql
users(id, email UNIQUE, password_hash, created_at)
locations(id, user_id → users ON DELETE CASCADE, name VARCHAR(100),
          latitude NUMERIC(12,9) CHECK -90..90, longitude NUMERIC(12,9) CHECK -180..180,
          created_at, updated_at)
UNIQUE INDEX (user_id, lower(name), latitude, longitude)
INDEX (user_id, created_at)
```

---

## 4. Setup

### Option A: Docker (one command)
```bash
docker compose up --build
```
Then open http://localhost:8080. The API is at http://localhost:4000/api/health.

### Option B: Local development (recommended while coding)

**Prerequisites:** Node.js 20+ (22 recommended), PostgreSQL (local install or `docker compose up -d db`), and Git.

**1. Database**
```bash
# Easiest: only the DB from docker (also creates locations_test)
docker compose up -d db
# Or with a local PostgreSQL:
createdb -U postgres locations
createdb -U postgres locations_test
```

**2. Backend**
```bash
cd backend
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
npm install
npm run migrate
npm run dev                   # → API listening on http://localhost:4000
```
Check `.env`: `DATABASE_URL` must match your Postgres user and password. `JWT_SECRET` must be at least 16 characters.

**3. Frontend** (new terminal)
```bash
cd frontend
cp .env.example .env          # Windows: Copy-Item .env.example .env
npm install
npm run dev                   # → http://localhost:5173
```

---

## 5. Running the app

| Command | Where | What it does |
|---|---|---|
| `npm run dev` | backend | API with auto-reload (tsx watch) |
| `npm run migrate` | backend | Apply migrations (`npm run migrate -- down` rolls back) |
| `npm test` | backend | 52 integration/unit tests against `locations_test` |
| `npm run build && npm start` | backend | Compiled production build |
| `npm run dev` | frontend | Vite dev server with `/api` proxy |
| `npm test` | frontend | 24 component/unit tests |
| `npm run build` | frontend | Typecheck + production bundle |

Sample files in `sample-data/`:
- `sample-locations.zip`: 8 valid KL locations
- `invalid-locations.zip`: 4 bad lines (to demo all-or-nothing)
- `two-files.zip`: two .txt files (should be rejected)

---

## 6. Demo script

Practise this out loud. Two browser windows help: a normal one and an incognito one.

1. **Intro (30 s):** "Express + Postgres API with JWT, a React + react-leaflet frontend, React Query for server state, and Docker for the bonus. I focused on data isolation, all-or-nothing upload and reliable request handling."
2. **Auth (1 min):** Open /map while logged out, and it redirects to /login. Register. Show the validation (bad email, short password, passwords don't match).
3. **Map (2 min):**
   - Add a location with latitude 95 and show the inline error. Fix it and add.
   - Click the map to fill the coordinates.
   - Click a list item: the map flies to it and its popup opens.
   - Edit, then delete. Point out there is no page refresh and the list and map stay in sync.
   - Search "kl": the request goes to the backend (show the Network tab with `?q=kl&page=1&limit=10`).
4. **Upload (1.5 min):**
   - Upload `sample-locations.zip` → 8 added.
   - Upload it again → "nothing new was added".
   - Upload `invalid-locations.zip` → errors shown per line, and the count is unchanged.
5. **Isolation (1 min):** In an incognito window, register user B: the list is empty. Optionally use curl (section 7.3) with B's token on A's id → 404.
6. **Session expiry (30 s):** In DevTools, change `localStorage.location_app_token` to garbage and search. You are logged out with a message. You can also set `JWT_EXPIRES_IN=1m` beforehand.
7. **Tests (30 s):** Run `npm test` in the backend and show the isolation and upload tests.
8. **Trade-offs (30 s):** localStorage vs cookie, the map shows the current page, no refresh tokens.

---

## 7. Testing

### 7.1 Automated tests
```bash
cd backend && npm test      # 52 tests (needs Postgres + TEST_DATABASE_URL)
cd frontend && npm test     # 24 tests
```
How the backend tests work:
- `tests/setup.ts` runs migrations on the **test** database and runs `TRUNCATE` before every test, so tests are independent.
- Supertest calls `createApp()` directly. No server port is needed.
- `fileParallelism: false`, because all test files share one database.

Key tests to show the interviewer:
- `locations.test.ts`: "user B cannot read, update or delete user A's location" and "ignores a userId sent in the body"
- `upload.test.ts`: "saves nothing when any row is invalid and reports line numbers" and "does not create duplicates when the same file is uploaded twice"
- `auth.test.ts`: "rejects an expired token with TOKEN_EXPIRED"
- `LocationForm.test.tsx`: "submits once even when clicked repeatedly" and "keeps the user input…when saving fails"

### 7.2 Manual test checklist (tick each one before the interview)

| # | Do this | Expected |
|---|---|---|
| 1 | Visit /map logged out | Redirect to /login |
| 2 | Register with an existing email (different case) | "An account with this email already exists" |
| 3 | Login with a wrong password, then an unknown email | Same message both times |
| 4 | Add a location with an empty name / lat 91 / lng "abc" | Inline errors, no request sent |
| 5 | Add a valid location, double-click the button fast | Only one row is created |
| 6 | Stop the backend, try to add | "Cannot reach the server…", input kept |
| 7 | Add the same name + coordinates twice | 409 message shown in the form |
| 8 | Edit from the list and from the marker popup | Both update the map + list |
| 9 | Delete the last item on page 2 | Moves back to page 1 |
| 10 | Type a search quickly | One request after the pause, correct results |
| 11 | Search for something that doesn't exist | "No locations match …" |
| 12 | Upload a valid zip twice | 2nd time: 0 added, duplicates skipped |
| 13 | Upload the invalid zip | Line errors, nothing saved |
| 14 | Upload `two-files.zip` / a renamed .txt / a .pdf | Clear rejection messages |
| 15 | Corrupt the token in localStorage, then act | Logged out with a session message |
| 16 | User B (incognito) | Sees none of A's data |
| 17 | Log out, log in as another user on the same browser | No flash of the previous user's data |

### 7.3 Proving isolation with curl (good for the live demo)
```bash
# login as A and B
A=$(curl -s -XPOST localhost:4000/api/auth/login -H 'content-type: application/json' -d '{"email":"a@example.com","password":"password123"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
B=$(curl -s -XPOST localhost:4000/api/auth/login -H 'content-type: application/json' -d '{"email":"b@example.com","password":"password123"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')

curl -s localhost:4000/api/locations -H "authorization: Bearer $A"            # note an id, e.g. 1
curl -s localhost:4000/api/locations/1 -H "authorization: Bearer $B"          # → 404
curl -s -XDELETE localhost:4000/api/locations/1 -H "authorization: Bearer $B" # → 404, A's row is untouched
```
On Windows, use Git Bash for these commands, or Postman/Insomnia.

---

## 8. Before you submit

- [ ] Push to a **public GitHub repo** (or private, shared with them). **Commit in logical steps** (setup → auth → locations → upload → frontend → tests → docker → README). Don't push one giant commit. Reviewers look at history.
- [ ] Make sure `.env` is **not** committed (`git status` should only show `.env.example`).
- [ ] Run the backend tests, frontend tests and `npm run build` in both folders one final time.
- [ ] Clone the repo into a fresh folder and follow the README exactly, to catch any missing steps.
- [ ] Reply with your start time and estimate, and mention the trade-offs (README section 7).
- [ ] Read every file at least once. Be able to explain *why* for each decision.

---

## 9. Likely interview questions

### Authentication and security
1. **How does your JWT auth work end to end?**
   Login checks bcrypt and signs a JWT (`sub` = user id, `exp` from env, HS256). The frontend stores it and an axios interceptor sends it as `Bearer`. The `requireAuth` middleware verifies the signature and expiry and sets `req.userId`. Every protected route uses it.
2. **Why bcrypt and not SHA-256/MD5?**
   bcrypt is slow on purpose (cost factor) and salted, so leaked hashes are very expensive to brute-force. Fast hashes can be cracked at billions per second.
3. **Where do you store the token? Is localStorage safe?**
   localStorage, for simplicity. The risk is XSS: injected JS could read it. React escapes output by default, and there's no `dangerouslySetInnerHTML`. The improvement is an httpOnly + Secure + SameSite cookie (JS can't read it) with CSRF protection, plus short access tokens and refresh tokens.
4. **What happens when the token expires?**
   The backend returns 401 `TOKEN_EXPIRED`. The axios interceptor calls `logout()` with "Your session has expired", clears the token and the React Query cache, and redirects to /login with the message. The app also sets a timer for the `exp` time, so it logs out even if the user is idle.
5. **Why can't user B see user A's locations?**
   `userId` comes only from the verified token, never from the body or URL. Every query starts from `where user_id = userId` (`ownedBy()`), including update and delete, in the same SQL statement. B asking for A's id gets 404. The zod schema has no userId field, so it can't be injected. Tests cover all of this.
6. **Why 404 and not 403?**
   403 confirms the record exists, which leaks information (IDs are sequential). 404 treats "not yours" as "doesn't exist".
7. **Why the same error for a wrong password and an unknown email?**
   To prevent account enumeration. I also compare against a dummy hash for unknown emails, so the timing is similar.
8. **What about brute-force login attempts?**
   `express-rate-limit` on the auth routes (50 per 15 min per IP). In production I'd add per-account limits or a lockout.
9. **What does helmet / CORS do here?**
   Helmet sets security headers. CORS only allows the configured frontend origin(s).
10. **Could the frontend check alone protect routes?**
    No. `ProtectedRoute` is only UX. Real protection is on the API, since anyone can call it with curl.

### API and database
11. **Why Knex and not Prisma/TypeORM?**
    It's light, and the SQL is visible and easy to explain. It has first-class migrations, and Postgres-specific features (expression unique index, `ON CONFLICT`) are easy to use. Prisma would also be fine.
12. **Why NUMERIC instead of FLOAT for coordinates?**
    Floats can't represent most decimals exactly. `3.21054160` could be stored as `3.2105415999…`, which breaks equality and therefore duplicate detection. NUMERIC(12,9) is exact to 9 decimal places, like the sample data.
13. **How is search + pagination done?**
    `ILIKE '%q%'` (case-insensitive), with `%` and `_` escaped so they match literally. A `COUNT(*)` gives the total, then `ORDER BY created_at DESC, id DESC LIMIT/OFFSET`. The response is `{items,total,page,limit,totalPages}`. `limit` is capped at 100.
14. **Problems with OFFSET pagination? Alternatives?**
    It gets slow for deep pages, and rows can shift between pages when data changes. The alternative is keyset (cursor) pagination: `WHERE (created_at,id) < (lastCreatedAt,lastId)`. For fast `ILIKE` on big tables, use a `pg_trgm` GIN index.
15. **Why the composite index (user_id, created_at)?**
    Every list query filters by user and sorts by date, and this index serves both.
16. **How do you return consistent errors?**
    Services throw `HttpError(status, code, message, details)`. One `errorHandler` turns everything into `{error:{code,message,details}}`. Unknown errors become a generic 500 (no stack traces leak).
17. **Why separate app.ts and server.ts?**
    So tests can import the app without opening a port.
18. **How do migrations run in Docker?**
    The container command runs `node dist/db/migrate.js && node dist/server.js`.

### Upload
19. **How do you guarantee "no partial save"?**
    Two layers. First, all lines are validated before any DB write, so the first invalid line doesn't stop us collecting all the others. Second, the inserts run inside a single transaction, so a DB error rolls everything back.
20. **How do you prevent duplicates on re-upload?**
    A unique index on `(user_id, lower(name), latitude, longitude)` with `INSERT … ON CONFLICT DO NOTHING`, plus dedupe within the file using the same key. The DB constraint is the real guarantee, and it is also safe against two uploads at the same time (no race like "SELECT then INSERT").
21. **What counts as a duplicate? Is that the right rule?**
    Same user + same name ignoring case + same coordinates to 9 decimal places. Alternatives: name only, or coordinates only. I'd confirm with the product owner, and I documented it as an assumption.
22. **What is a zip bomb and how do you protect against it?**
    A tiny ZIP that expands to gigabytes. I limit the upload size (multer), check the entry's declared uncompressed size *before* extracting, and check again after extraction.
23. **Why validate that the file is really a ZIP?**
    The filename can lie. I check the `PK` magic bytes and handle a corrupt archive gracefully (400).
24. **What if the file has 1 million rows?**
    The current limit is 10,000 rows / 5 MB, and inserts are batched by 500. For huge files: stream-parse, use a COPY into a staging table then `INSERT … SELECT … ON CONFLICT`, and process in a background job with a progress endpoint.
25. **Why keep the file in memory and not on disk?**
    It's small (≤5 MB) and processed immediately. No temp files to clean up or leak.

### Frontend and state
26. **Why React Query?**
    The location list is *server state*. React Query handles caching, loading/error flags, cancellation, refetching and invalidation. After any mutation I invalidate `['locations']`, so the map and list refresh. No manual syncing code.
27. **How do you keep the map and list consistent?**
    Both render **the same query result**. There is one source of truth, so they can't drift.
28. **How do you avoid showing outdated results when requests are slow?**
    The debounce reduces requests. The query key includes `q` and `page`, so a response for an old key never fills the current one. React Query passes an `AbortSignal` that cancels old requests. While loading, the previous rows are greyed out and disabled and markers are hidden, so outdated data is never presented as current.
29. **How do you prevent double submission?**
    A `useRef` flag (it updates synchronously, unlike state, so two very fast clicks can't both pass) and the button disabled while pending. The test clicks three times and expects one call.
30. **How do you keep the user's input when a request fails?**
    The form only resets *after* success. On error it shows the message and field errors, and the values stay. The upload page keeps the selected file.
31. **Why is the cache cleared on logout?**
    Otherwise, if user B logs in on the same browser, React Query could briefly show A's cached list. That's a data leak in the UI.
32. **Why does the map show only the current page?**
    It keeps it consistent with the list and avoids loading every record (the PDF says not to). For many locations I'd add a `?bbox=` endpoint for the visible map area plus marker clustering.
33. **Why debounce search?**
    Without it, typing "suria klcc" sends 10 requests. With it, one request is sent after the user pauses for 350 ms.

### Testing and quality
34. **What do your tests cover and why those?**
    The risky behaviour the PDF names: isolation, validation, upload (all-or-nothing, duplicates, bad files), auth errors, and frontend double-submit and error handling. Backend tests use a real Postgres so constraints and transactions are actually tested.
35. **Why a real DB instead of mocks in backend tests?**
    The unique index, `ON CONFLICT`, CHECK constraints and transactions *are* the behaviour. Mocking them would test nothing.
36. **What would you add with more time?**
    Refresh tokens with httpOnly cookies, Playwright E2E tests in CI, GitHub Actions, OpenAPI docs, bounding-box map queries with clustering, `pg_trgm` search, background processing for large uploads, structured logging and monitoring, and a password reset flow.

### Behavioural / process
37. **How did you plan the work? How long did it take?** Give honest numbers and your order (backend auth first, because everything depends on it).
38. **What was hardest?** A good answer is the upload rules (precision duplicates, all-or-nothing, zip edge cases) or stale-request handling.
39. **Did you use AI tools?** Be honest. Say what you used them for, and show that you understand and can change every line.

---

## 10. Live-change practice

Do each of these once before the interview. Note how long each takes.

| Task | Where to change | Hint |
|---|---|---|
| Change the page size from 10 to 5 | `frontend/src/pages/MapPage.tsx` `PAGE_SIZE` | The backend already supports `limit` |
| Add an optional **description** field | migration (new file), `location.schema.ts`, `location.service.ts` (`toLocation`, insert/update), `api/types.ts`, `LocationForm.tsx`, popup in `LocationMap.tsx` | Run `npm run migrate`. Never edit an old migration |
| Sort the list A–Z | `listLocations` `orderBy` | Maybe add a `sort` query param in `listQuerySchema` |
| Search also matches coordinates or is case-sensitive | `listLocations` | `whereILike` vs `whereLike` |
| Treat duplicates by name only | the unique index (new migration) + `dedupeKey` | Update the tests |
| Show the total count in the sidebar | new `useQuery` or reuse the list `total` | |
| Make the session last 15 minutes | `backend/.env` `JWT_EXPIRES_IN=15m` | The frontend timer reads `exp` automatically |
| Accept `;` as the separator in upload files | `parseLocationsText` `split(',')` → `split(/[;,]/)` | Add a unit test |
| Add a "Delete all my locations" button | new `DELETE /locations` route scoped by `user_id` + button + confirm | Keep the `user_id` filter! |
| Return 403 instead of 404 for others' records | Discuss why you *wouldn't* (section 9, Q6) | |

---

## 11. Troubleshooting

| Problem | Fix |
|---|---|
| `Invalid environment configuration` on start | `.env` missing or `JWT_SECRET` < 16 chars. Copy `.env.example` |
| `ECONNREFUSED 5432` | Postgres isn't running. Run `docker compose up -d db` |
| `database "locations_test" does not exist` | `createdb -U postgres locations_test` (Docker creates it on the first start of a fresh volume) |
| `password authentication failed` | Fix the user/password in `DATABASE_URL` |
| Map is grey, no tiles | No internet / OpenStreetMap blocked. Markers still work |
| Marker icons broken | Already handled in `LocationMap.tsx` (Leaflet + bundler icon fix) |
| Frontend calls fail with 404 / CORS | Backend not on :4000, or set `VITE_PROXY_TARGET`. With a separate host, set `VITE_API_URL` and `CORS_ORIGIN` |
| Docker: Postgres init script didn't run | It only runs on a **fresh** volume: `docker compose down -v` then up |
