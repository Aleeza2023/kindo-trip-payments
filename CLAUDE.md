# CLAUDE.md – rules for working on this project

## First places to look

- `README.md`: overview, setup, and assumptions.
- `AI_WORKINGS.md`: the developer writes this file. Do not edit it.

## Repo Layout

```
backend/
  app/
    main.py               # create the app, include routers, seed the trip and students, 422 handler
    db.py                 # SQLite engine and session, foreign keys switched on
    models.py             # database tables
    schemas.py            # API request and response shapes, input validation
    legacy_payment.py     # Kindo's legacy code. Never edit.
    payment_gateway.py    # adapter: the only file that imports legacy_payment
    services/
      payment_service.py  # business rules: student check, duplicates, amount from trip, double-click lock
    routers/              # thin HTTP layer: trips, registrations, payments
  tests/                  # conftest.py (in-memory database), fakes.py (fake gateway), one test file per layer
frontend/
  src/
    App.tsx               # current step: trip details, register, pay, done
    api.ts                # all fetch calls
    validation.ts         # pure validation functions
    format.ts             # date formatting
    types.ts              # shared API types
    components/           # pages, plus shared UI: TextField, Notice, ui.tsx, Icons
    test-utils/           # test setup and a fake fetch; the tests sit next to the components
doc/
  plan.md                 # build plan and key decisions
```

## How I want you to work with me

- Work in small steps. If a change touches more than two files, check the plan with me first.
- After each step, tell me why you did it, how it works, and what could go wrong.
- If you think my idea is wrong, say so.
- If you're unsure how a library works, tell me. Don't guess.
- Don't commit. I review and commit myself.
- Keep explanations short and in plain English.

## Architecture

```
schemas.py ──→ payment_service.py ──→ payment_gateway.py ──→ legacy_payment.py
(is the input  (is it allowed?)       (talk to legacy safely;  (Kindo's code,
 valid?)                               the ONLY file that       unchanged)
                                       imports legacy)
```

I'm treating legacy_payment.py like a real external system I can't change. Only payment_gateway.py imports it, so if it were ever replaced, that's the only file that would change.

- Keep routers thin. They call the service (or, for a simple read like the trip, the database) and map the result to an HTTP response.
- Pass the gateway in as a FastAPI dependency, so tests can use a fake one.
- Keep models.py (the database) and schemas.py (the API) separate, so a database field never reaches the browser by accident.

## Payment rules (always apply)

- No card data stored. Never save, log or return the full card number or CVV. Keep the last 4 digits only.
- Validation errors (422) must never repeat card data. Keep the error handler in main.py.
- Money in cents. Only convert to a float inside payment_gateway.py, because the legacy API wants one.
- The price comes from the trip, not the browser. Requests don't include an amount.
- Children are identified by student ID. The typed name must match the school's record, ignoring case.
- If the child is already registered but not paid, return the existing registration. If they're paid, return 409.
- No double payments. If the child is already paid for, return 409 and don't call the gateway.
- Two clicks at the same moment must only charge once. Keep the lock in payment_service.py.
- No automatic retries. The legacy API can't spot a repeat, so a retry could charge twice. Let the parent decide.
- Record every attempt, whether it worked or not.
- Use def, not async def, for endpoints that call the gateway. The legacy code sleeps for 1.5 seconds and would block the server.
- Expect the legacy code to fail. Catch its errors and return 502 with "You have not been charged."
- Reject expired cards. The legacy code only checks the MM/YY format.
- Parents see the processor's TX number as the "Transaction number", never our internal ID.

## Frontend rules

- Fetch calls go in api.ts, and form checks go in validation.ts.
- Frontend checks are there to help the parent. The backend still checks everything.
- Parents only see friendly messages, never raw errors or status codes.
- Disable the Pay button and show "Processing…" while a payment runs.
- After a decline, keep what the parent typed, except the CVV.
- Use the shared components (TextField, Notice, Card and the buttons) so the styling stays consistent.
- Tailwind only. 
- Every input has a label. 


## Typing

- Type hints on every Python function. Use Literal["pending", "paid"] for statuses instead of plain strings.
- SQLModel can't build a column from a Literal, so use sa_type=String plus a CHECK constraint.
- No "any" in TypeScript.


## Packages

- Pin exact versions: `==` in requirements.txt, and `npm install --save-exact` for the frontend.
- Ask before adding a new dependency.

## Testing

- Backend (pytest): check the schema rules, the gateway (patch time.sleep and random so tests are fast and predictable), and the payment service with a fake gateway. Most important: an already-paid child is never charged again, the price comes from the trip, and the full card number never reaches the database. Use an in-memory SQLite database.
- Frontend (Vitest): test validation.ts and how the form behaves, not which Tailwind classes it uses.
- If a test fails, find out why. Don't delete the assertion or add a wait to make it pass.

## Commands

- Backend setup: `cd backend`, `python -m venv .venv`, activate it (Windows: `.venv\Scripts\activate`, Mac/Linux: `source .venv/bin/activate`), then `pip install -r requirements.txt`
- Backend run (venv activated): `cd backend && uvicorn app.main:app --reload`
- Backend tests (venv activated): `cd backend && python -m pytest`
- Frontend run: `cd frontend && npm run dev`
- Frontend tests: `cd frontend && npm test`
