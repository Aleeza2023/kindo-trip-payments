import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { fakeFetch, sentBody } from "../test-utils/fakeFetch";
import { RegisterForm } from "./RegisterForm";

const REGISTRATION = {
  id: "reg-1",
  trip_id: "TRIP-ZOO-2026",
  student_id: "STU-1001",
  student_name: "Mia Smith",
  status: "pending",
  already_registered: false,
};

async function fillIn(studentId: string, studentName: string, parentName: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Student ID"), studentId);
  await user.type(screen.getByLabelText("Student name"), studentName);
  await user.type(screen.getByLabelText("Parent/guardian name"), parentName);
  await user.click(screen.getByRole("button", { name: "Continue to payment" }));
}

describe("RegisterForm", () => {
  it("sends cleaned values and moves on when registered", async () => {
    const fetchMock = fakeFetch({ status: 201, body: REGISTRATION });
    const onRegistered = vi.fn();
    render(<RegisterForm tripId="TRIP-ZOO-2026" onRegistered={onRegistered} onBack={vi.fn()} />);

    await fillIn(" STU-1001 ", "  Mia   Smith", "Jane  Smith ");

    const cleaned = { student_id: "STU-1001", student_name: "Mia Smith", parent_name: "Jane Smith" };
    expect(sentBody(fetchMock)).toEqual(cleaned);
    expect(onRegistered).toHaveBeenCalledWith(REGISTRATION, cleaned);
  });

  it("checks the fields before calling the backend", async () => {
    const fetchMock = fakeFetch();
    render(<RegisterForm tripId="TRIP-ZOO-2026" onRegistered={vi.fn()} onBack={vi.fn()} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Continue to payment" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("Please enter the student ID.")).toBeInTheDocument();
    expect(screen.getByLabelText("Parent/guardian name")).toHaveAttribute("aria-invalid", "true");

    // The error goes away as soon as the parent starts fixing that field.
    await user.type(screen.getByLabelText("Student ID"), "S");
    expect(screen.queryByText("Please enter the student ID.")).not.toBeInTheDocument();
  });

  it.each([
    ["unknown_id", "We couldn't find a student with this ID."],
    ["other_school", "This student isn't enrolled at the school running this trip."],
    ["name_mismatch", "The name doesn't match our records for this student ID."],
  ])("shows the right message when the student can't be registered (%s)", async (code, message) => {
    fakeFetch({ status: 404, body: { detail: { code, message: "from the backend" } } });
    render(<RegisterForm tripId="TRIP-ZOO-2026" onRegistered={vi.fn()} onBack={vi.fn()} />);

    await fillIn("STU-1001", "Mia Smith", "Jane Smith");

    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByText(/404/)).not.toBeInTheDocument();
  });

  it("shows a general message for a 404 that isn't about the student", async () => {
    fakeFetch({ status: 404, body: { detail: "Trip not found." } });
    render(<RegisterForm tripId="TRIP-ZOO-2026" onRegistered={vi.fn()} onBack={vi.fn()} />);

    await fillIn("STU-1001", "Mia Smith", "Jane Smith");

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.getByRole("alert")).not.toHaveTextContent("couldn't find a student");
  });

  it("tells the parent when the child is already paid for", async () => {
    fakeFetch({ status: 409, body: { detail: "Already paid" } });
    const onRegistered = vi.fn();
    render(<RegisterForm tripId="TRIP-ZOO-2026" onRegistered={onRegistered} onBack={vi.fn()} />);

    await fillIn("STU-1001", "Mia Smith", "Jane Smith");

    expect(screen.getByRole("alert")).toHaveTextContent("already registered and paid");
    expect(onRegistered).not.toHaveBeenCalled();
  });
});
