import type { ReactNode } from "react";

import { formatDate } from "../format";
import type { Payment, Registration, Trip } from "../types";
import { CheckIcon } from "./Icons";
import { Card, primaryButton } from "./ui";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:justify-between">
      <dt className="text-slate-600">{label}</dt>
      <dd className="font-medium text-slate-900 sm:text-right">{children}</dd>
    </div>
  );
}

interface ConfirmationProps {
  trip: Trip;
  registration: Registration;
  payment: Payment;
  onDone: () => void;
}

export function Confirmation({ trip, registration, payment, onDone }: ConfirmationProps) {
  return (
    <Card padded={false} className="mx-auto max-w-2xl p-6 text-center sm:p-10">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckIcon className="h-9 w-9 text-green-600" />
      </div>
      <h1 className="mt-4 text-3xl font-bold text-slate-900">Payment successful!</h1>
      <p className="mt-2 text-slate-600">
        {registration.student_name} is registered for {trip.name}. Please keep your transaction number
        below for your records.
      </p>

      <dl className="mt-8 divide-y divide-slate-100 rounded-xl border border-slate-200 text-left">
        {/* The processor's TX-... number: the one the payment system recognises. */}
        {payment.payment_reference && (
          <Row label="Transaction number">
            <span className="break-all font-mono text-sm">{payment.payment_reference}</span>
          </Row>
        )}
        <Row label="Student">
          {registration.student_name} ({registration.student_id})
        </Row>
        <Row label="Trip">{trip.name}</Row>
        <Row label="Trip date">{formatDate(trip.date)}</Row>
        <Row label="Card">Ending in {payment.card_last4}</Row>
        <Row label="Amount paid">
          <span className="text-lg font-bold">${payment.amount}</span>
        </Row>
      </dl>

      <button type="button" onClick={onDone} className={`${primaryButton} mt-8 w-full`}>
        Back to trip details
      </button>
    </Card>
  );
}
