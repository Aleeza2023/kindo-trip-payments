import { useEffect, useState } from "react";

import { getTrip, type TripResult } from "./api";
import { Confirmation } from "./components/Confirmation";
import { Header } from "./components/Header";
import { LockIcon } from "./components/Icons";
import { Notice } from "./components/Notice";
import { PaymentForm } from "./components/PaymentForm";
import { RegisterForm } from "./components/RegisterForm";
import { Stepper } from "./components/Stepper";
import { TripDetails } from "./components/TripDetails";
import { TripSummary } from "./components/TripSummary";
import { PageHeading } from "./components/ui";
import type { Payment, Registration, RegistrationInput } from "./types";

const TRIP_ID = "TRIP-ZOO-2026";

// Where the parent is: trip details, then register, then pay, then done.
type Step =
  | { name: "details" }
  | { name: "register" }
  | { name: "pay"; registration: Registration }
  | { name: "done"; registration: Registration; payment: Payment };

const STEP_NUMBER: Record<Step["name"], number> = { details: 0, register: 1, pay: 2, done: 3 };

export default function App() {
  const [tripResult, setTripResult] = useState<TripResult | null>(null);
  const [step, setStep] = useState<Step>({ name: "details" });
  // Kept so the form is filled in again if the parent goes back from payment.
  const [lastInput, setLastInput] = useState<RegistrationInput>();

  useEffect(() => {
    let active = true; // ignore the reply if the page has moved on
    getTrip(TRIP_ID).then((result) => {
      if (active) setTripResult(result);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {tripResult === null && <p className="text-slate-600">Loading trip…</p>}
        {tripResult?.kind === "not_found" && <Notice tone="error">This trip could not be found.</Notice>}
        {tripResult?.kind === "error" && (
          <Notice tone="error">We couldn't load the trip. Please refresh the page to try again.</Notice>
        )}

        {tripResult?.kind === "ok" && (
          <>
            <Stepper current={STEP_NUMBER[step.name]} />

            {step.name === "details" && (
              <TripDetails trip={tripResult.trip} onRegister={() => setStep({ name: "register" })} />
            )}

            {step.name === "register" && (
              <>
                <PageHeading
                  title="Register for trip"
                  subtitle="Enter your child's details and your name to continue. Fields marked * are required."
                />
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <RegisterForm
                      tripId={TRIP_ID}
                      initial={lastInput}
                      onBack={() => setStep({ name: "details" })}
                      onRegistered={(registration, input) => {
                        setLastInput(input);
                        setStep({ name: "pay", registration });
                      }}
                    />
                  </div>
                  <TripSummary title="Trip summary" trip={tripResult.trip} />
                </div>
              </>
            )}

            {step.name === "pay" && (
              <>
                <PageHeading
                  icon={<LockIcon className="h-7 w-7" />}
                  title="Payment details"
                  subtitle="Please enter your payment details to complete the registration."
                />
                {step.registration.already_registered && (
                  <div className="mb-6">
                    <Notice tone="info">
                      Your child is already registered for this trip. Please continue to payment.
                    </Notice>
                  </div>
                )}
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <PaymentForm
                      registrationId={step.registration.id}
                      cost={tripResult.trip.cost}
                      onBack={() => setStep({ name: "register" })}
                      onPaid={(payment) => setStep({ name: "done", registration: step.registration, payment })}
                    />
                  </div>
                  {/* First on narrow screens, so the parent sees what they're paying for before the Pay button. */}
                  <div className="order-first lg:order-none">
                    <TripSummary
                      title="Payment summary"
                      trip={tripResult.trip}
                      registration={step.registration}
                    />
                  </div>
                </div>
              </>
            )}

            {step.name === "done" && (
              <Confirmation
                trip={tripResult.trip}
                registration={step.registration}
                payment={step.payment}
                onDone={() => {
                  setLastInput(undefined);
                  setStep({ name: "details" });
                }}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
