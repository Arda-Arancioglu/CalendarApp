# Squad & Routine Calendar Platform

🔗 **Live Application:** [calendar-app-pi-rouge.vercel.app](https://calendar-app-pi-rouge.vercel.app)

A full-stack calendar and group scheduling platform built with Spring Boot and React. Supports standard recurrence, custom multi-day gym/shift cycle routines, scoped event edits, and squad availability sharing.

## Tech Stack

- **Backend:** Java 21, Spring Boot 3.3, Spring Data JPA, Hibernate, Spring Security (JWT)
- **Database:** PostgreSQL (Neon Serverless in Production, local PG for dev)
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, Lucide React
- **Deployment:** Render (Docker container for Backend), Vercel (Frontend SPA)

## Key Features

- **Standard & Multi-Day Recurrence:** Daily, weekly, monthly, and yearly recurrences expanded dynamically in memory with zero database bloat. Supports custom day intervals (e.g. `[Mon, Wed, Fri]`).
- **Scoped Edits & Deletions:** Modify single occurrences, this-and-future occurrences, or entire series (`THIS_AND_FOLLOWING`, `SELECTED`, `ALL`).
- **Cycle-Based Routines:** Non-weekly $N$-day cycles (push/pull/legs splits, hospital shifts) with surgical shift engines that slide schedules forward while preserving past history.
- **Squad Privacy Controls:** Share availability across groups with `PUBLIC`, `BUSY_ONLY`, and `MUTED` privacy tiers.
- **Theme Personalization:** Persistent cross-device custom hex/RGB palette sync.

## Project Structure

```
├── Backend/
│   ├── src/main/java/com/aa/calendar/
│   │   ├── controller/
│   │   ├── dto/           # Grouped by domain (auth, category, event, squad, user)
│   │   ├── entity/
│   │   ├── repository/
│   │   ├── security/
│   │   └── service/
│   └── pom.xml
└── Frontend/
    ├── src/
    │   ├── components/
    │   ├── context/
    │   ├── hooks/
    │   ├── pages/
    │   └── services/
    └── package.json
```

## Local Development

### 1. Prerequisites
- JDK 21+
- Node.js 20+
- PostgreSQL instance running locally or Neon connection string

### 2. Backend Setup
1. Configure database credentials in `Backend/src/main/resources/application.properties` (or set environment variables `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`).
2. Run backend:
   ```bash
   cd Backend
   ./mvnw spring-boot:run
   ```
   Backend starts on `http://localhost:8080`.

### 3. Frontend Setup
1. Install dependencies:
   ```bash
   cd Frontend
   npm install
   ```
2. Start dev server:
   ```bash
   npm run dev
   ```
   Frontend starts on `http://localhost:5173`.

## Testing

- Backend tests:
  ```bash
  cd Backend
  ./mvnw test
  ```
- Frontend tests:
  ```bash
  cd Frontend
  npm run test
  ```
