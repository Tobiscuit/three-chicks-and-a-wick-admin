"use client";

import { Button } from "@/components/ui/button";
import { runListChannelsCheck } from "@/app/products/diagnostic-actions";
import { exposeDescriptionMetafieldToStorefront } from "@/app/products/expose-metafield-action";
import { getGalleryImagesAction } from "@/app/actions";
import { Bug, Eye, Image } from "lucide-react";
import { useState } from "react";

export function DiagnosticButton() {
  const [isExposing, setIsExposing] = useState(false);
  const [isTestingGallery, setIsTestingGallery] = useState(false);

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

  const handleTestGallery = async () => {
    setIsTestingGallery(true);
    try {
      console.log('[Diagnostic] Testing gallery images...');
      const result = await getGalleryImagesAction();
      
      const details = `🔍 GALLERY IMAGES DIAGNOSTIC

Success: ${result.success}
Image Count: ${result.images?.length || 0}
Bucket: ${result.bucketName || 'unknown'}
Error: ${result.error || 'none'}

Images:
${result.images?.map((img, i) => `${i + 1}. ${img.name} - ${img.url.substring(0, 50)}...`).join('\n') || 'No images'}

Check browser console for detailed logs.`;
      
      alert(details);
    } catch (error) {
      alert(`❌ Gallery test failed: ${error}`);
    } finally {
      setIsTestingGallery(false);
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
        onClick={handleTestGallery}
        disabled={isTestingGallery}
        className="text-xs"
      >
        <Image className="mr-2 h-3 w-3" />
        {isTestingGallery ? "Testing..." : "Test Gallery"}
      </Button>
    </div>
  );
}
