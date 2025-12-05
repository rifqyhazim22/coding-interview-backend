# Implementation Notes

**Candidate:** Rifqy (Vibe Coder)  
**Date:** 2025-12-05  
**Time Spent:** ~2.5 hours

## Main Bugs/Issues Found

### 1. Missing validation & weak errors (TodoService)
**Issue:** `createTodo` accepted any input, didn't verify users, and threw generic errors.  
**Fix:** Added typed `CreateTodoInput`, Validation/NotFound errors, title/remindAt parsing, and user existence checks.  
**Impact:** Prevents invalid todos, clearer failure modes, tests expecting rejections now pass.

### 2. In-memory repository inconsistencies (InMemoryTodoRepository)
**Issue:** `update` created phantom todos, random IDs could collide, reminder filtering ignored status, and data was returned mutably.  
**Fix:** Deterministic IDs, no creation on unknown updates, reminder filtering for `PENDING` with `remindAt <= now`, monotonic `updatedAt`, and cloned returns.  
**Impact:** Correct reminder processing, stable IDs, idempotent updates, and safer data handling.

### 3. Reminder processing & scheduler robustness
**Issue:** Reminders updated todos without status guards; scheduler allowed duplicate intervals and unhandled errors.  
**Fix:** `processReminders` now guards `PENDING` todos; `SimpleScheduler` replaces duplicate tasks and wraps executions in try/catch; wired recurring job in `main`.  
**Impact:** Idempotent reminder runs and resilient background execution.

## How I Fixed Them
- **Type safety:** Introduced `CreateTodoInput`, avoided `any`, and parsed optional dates explicitly.
- **Validation:** Enforced non-empty titles, required userId/email/name, and validated `remindAt` formats.
- **Data integrity:** Clone reads, deterministic IDs, monotonic `updatedAt`, and removed phantom updates.
- **Logic errors:** Proper reminder filtering, status-aware processing, and idempotent completion.
- **Error handling:** Custom Validation/NotFound errors mapped to HTTP 400/404 responses.

## Framework/Database Choices
- **HTTP Framework:** Express – minimal setup, easy routing/middleware, fits small API quickly.
- **Database:** In-memory repositories (provided) – adequate for exercise scope and tests.
- **Other Libraries:** None beyond Express/ts-jest tooling already present.

## How to Run My Implementation
1) Install deps: `npm install`  
2) Run tests: `npm test`  
3) Run dev server: `npm run dev` (ts-node)  
4) Build & start: `npm run build && npm start` (listens on `PORT` or 3000)

## Optional Improvements Implemented
- Scheduler safety (duplicate protection + error trapping).
- Defensive cloning in repositories to avoid external mutation.
- Soft delete for todos (`deletedAt`) and DELETE /todos/:id route; listing/reminders ignore deleted.
- Pagination support on GET /todos (limit/offset query params).
- Structured logging for reminder processing (count/duration).
- Repository factory to swap implementations (memory by default, extensible to DB).
- Input validation via zod schemas in HTTP layer.

## Future Improvements
1) Swap in persistent storage (e.g., SQLite/Postgres via Prisma/Drizzle) with migrations.  
2) Add request validation library (zod) and structured logging.  
3) Pagination/filters on todo listing plus soft-delete support.

## Assumptions Made
1) In-memory storage is acceptable for the exercise scope.  
2) Minimal API surface per README suffices (no auth/multi-tenant concerns).  
3) Reminder job cadence of 60s is fine for the demo.

## Challenges Faced
1) ts-jest unused import warning in tests – handled via transform diagnostics config.  
2) Millisecond-level timestamp equality causing flaky `updatedAt` comparison – fixed with monotonic updates.

## Additional Comments
HTTP endpoints implemented: `POST /users`, `POST /todos`, `GET /todos?userId=...`, `PATCH /todos/:id/complete`; reminder job scheduled every 60s in `main`.
