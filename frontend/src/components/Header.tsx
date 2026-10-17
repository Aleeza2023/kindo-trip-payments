import { SchoolIcon } from "./Icons";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
        <SchoolIcon className="h-7 w-7 text-blue-600" />
        <span className="text-lg font-bold text-slate-900">Kindo School Payments</span>
      </div>
    </header>
  );
}
