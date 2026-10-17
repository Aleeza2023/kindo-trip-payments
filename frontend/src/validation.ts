// Pure functions: the same rules as backend/app/schemas.py, checked early to help the parent.
// The backend still checks everything. Each check returns an error message, or null if valid.

export const MAX_NAME_LENGTH = 100;

/** "  Mia   Smith " -> "Mia Smith" */
export function cleanName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function validateStudentId(value: string): string | null {
  return value.trim() ? null : "Please enter the student ID.";
}

export function validateName(value: string, label: string): string | null {
  const name = cleanName(value);
  if (!name) return `Please enter ${label}.`;
  if (name.length > MAX_NAME_LENGTH) return `Please keep ${label} to ${MAX_NAME_LENGTH} characters or fewer.`;
  return null;
}

/** Digits only, grouped in fours as the parent types: "4242424242" -> "4242 4242 42" */
export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function validateCardNumber(value: string): string | null {
  return /^[0-9]{16}$/.test(value.replace(/ /g, "")) ? null : "Please enter the 16-digit card number.";
}

/** Digits only, with the slash added for the parent: "1230" -> "12/30" */
export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

/** `today` is a parameter so tests can fix the date. */
export function validateExpiry(value: string, today: Date = new Date()): string | null {
  const match = /^([0-9]{2})\/([0-9]{2})$/.exec(value);
  if (!match) return "Please enter the expiry date as MM/YY.";
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return "Please enter a month from 01 to 12.";
  // A card works until the end of its expiry month.
  const thisMonth = today.getFullYear() * 12 + today.getMonth();
  if (year * 12 + (month - 1) < thisMonth) return "This card has expired.";
  return null;
}

export function validateCvv(value: string): string | null {
  return /^[0-9]{3}$/.test(value) ? null : "Please enter the 3-digit CVV.";
}
