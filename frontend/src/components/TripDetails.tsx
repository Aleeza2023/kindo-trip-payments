import type { ReactNode } from "react";

import zooImage from "../assets/hamilton-zoo.jpg";
import { formatDate } from "../format";
import type { Trip } from "../types";
import { ArrowRightIcon, CalendarIcon, CheckIcon, MapPinIcon } from "./Icons";
import { Card, primaryButton } from "./ui";

function InfoItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-blue-600">{icon}</span>
      <div>
        <dt className="text-sm font-semibold text-slate-900">{label}</dt>
        <dd className="text-slate-600">{value}</dd>
      </div>
    </div>
  );
}

// Written here, not stored in the backend: the Trip table has no "included" field.
const INCLUDED = ["Transportation", "Meals", "Entry ticket"];

interface TripDetailsProps {
  trip: Trip;
  onRegister: () => void;
}

export function TripDetails({ trip, onRegister }: TripDetailsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card padded={false} className="overflow-hidden lg:col-span-2">
        <img
          src={zooImage}
          alt="School children walking into Hamilton Zoo past the giraffes"
          className="aspect-[16/9] w-full object-cover"
        />
        <div className="p-6">
          <h1 className="text-3xl font-bold text-slate-900">{trip.name}</h1>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <InfoItem icon={<CalendarIcon />} label="Date" value={formatDate(trip.date)} />
            <InfoItem icon={<MapPinIcon />} label="Location" value={trip.location} />
          </dl>
        </div>
      </Card>

      <Card className="h-fit lg:sticky lg:top-6">
        <p className="text-4xl font-bold text-slate-900">${trip.cost}</p>
        <p className="text-slate-600">per student</p>
        <div className="mt-6 border-t border-slate-100 pt-5">
          <h2 className="font-semibold text-slate-900">What's included</h2>
          <ul className="mt-3 space-y-3 text-slate-700">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <button type="button" onClick={onRegister} className={`${primaryButton} mt-6 w-full`}>
          Register for trip
          <ArrowRightIcon />
        </button>
      </Card>
    </div>
  );
}
