import type { ReactNode } from "react";

const TONES = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  error: "border-red-200 bg-red-50 text-red-900",
} as const;

/**
 * A message box. Screen readers read it out when it appears: errors interrupt
 * (role="alert"), information waits politely (role="status").
 */
export function Notice({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3 py-2 text-sm ${TONES[tone]}`}
    >
      {children}
    </div>
  );
}
