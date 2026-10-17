import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { fakeFetch, futureExpiry, sentBody } from "../test/fakeFetch";
import { PaymentForm } from "./PaymentForm";

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
const DECLINED = { ...PAID, status: "failed", registration_status: "pending" };

function renderForm(onPaid = vi.fn()) {
  render(<PaymentForm registrationId="reg-1" cost="25.00" onPaid={onPaid} onBack={vi.fn()} />);
  return onPaid;
}

async function fillInCard(expiry = futureExpiry()) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Card number"), "4242424242424242");
  await user.type(screen.getByLabelText("Expiry (MM/YY)"), expiry.replace("/", ""));
  await user.type(screen.getByLabelText("CVV"), "987");
  await user.click(screen.getByRole("button", { name: "Pay now $25.00" }));
}

describe("PaymentForm", () => {
  it("sends the card without spaces and with no amount, then reports success", async () => {
    const fetchMock = fakeFetch({ status: 200, body: PAID });
    const onPaid = renderForm();

    await fillInCard("12/30");

    expect(sentBody(fetchMock)).toEqual({
      card_number: "4242424242424242",
      expiry_date: "12/30",
      cvv: "987",
    });
    expect(onPaid).toHaveBeenCalledWith(PAID);
  });

  it("disables the button and shows Processing… while the payment runs", async () => {
    let finish: (response: Response) => void = () => {};
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => (finish = resolve))));
    renderForm();

    await fillInCard();

    const button = screen.getByRole("button", { name: "Processing…" });
    expect(button).toBeDisabled();

    finish(new Response(JSON.stringify(PAID), { status: 200 }));
    expect(await screen.findByRole("button", { name: "Pay now $25.00" })).toBeEnabled();
  });

  it("after a decline, keeps the card and expiry but clears the CVV", async () => {
    fakeFetch({ status: 200, body: DECLINED });
    const onPaid = renderForm();

    await fillInCard();

    expect(await screen.findByRole("alert")).toHaveTextContent("declined. You have not been charged");
    expect(screen.getByLabelText("Card number")).toHaveValue("4242 4242 4242 4242");
    expect(screen.getByLabelText("Expiry (MM/YY)")).toHaveValue(futureExpiry());
    expect(screen.getByLabelText("CVV")).toHaveValue("");
    expect(onPaid).not.toHaveBeenCalled();
  });

  it("explains a payment service failure without showing the error", async () => {
    fakeFetch({ status: 502, body: { detail: "Bad gateway" } });
    renderForm();

    await fillInCard();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("not available right now. You have not been charged");
    expect(alert).not.toHaveTextContent("502");
    expect(alert).not.toHaveTextContent("Bad gateway");
  });

  it("shows a general message if the backend can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));
    renderForm();

    await fillInCard();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong");
    expect(alert).not.toHaveTextContent("Failed to fetch");
  });

  it("checks the card before calling the backend", async () => {
    const fetchMock = fakeFetch();
    renderForm();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Card number"), "4242");
    await user.type(screen.getByLabelText("Expiry (MM/YY)"), "1320");
    await user.click(screen.getByRole("button", { name: "Pay now $25.00" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("Please enter the 16-digit card number.")).toBeInTheDocument();
    expect(screen.getByText("Please enter a month from 01 to 12.")).toBeInTheDocument();
    expect(screen.getByText("Please enter the 3-digit CVV.")).toBeInTheDocument();
  });
});
