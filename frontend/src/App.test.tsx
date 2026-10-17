import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import App from "./App";
import { fakeFetch, futureExpiry } from "./test-utils/fakeFetch";

const TRIP = {
  id: "TRIP-ZOO-2026",
  name: "Hamilton Zoo Visit",
  date: "2026-11-12",
  location: "Hamilton Zoo",
  cost_cents: 2500,
  cost: "25.00",
};
const REGISTRATION = {
  id: "reg-1",
  trip_id: "TRIP-ZOO-2026",
  student_id: "STU-1001",
  student_name: "Mia Smith",
  status: "pending",
  already_registered: false,
};
const PAID = {
  transaction_id: "txn-1",
  payment_reference: "TX-1792233729-4821",
  status: "success",
  registration_status: "paid",
  amount_cents: 2500,
  amount: "25.00",
  card_last4: "4242",
  message: "Payment successful.",
};

type User = ReturnType<typeof userEvent.setup>;

async function openRegistration(user: User) {
  await user.click(await screen.findByRole("button", { name: "Register for trip" }));
}

async function register(user: User) {
  await user.type(screen.getByLabelText("Student ID"), "STU-1001");
  await user.type(screen.getByLabelText("Student name"), "Mia Smith");
  await user.type(screen.getByLabelText("Parent/guardian name"), "Jane Smith");
  await user.click(screen.getByRole("button", { name: "Continue to payment" }));
}

describe("App", () => {
  it("goes from trip details to registration, payment and confirmation", async () => {
    fakeFetch(
      { status: 200, body: TRIP },
      { status: 201, body: REGISTRATION },
      { status: 200, body: PAID },
    );
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Hamilton Zoo Visit" })).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();

    await openRegistration(user);
    await register(user);

    expect(await screen.findByRole("heading", { name: "Payment details" })).toBeInTheDocument();
    expect(screen.getByText("Mia Smith")).toBeInTheDocument(); // in the payment summary
    await user.type(screen.getByLabelText("Card number"), "4242424242424242");
    await user.type(screen.getByLabelText("Expiry (MM/YY)"), futureExpiry().replace("/", ""));
    await user.type(screen.getByLabelText("CVV"), "987");
    await user.click(screen.getByRole("button", { name: "Pay now $25.00" }));

    expect(await screen.findByRole("heading", { name: "Payment successful!" })).toBeInTheDocument();
    expect(screen.getByText("Ending in 4242")).toBeInTheDocument();
    // Parents see the processor's TX- number as their transaction number, never our internal ID.
    expect(screen.getByText("Transaction number")).toBeInTheDocument();
    expect(screen.getByText("TX-1792233729-4821")).toBeInTheDocument();
    expect(screen.queryByText("txn-1")).not.toBeInTheDocument();
  });

  it("keeps the registration details when the parent goes back from payment", async () => {
    fakeFetch({ status: 200, body: TRIP }, { status: 201, body: REGISTRATION });
    const user = userEvent.setup();
    render(<App />);

    await openRegistration(user);
    await register(user);
    await screen.findByRole("heading", { name: "Payment details" });
    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByLabelText("Student ID")).toHaveValue("STU-1001");
    expect(screen.getByLabelText("Parent/guardian name")).toHaveValue("Jane Smith");
  });

  it("shows a friendly message when the trip can't be loaded", async () => {
    fakeFetch({ status: 500, body: { detail: "Internal Server Error" } });
    render(<App />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("couldn't load the trip");
    expect(alert).not.toHaveTextContent("500");
  });

  it("tells the parent when their child was already registered", async () => {
    fakeFetch(
      { status: 200, body: TRIP },
      { status: 200, body: { ...REGISTRATION, already_registered: true } },
    );
    const user = userEvent.setup();
    render(<App />);

    await openRegistration(user);
    await register(user);

    // Information, not an error: role "status", so screen readers don't interrupt.
    expect(await screen.findByRole("status")).toHaveTextContent("already registered");
    expect(screen.getByLabelText("Card number")).toBeInTheDocument();
  });
});
