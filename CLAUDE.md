# CLAUDE.md – rules for working on this project

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
- The price comes from the trip, not the browser. Requests don't include an amount.
- No double payments. If the child is already paid for, return 409 and don't call the gateway.
- Record every attempt, whether it worked or not as transaction.

## Frontend rules

- Fetch calls go in api.ts, and form checks go in validation.ts.
- Parents only see friendly messages, never raw errors or status codes.
- Disable the Pay button and show "Processing…" while a payment runs.
- Use the shared components (TextField, Notice, Card and the buttons) so the styling stays consistent.
- Tailwind only. 
- Every input has a label. 


## Typing

- No "any" in TypeScript.

## Testing

- Frontend (Vitest): test validation.ts and how the form behaves, not which Tailwind classes it uses.
- If a test fails, find out why. Don't delete the assertion or add a wait to make it pass.

## Commands

- Backend setup: `cd backend`, `python -m venv .venv`, activate it (Windows: `.venv\Scripts\activate`, Mac/Linux: `source .venv/bin/activate`), then `pip install -r requirements.txt`
- Backend run (venv activated): `cd backend && uvicorn app.main:app --reload`
- Backend tests (venv activated): `cd backend && python -m pytest`
- Frontend run: `cd frontend && npm run dev`
- Frontend tests: `cd frontend && npm test`
