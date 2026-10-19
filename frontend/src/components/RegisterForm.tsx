import { useState, type FormEvent } from "react";

import { register, type RegisterResult, type StudentProblem } from "../api";
import type { Registration, RegistrationInput } from "../types";
import { cleanName, validateName, validateStudentId } from "../validation";
import { ArrowLeftIcon, ArrowRightIcon, UserIcon, UsersIcon } from "./Icons";
import { Notice } from "./Notice";
import { TextField } from "./TextField";
import { Card, primaryButton, secondaryButton } from "./ui";

const STUDENT_MESSAGES: Record<StudentProblem, string> = {
  unknown_id: "We couldn't find a student with this ID.",
  other_school: "This student isn't enrolled at the school running this trip.",
  name_mismatch: "The name doesn't match our records for this student ID.",
};

const MESSAGES: Record<Exclude<RegisterResult["kind"], "ok" | "student_not_found">, string> = {
  already_paid: "Your child is already registered and paid for this trip.",
  error: "Something went wrong. Please try again in a moment.",
};

interface Errors {
  studentId?: string | null;
  studentName?: string | null;
  parentName?: string | null;
}

interface RegisterFormProps {
  tripId: string;
  initial?: RegistrationInput; // what the parent typed before, if they came back to this step
  onRegistered: (registration: Registration, input: RegistrationInput) => void;
  onBack: () => void;
}

export function RegisterForm({ tripId, initial, onRegistered, onBack }: RegisterFormProps) {
  const [studentId, setStudentId] = useState(initial?.student_id ?? "");
  const [studentName, setStudentName] = useState(initial?.student_name ?? "");
  const [parentName, setParentName] = useState(initial?.parent_name ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /** Update a field and clear its error, so the message goes away as the parent fixes it. */
  function edit(field: keyof Errors, setValue: (value: string) => void) {
    return (value: string) => {
      setValue(value);
      setErrors((current) => ({ ...current, [field]: null }));
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found: Errors = {
      studentId: validateStudentId(studentId),
      studentName: validateName(studentName, "your child's name"),
      parentName: validateName(parentName, "your name"),
    };
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    const input: RegistrationInput = {
      student_id: studentId.trim(),
      student_name: cleanName(studentName),
      parent_name: cleanName(parentName),
    };
    setSubmitting(true);
    setMessage(null);
    const result = await register(tripId, input);
    setSubmitting(false);

    if (result.kind === "ok") onRegistered(result.registration, input);
    else if (result.kind === "student_not_found") setMessage(STUDENT_MESSAGES[result.reason]);
    else setMessage(MESSAGES[result.kind]);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card className="flex flex-col gap-6">
        <fieldset>
          <legend className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <UserIcon className="h-5 w-5 text-blue-600" />
            Student information
          </legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField
              id="student-id"
              label="Student ID"
              required
              placeholder="e.g. STU-1001"
              value={studentId}
              onChange={edit("studentId", setStudentId)}
              error={errors.studentId}
            />
            <TextField
              id="student-name"
              label="Student name"
              required
              autoComplete="off"
              value={studentName}
              onChange={edit("studentName", setStudentName)}
              error={errors.studentName}
            />
          </div>
        </fieldset>

        <hr className="border-slate-100" />

        <fieldset>
          <legend className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <UsersIcon className="h-5 w-5 text-blue-600" />
            Parent/guardian information
          </legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField
              id="parent-name"
              label="Parent/guardian name"
              required
              autoComplete="name"
              value={parentName}
              onChange={edit("parentName", setParentName)}
              error={errors.parentName}
            />
          </div>
        </fieldset>

        {message && <Notice tone="error">{message}</Notice>}
      </Card>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button type="button" onClick={onBack} className={secondaryButton}>
          <ArrowLeftIcon />
          Back
        </button>
        <button type="submit" disabled={submitting} className={primaryButton}>
          {submitting ? "Checking…" : "Continue to payment"}
          {!submitting && <ArrowRightIcon />}
        </button>
      </div>
    </form>
  );
}
