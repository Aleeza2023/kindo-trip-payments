import { CheckIcon } from "./Icons";

const STEPS = ["Trip details", "Register", "Payment", "Confirmation"];

/** Shows where the parent is in the flow. `current` is 0 for the first step. */
export function Stepper({ current }: { current: number }) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center gap-2 sm:gap-4">
        {STEPS.map((label, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li
              key={label}
              aria-current={active ? "step" : undefined}
              className="flex flex-1 items-center gap-2 text-sm"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-semibold ${
                  done || active ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {done ? <CheckIcon className="h-4 w-4" /> : index + 1}
              </span>
              <span
                className={`hidden sm:inline ${active ? "font-semibold text-slate-900" : "text-slate-600"}`}
              >
                {label}
              </span>
              {index < STEPS.length - 1 && <span className="h-px flex-1 bg-slate-200" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
