// Every call to the backend lives here. Each function turns HTTP status codes into a
// small set of outcomes, so components never deal with status codes or raw errors.
import type { CardInput, Payment, Registration, RegistrationInput, Trip } from "./types";

export type TripResult = { kind: "ok"; trip: Trip } | { kind: "not_found" } | { kind: "error" };

// Why a student can't be registered; matches the backend's StudentProblem codes.
export type StudentProblem = "unknown_id" | "other_school" | "name_mismatch";

export type RegisterResult =
  | { kind: "ok"; registration: Registration }
  | { kind: "student_not_found"; reason: StudentProblem }
  | { kind: "already_paid" }
  | { kind: "error" };

export type PayResult =
  | { kind: "paid"; payment: Payment }
  | { kind: "declined" }
  | { kind: "already_paid" }
  | { kind: "unavailable" } // the payment service failed; the parent was not charged
  | { kind: "error" };

interface Reply {
  status: number;
  body: unknown;
}

/** Returns null if the backend can't be reached at all. */
async function send(path: string, init?: RequestInit): Promise<Reply | null> {
  try {
    const response = await fetch(path, init);
    const body: unknown = await response.json().catch(() => null);
    return { status: response.status, body };
  } catch {
    return null;
  }
}

/**
 * Reads the reason code from a 404 reply: {"detail": {"code": "name_mismatch", ...}}.
 * Returns null when there's no known code, e.g. "Trip not found".
 */
function studentProblem(body: unknown): StudentProblem | null {
  const detail =
    typeof body === "object" && body !== null ? (body as { detail?: unknown }).detail : null;
  const code =
    typeof detail === "object" && detail !== null ? (detail as { code?: unknown }).code : null;
  return code === "unknown_id" || code === "other_school" || code === "name_mismatch"
    ? code
    : null;
}

function postJson(path: string, data: object): Promise<Reply | null> {
  return send(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function getTrip(tripId: string): Promise<TripResult> {
  const reply = await send(`/api/trips/${encodeURIComponent(tripId)}`);
  if (reply?.status === 200) return { kind: "ok", trip: reply.body as Trip };
  if (reply?.status === 404) return { kind: "not_found" };
  return { kind: "error" };
}

export async function register(tripId: string, input: RegistrationInput): Promise<RegisterResult> {
  const reply = await postJson(`/api/trips/${encodeURIComponent(tripId)}/registrations`, input);
  // 201: newly registered. 200: already registered and not paid yet.
  if (reply?.status === 201 || reply?.status === 200) {
    return { kind: "ok", registration: reply.body as Registration };
  }
  if (reply?.status === 404) {
    const reason = studentProblem(reply.body);
    // A 404 without a student reason (e.g. the trip is gone) isn't the parent's mistake.
    return reason ? { kind: "student_not_found", reason } : { kind: "error" };
  }
  if (reply?.status === 409) return { kind: "already_paid" };
  return { kind: "error" };
}

export async function pay(registrationId: string, card: CardInput): Promise<PayResult> {
  const reply = await postJson(`/api/registrations/${encodeURIComponent(registrationId)}/payments`, card);
  if (reply?.status === 200) {
    const payment = reply.body as Payment;
    // A decline is a normal 200 reply with status "failed".
    return payment.status === "success" ? { kind: "paid", payment } : { kind: "declined" };
  }
  if (reply?.status === 409) return { kind: "already_paid" };
  if (reply?.status === 502) return { kind: "unavailable" };
  return { kind: "error" };
}
