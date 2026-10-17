import { useState, type FormEvent } from "react";

import { pay, type PayResult } from "../api";
import type { Payment } from "../types";
import {
  formatCardNumber,
  formatExpiry,
  validateCardNumber,
  validateCvv,
  validateExpiry,
} from "../validation";
import { ArrowLeftIcon, CardIcon, LockIcon } from "./Icons";
import { Notice } from "./Notice";
import { TextField } from "./TextField";
import { Card, primaryButton, secondaryButton } from "./ui";

const MESSAGES: Record<Exclude<PayResult["kind"], "paid">, string> = {
  declined:
    "Your payment was declined. You have not been charged. Please check your card details and try again.",
  already_paid: "Your child is already paid for this trip. You have not been charged again.",
  unavailable: "The payment service is not available right now. You have not been charged. Please try again soon.",
  error: "Something went wrong and we couldn't confirm your payment. Please try again in a moment.",
};

interface Errors {
  cardNumber?: string | null;
  expiry?: string | null;
  cvv?: string | null;
}

interface PaymentFormProps {
  registrationId: string;
  cost: string; // dollars, e.g. "25.00"
  onPaid: (payment: Payment) => void;
  onBack: () => void;
}

export function PaymentForm({ registrationId, cost, onPaid, onBack }: PaymentFormProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  /** Update a field and clear its error, so the message goes away as the parent fixes it. */
  function edit(field: keyof Errors, setValue: (value: string) => void) {
    return (value: string) => {
      setValue(value);
      setErrors((current) => ({ ...current, [field]: null }));
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found: Errors = {
      cardNumber: validateCardNumber(cardNumber),
      expiry: validateExpiry(expiry),
      cvv: validateCvv(cvv),
    };
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setProcessing(true);
    setMessage(null);
    // No amount is sent: the backend takes the price from the trip.
    const result = await pay(registrationId, {
      card_number: cardNumber.replace(/ /g, ""),
      expiry_date: expiry,
      cvv,
    });
    setProcessing(false);

    if (result.kind === "paid") {
      onPaid(result.payment);
      return;
    }
    // Keep what the parent typed so they can fix or retry, but never keep the CVV.
    setCvv("");
    setMessage(MESSAGES[result.kind]);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card className="flex flex-col gap-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <CardIcon className="h-5 w-5 text-blue-600" />
          Card information
        </h2>
        <TextField
          id="card-number"
          label="Card number"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="1234 5678 9012 3456"
          value={cardNumber}
          onChange={edit("cardNumber", (value) => setCardNumber(formatCardNumber(value)))}
          error={errors.cardNumber}
          valid={validateCardNumber(cardNumber) ? null : "Valid card number"}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="expiry"
            label="Expiry (MM/YY)"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/YY"
            value={expiry}
            onChange={edit("expiry", (value) => setExpiry(formatExpiry(value)))}
            error={errors.expiry}
            valid={validateExpiry(expiry) ? null : "Valid expiry date"}
          />
          <TextField
            id="cvv"
            label="CVV"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            maxLength={3}
            value={cvv}
            onChange={edit("cvv", (value) => setCvv(value.replace(/\D/g, "")))}
            error={errors.cvv}
            valid={validateCvv(cvv) ? null : "Valid CVV"}
          />
        </div>
        {message && <Notice tone="error">{message}</Notice>}
      </Card>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button type="button" onClick={onBack} disabled={processing} className={secondaryButton}>
          <ArrowLeftIcon />
          Back
        </button>
        <button type="submit" disabled={processing} className={`${primaryButton} sm:min-w-56`}>
          <LockIcon />
          {processing ? "Processing…" : `Pay now $${cost}`}
        </button>
      </div>
    </form>
  );
}
