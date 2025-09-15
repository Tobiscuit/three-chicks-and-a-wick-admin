"use client";

import { Button } from "@/components/ui/button";
import { runListChannelsCheck } from "@/app/products/diagnostic-actions";
import { Bug } from "lucide-react";

export function DiagnosticButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => runListChannelsCheck()}
      className="text-xs"
    >
      <Bug className="mr-2 h-3 w-3" />
      Log Sales Channels
    </Button>
  );
}
