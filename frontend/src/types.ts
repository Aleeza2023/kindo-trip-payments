// Shapes of the backend's API (see backend/app/schemas.py). Money is in cents;
// the backend also sends a ready-made dollar string such as "25.00".

export type RegistrationStatus = "pending" | "paid";
export type TransactionStatus = "success" | "failed";

export interface Trip {
  id: string;
  name: string;
  date: string; // "2026-11-12"
  location: string;
  cost_cents: number;
  cost: string;
}

export interface RegistrationInput {
  student_id: string;
  student_name: string;
  parent_name: string;
}

export interface Registration {
  id: string;
  trip_id: string;
  student_id: string;
  student_name: string;
  status: RegistrationStatus;
  already_registered: boolean;
}

// No amount: the backend takes the price from the trip.
export interface CardInput {
  card_number: string;
  expiry_date: string;
  cvv: string;
}

export interface Payment {
  transaction_id: string; // our own ID for the attempt; not shown to parents
  payment_reference: string | null; // the processor's TX-... number; only set on success
  status: TransactionStatus;
  registration_status: RegistrationStatus;
  amount_cents: number;
  amount: string;
  card_last4: string;
  message: string;
}
