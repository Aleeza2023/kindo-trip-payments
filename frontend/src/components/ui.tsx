// Shared look: button styles, the white card, and the page heading.
import type { ReactNode } from "react";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold transition " +
  "focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed";

export const primaryButton =
  `${buttonBase} bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:ring-blue-200 ` +
  "disabled:bg-slate-400";

export const secondaryButton =
  `${buttonBase} border border-blue-600 bg-white text-blue-700 hover:bg-blue-50 ` +
  "focus-visible:ring-blue-100 disabled:border-slate-300 disabled:text-slate-400";

interface CardProps {
  className?: string;
  padded?: boolean; // false for a card whose photo should reach the edges
  children: ReactNode;
}

export function Card({ className = "", padded = true, children }: CardProps) {
  const padding = padded ? "p-6" : "";
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${padding} ${className}`}>
      {children}
    </div>
  );
}

interface PageHeadingProps {
  title: string;
  subtitle: string;
  icon?: ReactNode;
}

export function PageHeading({ title, subtitle, icon }: PageHeadingProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        {icon && <span className="text-green-600">{icon}</span>}
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
      </div>
      <p className="mt-1 text-slate-600">{subtitle}</p>
    </div>
  );
}
