"use client";

import { Button } from "@/components/ui/button";
import { runListChannelsCheck } from "@/app/products/diagnostic-actions";
import { exposeDescriptionMetafieldToStorefront } from "@/app/products/expose-metafield-action";
import { getTagPoolAction } from "@/app/products/actions";
import { Bug, Eye, Tags } from "lucide-react";
import { useState } from "react";

export function DiagnosticButton() {
  const [isExposing, setIsExposing] = useState(false);
  const [isLoadingTags, setIsLoadingTags] = useState(false);

  const handleExposeMetafield = async () => {
    setIsExposing(true);
    try {
      const result = await exposeDescriptionMetafieldToStorefront();
      if (result.success) {
        alert(`✅ ${result.message}\nDefinition ID: ${result.definitionId}`);
      } else {
        // Show full error details in a copyable format
        const errorDetails = `❌ METAFIELD EXPOSURE FAILED

Error: ${result.error}

Full Details:
${JSON.stringify(result, null, 2)}

Please copy this error message and share it for debugging.`;
        alert(errorDetails);
      }
    } catch (error) {
      const errorDetails = `❌ UNEXPECTED ERROR

Error: ${error}

Stack Trace:
${error instanceof Error ? error.stack : 'No stack trace available'}

Please copy this error message and share it for debugging.`;
      alert(errorDetails);
    } finally {
      setIsExposing(false);
    }
  };

  const handleViewTagPool = async () => {
    setIsLoadingTags(true);
    try {
      const result = await getTagPoolAction();
      if (result.success) {
        console.log('🏷️ TAG POOL DATA:', result.tagPool);
        alert(`Tag Pool loaded! Check console for full details.\n\nTotal categories: ${Object.keys(result.tagPool.existing_tags).length}\nTotal tags: ${Object.values(result.tagPool.existing_tags).flat().length}`);
      } else {
        alert(`❌ Failed to load tag pool: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error}`);
    } finally {
      setIsLoadingTags(false);
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleViewTagPool}
          disabled={isLoadingTags}
          className="text-xs"
        >
          <Tags className="mr-2 h-3 w-3" />
          {isLoadingTags ? "Loading..." : "View Tag Pool"}
        </Button>
    </div>
  );
}
