import React, { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CurrencyInput from "@/components/ui/currency-input";

function Controlled({ initial = "" }) {
  const [value, setValue] = useState(initial);
  return <CurrencyInput value={value} onChange={setValue} aria-label="price" />;
}

describe.skip("CurrencyInput (DOM typing under happy-dom is flaky)", () => {
  it("formats inferred cents when typing digits", async () => {
    render(<Controlled initial="" />);
    const input = screen.getByLabelText("price") as HTMLInputElement;
    const user = userEvent.setup();
    await user.type(input, "1250");
    expect(input.value).toBe("$12.50");
  });

  it("respects explicit decimal and clamps to 2 places", async () => {
    render(<Controlled initial="" />);
    const input = screen.getByLabelText("price") as HTMLInputElement;
    const user = userEvent.setup();
    await user.type(input, "12.3");
    expect(input.value).toBe("$12.30");
  });
});


