
## First places to look

- `README.md`: overview, setup, and assumptions.
- `AI_WORKINGS.md`: the developer writes this file. Do not edit it.

## Repo layout

```
backend/
  app/
    main.py               # create the app, include routers, seed the trip
    db.py                 # SQLite engine and session
    models.py             # database tables
    schemas.py            # API request and response shapes, input validation
    legacy_payment.py     # Kindo's legacy code. Never edit.
    payment_gateway.py    # adapter: the only file that imports legacy_payment
    services/
      payment_service.py  # business rules: duplicates, amount from trip
    routers/              # thin HTTP layer: trips, registrations, payments
  tests/
frontend/
  src/
    App.tsx               # current step: register, pay, done
    api.ts                # all fetch calls
    validation.ts         # pure validation functions
    types.ts              # shared API types
    components/

```

## How to work with the developer

Act as an experienced teacher. The developer must understand all of the work and explain it at a demo.

- Work in small steps. Make one change for one concern at a time.
- If a change touches more than 2 files, write a short plan first. Wait for approval.
- After each step, explain:
  - why: the motivation at a high level;
  - how: the data structures and API shapes;
  - the risks: edge cases and possible bugs.
- Do not agree just to agree. If an idea has a problem, say so and explain the trade-offs.
- If you are not sure about a library API or its behavior, say so. Do not invent functions or options.
- Do not commit. The developer reads the diff and commits.
- Write in plain English: short words, active voice, short sentences (ASD-STE100 style).



## Architecture

Requests go through these layers in this order:

`schemas.py` (input shape) → `services/` (business rules) → `payment_gateway.py` (adapter) → `legacy_payment.py` (untouched)

- `legacy_payment.py` is Kindo's code. Treat it as an external system. Never edit it, and only import it in `payment_gateway.py`.
- Keep routers thin. They call a service and map the result to an HTTP response.
- Inject the gateway with a FastAPI dependency, so that tests can pass a fake gateway.
- `models.py` describes the database. `schemas.py` describes the API. Keep them separate. The API must not expose database fields by accident.

## Payment rules (always apply)

- Never store, log, or return the full card number or the CVV. Store `card_last4` only. Do not log request bodies.
- Store money as integer cents. Convert to a float only inside `payment_gateway.py`, for the legacy API.
- Take the amount from the trip in the database. Request schemas have no amount field.
- Before you call the gateway, check that the registration is not already paid. If it is, return 409 and do not call the gateway.
- Never retry a payment automatically. The legacy API has no idempotency key, so a retry can charge twice. The parent retries.
- Record every payment attempt, success or failure, as a transaction row.
- Use plain `def` for endpoints that call the gateway, not `async def`. The legacy code calls `time.sleep(1.5)`, which blocks.
- Catch exceptions from the legacy code in the gateway. Return 502 with "You have not been charged."
- Reject expired cards. The legacy code only checks the MM/YY format.


## Frontend rules

- Put all fetch calls in `api.ts`. Put validation in `validation.ts` as pure functions.
- Frontend validation is for user experience only. The backend is the source of truth.
- Show parents plain-language messages. Do not show raw error bodies, status codes, field keys, or route names. Use a generic message for unknown errors.
- While a payment request runs, disable the Pay button and show "Processing…".
- After a decline, keep the form values except the CVV.
- Design for mobile first with Tailwind. Use `inputMode="numeric"` on card fields.

## Typing

- Python: annotate every parameter and return value. Use `Literal["pending", "paid"]` for fixed sets of values. Use frozen dataclasses for structured results.
- TypeScript: do not use `any`. Narrow `unknown` values.
- Do not add helper functions that only call a dataclass or Pydantic model constructor. Create the object directly.

## Packages

- Pin each direct dependency to one exact version: `==` in `requirements.txt`, and `npm install --save-exact` for the frontend.
- Ask before you add a new dependency.

## Testing

- Backend (`pytest`):
  - `test_schemas.py`: valid input, and each validation failure.
  - `test_payment_gateway.py`: patch `time.sleep` and `random` to force success, decline, and a crash.
  - `test_payment_service.py`: use a fake gateway. Test that an already-paid registration does not call the gateway, that the amount comes from the trip, that a retry after a decline works, and that the full card number never reaches the database.
  - Use an in-memory SQLite database for tests.
- Frontend (Vitest): test `validation.ts` and form behavior: roles, labels, disabled state, request payloads, and messages. Do not assert Tailwind classes or colors.
- Do not make a test pass by removing assertions or adding waits. Find the cause.

## Commands

- Backend setup: `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
- Backend run: `cd backend && .venv/bin/uvicorn app.main:app --reload`
- Backend tests: `cd backend && .venv/bin/pytest`
- Frontend run: `cd frontend && npm run dev`
- Frontend tests: `cd frontend && npm test`

