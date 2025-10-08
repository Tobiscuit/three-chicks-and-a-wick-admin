'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon } from 'lucide-react';
import { updateImageStudioSetting } from '@/services/user-settings';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/auth-provider';

interface ImageStudioSettingsClientProps {
  initialIncludeSourceImages: boolean;
}

export function ImageStudioSettingsClient({ initialIncludeSourceImages }: ImageStudioSettingsClientProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [includeSourceImages, setIncludeSourceImages] = useState(initialIncludeSourceImages);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSourceImagesToggle = async (checked: boolean) => {
    if (!user?.uid) return;
    
    try {
      setIsUpdating(true);
      setIncludeSourceImages(checked);
      await updateImageStudioSetting(user.uid, checked);
      toast({
        title: "Setting Updated",
        description: checked 
          ? "Source images will now be included when saving products from Image Studio."
          : "Only the composed image will be saved when creating products from Image Studio.",
      });
    } catch (error) {
      console.error('Error updating setting:', error);
      // Revert the toggle on error
      setIncludeSourceImages(!checked);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update setting. Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SettingsIcon /> Image Studio Settings
        </CardTitle>
        <CardDescription>Configure how Image Studio behaves when creating products.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">Include source images when saving new products</p>
          <p className="text-xs text-muted-foreground">
            When enabled, the original images used for composition will be saved to the product's media gallery along with the final shot.
          </p>
        </div>
        <Switch 
          checked={includeSourceImages}
          onCheckedChange={handleSourceImagesToggle}
          disabled={isUpdating}
        />
      </CardContent>
    </Card>
  );
}
