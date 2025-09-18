"use client";

import { Button } from "@/components/ui/button";
import { runListChannelsCheck } from "@/app/products/diagnostic-actions";
import { exposeDescriptionMetafieldToStorefront } from "@/app/products/expose-metafield-action";
import { Bug, Eye } from "lucide-react";
import { useState } from "react";

export function DiagnosticButton() {
  const [isExposing, setIsExposing] = useState(false);

  const handleExposeMetafield = async () => {
    setIsExposing(true);
    try {
      const result = await exposeDescriptionMetafieldToStorefront();
      if (result.success) {
        alert(`✅ ${result.message}\nDefinition ID: ${result.definitionId}`);
      } else {
        alert(`❌ ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error}`);
    } finally {
      setIsExposing(false);
    }
  };

  return (
    <div className="flex gap-2">
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleExposeMetafield}
        disabled={isExposing}
        className="text-xs"
      >
        <Eye className="mr-2 h-3 w-3" />
        {isExposing ? "Exposing..." : "Expose Metafield"}
      </Button>
    </div>
  );
}
