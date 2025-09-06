"use client";

import React, { useRef } from "react";
import { NumericFormat, NumericFormatProps } from "react-number-format";
import { normalizeMoneyFromNumericString } from "@/lib/money";
import { cn } from "@/lib/utils";

type CurrencyInputProps = Omit<NumericFormatProps, "onValueChange" | "value" | "defaultValue"> & {
    value?: string | number;
    defaultValue?: string | number;
    onChange?: (value: string) => void;
    className?: string;
};

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
    ({ value, onChange, className, onBlur, ...rest }, ref) => {
        const lastRaw = useRef<string>(typeof value === "string" ? value : String(value ?? ""));
        return (
            <NumericFormat
                getInputRef={ref}
                value={value as any}
                valueIsNumericString
                thousandSeparator
                decimalScale={2}
                fixedDecimalScale
                allowNegative={false}
                allowLeadingZeros={false}
                prefix="$"
                customInput={(props: any) => (
                    <input
                        {...props}
                        type="text"
                        inputMode="decimal"
                        className={cn("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className)}
                    />
                )}
                onValueChange={(values) => {
                    const raw = values.value || ""; // numeric string without formatting
                    lastRaw.current = raw;
                    onChange?.(raw);
                }}
                onBlur={(e) => {
                    onChange?.(normalizeMoneyFromNumericString(lastRaw.current));
                    onBlur?.(e as any);
                }}
                {...rest}
            />
        );
    }
);

CurrencyInput.displayName = "CurrencyInput";

export default CurrencyInput;


