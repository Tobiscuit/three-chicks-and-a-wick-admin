"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type CurrencyInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "defaultValue" | "type" | "inputMode"> & {
    value?: string | number;
    defaultValue?: string | number;
    onChange?: (value: string) => void;
    prefix?: string;
    allowEmpty?: boolean;
    className?: string;
};

function stripToDigits(value: string): string {
    return value.replace(/[^0-9]/g, "");
}

function formatDollarsFromDigits(digits: string): string {
    if (!digits) return "";
    // Inferred cents rule when 3+ digits; 1-2 digits => whole dollars .00
    if (digits.length === 1) return `${Number(digits)}.00`;
    if (digits.length === 2) return `${Number(digits)}.00`;

    const centsPart = digits.slice(-2);
    const dollarsPart = digits.slice(0, -2).replace(/^0+/, "") || "0";

    // Add thousands separators
    const dollarsWithSeparators = Number(dollarsPart).toLocaleString("en-US");
    return `${dollarsWithSeparators}.${centsPart}`;
}

function normalizeOnBlur(value: string): string {
    if (!value) return "";
    // Accept existing decimals with up to 2 places
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 1) {
        const dollars = parts[0] || "0";
        const cents = (parts[1] || "").slice(0, 2).padEnd(2, "0");
        const dollarsNum = Number(stripToDigits(dollars)) || 0;
        return `${dollarsNum.toLocaleString("en-US")}.${cents}`;
    }
    // No decimal present; treat as inferred cents if 3+ digits else whole dollars
    const digits = stripToDigits(cleaned);
    return formatDollarsFromDigits(digits);
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
    ({ value, defaultValue, onChange, prefix = "$", allowEmpty = true, className, ...rest }, ref) => {
        const isControlled = value !== undefined;
        const initial = useMemo(() => {
            const v = (isControlled ? String(value ?? "") : String(defaultValue ?? ""));
            const digits = stripToDigits(v);
            return normalizeOnBlur(formatDollarsFromDigits(digits));
        }, []);

        const [internal, setInternal] = useState<string>(initial);
        const inputRef = useRef<HTMLInputElement>(null);

        const displayValue = isControlled
            ? normalizeOnBlur(String(value ?? ""))
            : internal;

        const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;
            // Treat trailing/inserted ".00" as our own formatting to allow appending digits to dollars
            const rawWithoutFormattingZeros = raw.replace(/\.00(?![0-9])/g, "").replace(".00", "");

            if (rawWithoutFormattingZeros.includes(".")) {
                // If user typed a decimal explicitly, respect it up to 2 places
                const cleaned = rawWithoutFormattingZeros.replace(/[^0-9.]/g, "");
                const [dollars, centsRaw] = cleaned.split(".");
                const dollarsDigits = stripToDigits(dollars);
                const dollarsNum = dollarsDigits ? Number(dollarsDigits) : 0;
                const dollarsFormatted = dollarsNum.toLocaleString("en-US");
                const cents = (centsRaw || "").slice(0, 2);
                const next = cents.length > 0 ? `${dollarsFormatted}.${cents}` : `${dollarsFormatted}.`;
                if (!isControlled) setInternal(next);
                onChange?.(stripToDigits(dollars) + (cents.length ? `.${cents}` : ""));
                return;
            }

            // Digits-only typing case
            const digits = stripToDigits(rawWithoutFormattingZeros);
            const formatted = formatDollarsFromDigits(digits);
            if (!isControlled) setInternal(formatted);
            onChange?.(digits.length <= 2 ? String(Number(digits || "0")) : `${Number(digits.slice(0, -2))}.${digits.slice(-2)}`);
        }, [isControlled, onChange]);

        const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
            const normalized = normalizeOnBlur(e.target.value);
            if (!isControlled) setInternal(normalized);
            // Emit fully normalized numeric string without separators, always 2 decimals
            const numeric = normalized.replace(/,/g, "");
            onChange?.(numeric);
        }, [isControlled, onChange]);

        return (
            <div className={cn("relative", className)}>
                <span aria-hidden="true" className="pointer-events-none select-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">{prefix}</span>
                <input
                    ref={(node) => {
                        inputRef.current = node as HTMLInputElement;
                        if (typeof ref === "function") ref(node as HTMLInputElement);
                        else if (ref && typeof ref === "object") (ref as React.MutableRefObject<HTMLInputElement | null>).current = node as HTMLInputElement;
                    }}
                    type="text"
                    inputMode="decimal"
                    className={cn("pl-9 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm")}
                    value={displayValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    {...rest}
                />
            </div>
        );
    }
);

CurrencyInput.displayName = "CurrencyInput";

export default CurrencyInput;


