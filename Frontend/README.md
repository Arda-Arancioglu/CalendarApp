# SquadSync Calendar — Frontend

A modern dark-themed React + TypeScript + Vite frontend for the **SquadSync Calendar** Spring Boot REST API. Manage your personal schedule with color-coded categories, create or join **Squads** via 8-character invite codes, control per-squad event visibility (`PUBLIC`, `BUSY`, `MUTED`), and find common free time across squad members.

---

## Features

- **Authentication & Proactive Session Handling**
  - Register (`POST /api/auth/register`) and Login (`POST /api/auth/login`) with client-side Zod validation and server field-error mapping.
  - Validates existing sessions on boot via `GET /api/user/me`.
  - Decodes the JWT `exp` claim client-side to schedule a proactive logout timer at the exact expiration timestamp, plus automatic logout on any `401 Unauthorized` response.
- **Personal Calendar (`/calendar`)**
  - Month, Week, and Day views powered by FullCalendar.
  - Click or drag any time range to create an event; click an event to inspect details, edit, or delete.
  - Drag events to reschedule or resize from **both the top and bottom edges** (`PUT /api/events/{id}` with optimistic rollback on error).
  - Filter visible events by category, plus visual indicators for **Private** (`Lock` badge) and **Flexible** (dashed border) events.
- **Color-Coded Categories (`/categories`)**
  - 12-swatch palette + custom `#RRGGBB` hex input with live event chip preview.
  - Protects default categories (`isDefault: true`) from deletion in the UI.
- **Squads & Shared Availability (`/squads`, `/squads/:squadId`, `/squads/:squadId/calendar`)**
  - Create a squad or join via an 8-character invite code (auto-uppercased).
  - Role-based member management (`OWNER`, `ADMIN`, `VIEWER`) enforced via a centralized permission matrix (`src/utils/permissions.ts`):
    - **Change role** modal supporting promotions/demotions and two-step **Ownership Transfer**.
    - **Kick member**, **Leave squad** (disabled for `OWNER` until ownership is transferred), and **Delete squad** (type-to-confirm dialog).
  - Per-squad visibility selector (`PUBLIC`, `BUSY`, `MUTED`).
  - **Squad Calendar** with per-member color assignment, member visibility toggles, and an client-side **Free-Time Finder** (`08:00–22:00`, minimum `30` minutes) that highlights windows where all visible members are free.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | React 19 + TypeScript (strict mode) + Vite |
| Routing | React Router v7 |
| Server State | TanStack Query v5 (`@tanstack/react-query`) |
| Calendar UI | FullCalendar v6 (`daygrid`, `timegrid`, `interaction`) |
| Forms & Validation | React Hook Form + Zod |
| Styling & Icons | Tailwind CSS v4 + Lucide React |
| Date Utilities | `date-fns` v4 |
| Testing & Linting | Vitest + React Testing Library + Oxlint |

---

## Getting Started

### 1. Environment Variables

Copy `.env.example` to `.env` (already configured by default):

```ini
VITE_API_URL=http://localhost:8080
```

All API calls are sent to `${VITE_API_URL}/api/...`.

### 2. Install & Run

```bash
npm install
npm run dev
```

The dev server is pinned to **`http://localhost:5173`** (`strictPort: true` in `vite.config.ts`) so it always matches the Spring Boot CORS origin list.

### 3. Quality Checks & Tests

```bash
npm test          # Run unit & component tests once (Vitest)
npm run lint      # Run Oxlint (0 warnings / 0 errors)
npm run build     # Run strict TypeScript check (tsc -b) + production Vite build
```

---

## Spring Boot CORS Requirements

Make sure your Spring Security / WebMvc CORS configuration allows:

- **Allowed Origins**: `http://localhost:5173` (and optionally `http://localhost:3000`)
- **Allowed Methods**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`
- **Allowed Headers**: `Authorization`, `Content-Type`, `Accept`

---

## Architecture & Security Notes

### LocalDateTime Serialization (No UTC Shift)
Spring Boot uses `java.time.LocalDateTime` (wall-clock date and time without a timezone). Using `Date.prototype.toISOString()` in JavaScript converts local time to UTC and appends `"Z"`, shifting events by the user's UTC offset. All date conversions go through `src/utils/date.ts` (`toApiDateTime` / `fromApiDateTime`), which always format and parse `"yyyy-MM-dd'T'HH:mm:ss"` in local time.

### JWT Storage & XSS Considerations
The JWT is stored in `localStorage` under `calendar.auth.token` and attached via `Authorization: Bearer <token>`. Because `localStorage` is readable by JavaScript, production deployments should enforce a strict Content Security Policy (CSP), never render unsanitized HTML (`dangerouslySetInnerHTML` is never used in this codebase), or migrate to an `httpOnly; SameSite=Strict; Secure` cookie paired with CSRF protection.

---

## Backend Notes & Compatibility Bridges

While integrating with the Spring Boot backend (`..\Backend`), the frontend includes a few defensive compatibility bridges:

1. **`EventResponseDTO` ID field (`taskId` vs `eventId`)**:
   - The backend `EventResponseDTO` record serializes the primary key as `taskId` rather than `eventId`. `src/api/events.ts` normalizes every event response so both `event.eventId` and `event.taskId` are populated and `PUT /api/events/{eventId}` / `DELETE /api/events/{eventId}` always receive a valid numeric ID.
2. **Squad Calendar query parameters (`startTime`/`endTime` vs `start`/`end`)**:
   - `SquadController#getSquadCalendar` expects `@RequestParam LocalDateTime startTime` and `@RequestParam LocalDateTime endTime`. `src/api/squads.ts` sends both `start`/`end` and `startTime`/`endTime` query parameters so either signature works seamlessly.
3. **`SquadService#getSquadDetails` argument order**:
   - In `SquadService.java`, `squadMemberRepository.findBySquad_SquadIdAndUser_UserId(squadId, userId)` requires `(squadId, userId)` in that order. Ensure `(squadId, userId)` is passed so viewing a squad whose ID differs from your `userId` does not throw a `403`.
4. **Updating categories (`PUT /api/categories/{id}`)**:
   - If the backend only exposes `GET`, `POST`, and `DELETE` on `/api/categories`, adding `@PutMapping("/{categoryId}")` will enable editing existing categories from the Categories page.
