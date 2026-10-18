import { CheckIcon } from "./Icons";

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  valid?: string | null; // shown in green when the value is already fine, e.g. "Valid CVV"
  required?: boolean; // shows a red * after the label and tells screen readers the field is required
  inputMode?: "text" | "numeric";
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
}

/** A labelled input. The error is linked to the input so screen readers announce it. */
export function TextField({
  id,
  label,
  value,
  onChange,
  error,
  valid,
  required,
  ...inputProps
}: TextFieldProps) {
  const errorId = `${id}-error`;
  // The * is added with CSS, not as text, so screen readers say "required" (from aria-required)
  // instead of reading out "star".
  const requiredMark = required ? "after:ml-0.5 after:text-red-600 after:content-['*']" : "";
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={`text-sm font-medium text-slate-700 ${requiredMark}`}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-required={required ? true : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 aria-invalid:border-red-500"
        {...inputProps}
      />
      {error ? (
        <p id={errorId} className="text-sm text-red-700">
          {error}
        </p>
      ) : (
        valid && (
          <p className="flex items-center gap-1 text-sm text-green-700">
            <CheckIcon className="h-4 w-4" />
            {valid}
          </p>
        )
      )}
    </div>
  );
}
