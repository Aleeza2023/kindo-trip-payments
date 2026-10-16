# Trip Registration and Payment App

A simple web application that allows parents to view trip details, register their child, and complete a payment through Kindo's legacy payment API.

## Features

The application follows four main steps:

1. **Trip Details** – View information about the trip, including the date, location, and cost.
2. **Child Registration** – Enter the child's details to register for the trip.
3. **Payment** – Enter payment details and submit the payment.
4. **Confirmation** – Display the registration and payment result.

## Technologies Used

- **Frontend:** React, TypeScript
- **Backend:** Python, FastAPI
- **Database:** SQLite
- **Styling:** Tailwind CSS
- **Testing:** Pytest
- **AI Coding Agent:** Claude

## Running the Application Locally

You need **Python 3.11+** and **Node.js 20+** installed.

### 1. Clone the Repository

```bash
git clone https://github.com/Aleeza2023/kindo-trip-payments.git
cd kindo-trip-payments
```

### 2. Set Up the Backend

Navigate to the backend directory and create a virtual environment:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

- **Windows:** `.venv\Scripts\activate`
- **Mac/Linux:** `source .venv/bin/activate`

Install the required dependencies:

```bash
pip install -r requirements.txt
```

Start the backend server:

```bash
uvicorn app.main:app --reload
```

The backend should be available at http://localhost:8000. The API documentation is at http://localhost:8000/docs.

The database is created automatically when the backend starts.

### 3. Set Up the Frontend

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install the dependencies:

```bash
npm install
```

Start the application:

```bash
npm run dev
```

Open http://localhost:5173 in your browser.


## Testing

Backend tests can be run from the backend directory, with the virtual environment activated:

```bash
cd backend
pytest
```

## Design Decisions

**Working with the legacy payment API**

- `legacy_payment.py` is kept exactly as Kindo provided it. Only `payment_gateway.py` talks to it, so if the legacy API were replaced, only that file would need to change.
- My code checks things the legacy API doesn't: it checks that the card hasn't expired (the legacy code only checks the MM/YY format), checks that card fields are text so the legacy code can't crash on a number, and catches any error it throws.

- No double payments
- No automatic retries
- No card data stored (only last 4 digits are stored)


## Assumptions

- There is one trip, created automatically when the backend starts.
- A child is identified by their student ID.
- Parents don't need to log in.

## AI-Assisted Development

- [CLAUDE.md](CLAUDE.md) – Project instructions and guidelines for the Claude agent.
- [AI_WORKINGS.md](AI_WORKINGS.md) – AI tools used, key prompts, issues encountered, and how they were resolved.

## Limitations and Future Improvements

For a real product, I would:

- Use a card provider such as Stripe or Windcave, so the app never handles card numbers.
- Add idempotency keys, so retries are always safe.
- Prevent two payments at exactly the same moment with a database lock.
- Add parent login, refunds, and payment deadlines.

