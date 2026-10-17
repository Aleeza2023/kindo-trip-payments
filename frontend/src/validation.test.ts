import { describe, expect, it } from "vitest";

import {
  cleanName,
  formatCardNumber,
  formatExpiry,
  validateCardNumber,
  validateCvv,
  validateExpiry,
  validateName,
  validateStudentId,
} from "./validation";

// A fixed "today" (17 October 2026), so expiry tests never go out of date.
const TODAY = new Date(2026, 9, 17);

describe("names", () => {
  it("trims and collapses spaces", () => {
    expect(cleanName("  Mia   Smith ")).toBe("Mia Smith");
  });

  it("rejects blank names", () => {
    expect(validateName("   ", "your name")).toBe("Please enter your name.");
  });

  it("allows 100 characters but not 101, counted after cleaning", () => {
    expect(validateName(" " + "a".repeat(100) + " ", "your name")).toBeNull();
    expect(validateName("a".repeat(101), "your name")).not.toBeNull();
  });

  it("requires a student ID", () => {
    expect(validateStudentId("  ")).not.toBeNull();
    expect(validateStudentId("STU-1001")).toBeNull();
  });
});

describe("card number", () => {
  it("groups digits in fours and drops anything else", () => {
    expect(formatCardNumber("4242a4242-42")).toBe("4242 4242 42");
    expect(formatCardNumber("42424242424242429999")).toBe("4242 4242 4242 4242");
  });

  it("accepts 16 digits, with or without spaces", () => {
    expect(validateCardNumber("4242 4242 4242 4242")).toBeNull();
    expect(validateCardNumber("4242424242424242")).toBeNull();
  });

  it.each(["424242424242424", "42424242424242424"])(
    "rejects %j",
    (value) => {
      expect(validateCardNumber(value)).not.toBeNull();
    },
  );
});

describe("expiry", () => {
  it("adds the slash as the parent types", () => {
    expect(formatExpiry("1")).toBe("1");
    expect(formatExpiry("12")).toBe("12");
    expect(formatExpiry("1230")).toBe("12/30");
    expect(formatExpiry("12/305")).toBe("12/30");
  });

  it.each(["13/30", "1230"])("rejects badly formed %j", (value) => {
    expect(validateExpiry(value, TODAY)).not.toBeNull();
  });

  it("accepts this month: a card works until the end of its expiry month", () => {
    expect(validateExpiry("10/26", TODAY)).toBeNull();
  });

  it("rejects last month", () => {
    expect(validateExpiry("09/26", TODAY)).toBe("This card has expired.");
  });

  it("handles the year boundary", () => {
    expect(validateExpiry("12/25", new Date(2026, 0, 1))).toBe("This card has expired.");
    expect(validateExpiry("01/26", new Date(2026, 0, 31))).toBeNull();
  });
});

describe("cvv", () => {
  it("accepts exactly 3 digits, keeping a leading zero", () => {
    expect(validateCvv("012")).toBeNull();
  });

  it.each(["12", "1234"])("rejects %j", (value) => {
    expect(validateCvv(value)).not.toBeNull();
  });
});
