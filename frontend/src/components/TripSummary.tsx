import zooImage from "../assets/hamilton-zoo.jpg";
import { formatDate } from "../format";
import type { Registration, Trip } from "../types";
import { ClipboardIcon } from "./Icons";
import { Card } from "./ui";

interface TripSummaryProps {
  title: string;
  trip: Trip;
  registration?: Registration; // once registered, also show who is being paid for
}

/** Side panel on the register and payment pages, so the trip and price stay in view. */
export function TripSummary({ title, trip, registration }: TripSummaryProps) {
  return (
    <Card className="h-fit lg:sticky lg:top-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <ClipboardIcon className="h-5 w-5 text-blue-600" />
        {title}
      </h2>
      <div className="mt-4 flex gap-4">
        <img src={zooImage} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
        <div className="text-sm">
          <p className="font-semibold text-slate-900">{trip.name}</p>
          <p className="text-slate-600">{formatDate(trip.date)}</p>
          <p className="text-slate-600">{trip.location}</p>
        </div>
      </div>
      {registration && (
        <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">Student</dt>
            <dd className="font-medium text-slate-900">{registration.student_name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">Student ID</dt>
            <dd className="font-medium text-slate-900">{registration.student_id}</dd>
          </div>
        </dl>
      )}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="font-semibold text-slate-900">
          {registration ? "Amount to pay" : "Cost per student"}
        </span>
        <span className="text-2xl font-bold text-slate-900">${trip.cost}</span>
      </div>
    </Card>
  );
}
