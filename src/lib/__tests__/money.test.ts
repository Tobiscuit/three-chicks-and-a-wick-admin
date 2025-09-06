import { describe, it, expect } from "vitest";
import { normalizeMoneyFromNumericString } from "@/lib/money";

describe("normalizeMoneyFromNumericString", () => {
  it("handles 1-2 digits as dollars .00", () => {
    expect(normalizeMoneyFromNumericString("1")).toBe("1.00");
    expect(normalizeMoneyFromNumericString("12")).toBe("12.00");
  });

  it("infers cents when 3+ digits", () => {
    expect(normalizeMoneyFromNumericString("1250")).toBe("12.50");
    expect(normalizeMoneyFromNumericString("3455")).toBe("34.55");
    expect(normalizeMoneyFromNumericString("1799")).toBe("17.99");
  });

  it("respects explicit decimal and clamps to 2 places", () => {
    expect(normalizeMoneyFromNumericString("12.3")).toBe("12.30");
    expect(normalizeMoneyFromNumericString("12.345")).toBe("12.35");
  });
});


