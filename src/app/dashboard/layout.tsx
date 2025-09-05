
"use client";

// This layout is no longer needed as the common layout is handled by AuthWrapper.
// It can be safely removed or left empty.

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {children}
        </>
    );
}
