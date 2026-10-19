# Trip Registration and Payment App

A full-stack web application developed for the Kindo Technical Challenge. It allows parents to view school trip details, register their child, make a simulated payment through Kindo's legacy payment API, and receive confirmation.

## Features

The application follows four steps:

1. **Trip Details** – View the trip date, location, description and cost.
2. **Child Registration** – Register a child using their student ID and parent/guardian details.
3. **Payment** – Enter payment details and submit a payment.
4. **Confirmation** – View the registration and payment result.

The application includes form validation, payment loading states, error handling and transaction recording.

## Technologies Used

- **Frontend:** React, TypeScript
- **Backend:** Python, FastAPI
- **Database:** SQLite
- **Styling:** Tailwind CSS
- **Testing:** pytest (backend), Vitest and React Testing Library (frontend)
- **AI Coding Agent:** Claude Code

## Running the Application Locally

**Requirements:** Python 3.11+ and Node.js 22.13+ or 24+. Tested with Python 3.12 and Node.js 24.

### 1. Clone the Repository

```bash
git clone https://github.com/Aleeza2023/kindo-trip-payments.git
cd kindo-trip-payments
```

### 2. Backend Setup

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

- **Windows:** `.venv\Scripts\activate`
- **Mac/Linux:** `source .venv/bin/activate`

Install dependencies and start the server:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend: http://localhost:8000

API documentation: http://localhost:8000/docs

The SQLite database is created automatically when the backend starts.

### 3. Frontend Setup

Open a new terminal from the repository root:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Demo Data

The application automatically creates one trip, **Hamilton Zoo Visit ($25.00)**, and the following sample students:

| Student ID | Student Name | School | Room |
|---|---|---|---|
| STU-1001 | Mia Smith | SCH-001 | Room 5 |
| STU-1002 | Sam Lee | SCH-001 | Room 5 |
| STU-1003 | Sam Lee | SCH-001 | Room 8 |
| STU-2001 | Ava Brown | SCH-002 | Room 2 |

STU-2001 is rejected because the student belongs to another school. Student IDs are case-insensitive.

Use any 16-digit test card number, a future expiry date (MM/YY) and a 3-digit CVV. No real payments are processed.

## Testing

Run backend tests from the `backend` directory, with the virtual environment activated

```bash
pytest
```

Run frontend tests from the `frontend` directory:

```bash
npm test
```

Backend tests use an in-memory database and a fake payment gateway. Frontend tests mock API requests, so neither test suite requires running servers.

Testing covers payment validation, transaction processing, error handling and key application behaviour.

## Key Design Decisions

- **Student identification:** Students are identified by unique IDs rather than names, allowing students with identical names to register separately.
- **Registration and transactions:** A registration is created before payment. Each payment attempt is recorded as a separate transaction, allowing failed payments to be retried.
- **Payment amount:** The backend retrieves the amount from the trip record rather than trusting a client-provided amount.
- **Money representation:** Amounts are stored as integer cents to avoid floating-point precision errors. Conversion to a float occurs only when calling the legacy API.
- **Card security:** Full card numbers and CVVs are never stored. Only the last four card digits are retained.
- **Validation:** Frontend and backend validation check required fields, card formats and expiry dates.
- **Legacy API integration:** The original `legacy_payment.py` remains unchanged. A separate `payment_gateway.py` handles communication with the processor.
- **Duplicate submissions:** The application includes safeguards against repeated payment submissions and does not automatically retry failed requests.

## Assumptions and Limitations

This is a prototype developed for the technical challenge.

- One trip is predefined and created automatically.
- Sample student records simulate a school database.
- The supplied legacy API simulates payment processing.
- Authentication, real payment processing and email receipts are outside the current scope.

## Future Improvements

For a production-ready application, I would consider:

- **School integration:** Connect to a real student management system with verified student and parent records.
- **Trip management:** Support multiple trips, dates, year levels and registration deadlines.
- **Registration rules:** Include eligibility checks, sibling discounts, concessions and capacity limits.
- **Secure payments:** Integrate Stripe or Windcave using secure hosted payment collection.
- **Payment reliability:** Implement provider-supported idempotency, reconciliation, refunds and payment history.
- **Security:** Add authentication, role-based access and protection of student and parent information.
- **Scalability:** Consider PostgreSQL, database migrations, structured logging and monitoring.
- **Testing:** Expand integration, concurrency and end-to-end test coverage.
- **Database:** SQLite is used to keep the application lightweight and easy to run locally. The database is created and seeded automatically when the backend starts. The local `app.db` file is excluded from version control to avoid committing generated data and transaction records.

## AI-Assisted Development

Claude Code was used to support development and code review. AI-generated suggestions were reviewed and evaluated against the project requirements.

Details of the AI workflow, key prompts, corrections and development decisions are documented in [AI_WORKINGS.md](AI_WORKINGS.md).