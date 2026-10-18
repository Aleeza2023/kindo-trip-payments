
# CLAUDE.md – Rules for Working on This Project

## Repo Layout

```text
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
    components/           # pages and shared UI: TextField, Notice, Card, buttons, Icons
    test-utils/           # test setup and fake fetch; tests sit next to components
```

## How I Want You to Work with Me

- Work in small steps. Show me the plan and wait for my approval before making changes.
- After each step, tell me why you did it, how it works, and what could go wrong.
- If you think my idea is wrong, say so.
- If you're unsure how a library works, tell me. Don't guess.
- Don't commit. I review and commit myself.
- Keep explanations short and in plain English.

## Architecture

```text
schemas.py
    |
    v
payment_service.py
    |
    v
payment_gateway.py
    |
    v
legacy_payment.py
```

- `schemas.py` validates the API input.
- `payment_service.py` handles business rules and payment decisions.
- `payment_gateway.py` communicates with the legacy processor.
- `legacy_payment.py` contains Kindo's original payment code and must remain unchanged.

I'm treating `legacy_payment.py` like a real external system I can't change. Only `payment_gateway.py` imports it, so replacing the legacy processor would require minimal changes to the rest of the application.

- Keep routers thin. They call the service (or, for a simple read like the trip, the database) and map the result to an HTTP response.
- Pass the gateway in as a FastAPI dependency so tests can use a fake one.
- Keep `models.py` (the database) and `schemas.py` (the API) separate so database fields are not accidentally exposed to the frontend.

## Payment Rules (Always Apply)

- Never save, log, or return the full card number or CVV. Keep only the last four card digits.
- Validation errors (422) must never repeat card data. Keep the error handler in `main.py`.
- The price comes from the trip, not the browser. Payment requests don't include an amount.
- Prevent repeated payments for an already-paid registration. Return HTTP 409 without calling the gateway.
- Record each payment attempt as a separate transaction, whether it succeeds or fails.


## Frontend Rules

- Keep fetch calls in `api.ts` and form validation in `validation.ts`.
- Parents should see friendly messages, never raw errors or HTTP status codes.
- Disable the Pay button and show "Processing..." while a payment is running.
- Use shared components (`TextField`, `Notice`, `Card`, and buttons) to keep styling consistent.
- Use Tailwind CSS without adding an unnecessary UI library.
- Every input must have a clear, accessible label.
- Keep the application responsive for laptops, tablets, and mobile devices.

## Typing

- Avoid using `any` in TypeScript. Use appropriate types for data, props, and API responses.

## Testing

- Backend (pytest): test registration validation, payment processing, duplicate-payment prevention, and transaction recording using an in-memory SQLite database and a fake gateway.
- Frontend (Vitest): test `validation.ts` and form behaviour, not Tailwind CSS classes.
- If a test fails, investigate the cause. Don't remove assertions or add arbitrary delays just to make it pass.
- Run relevant tests after making changes and report the results.

## Commands

### Backend Setup

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

Windows:
```bash
.venv\Scripts\activate
```

Mac/Linux:
```bash
source .venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

### Run Backend

From the `backend` directory with the virtual environment activated:

```bash
uvicorn app.main:app --reload
```

### Backend Tests

From the `backend` directory:

```bash
python -m pytest
```

### Run Frontend

From the repository root:

```bash
cd frontend
npm run dev
```

### Frontend Tests

From the `frontend` directory:

```bash
npm test
```
