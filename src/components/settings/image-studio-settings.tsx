import { getUserSettings } from '@/services/user-settings';
import { ImageStudioSettingsClient } from './image-studio-settings-client';

interface ImageStudioSettingsProps {
  userId: string;
}

export async function ImageStudioSettings({ userId }: ImageStudioSettingsProps) {
  const settings = await getUserSettings(userId);
  
  return (
    <ImageStudioSettingsClient 
      initialIncludeSourceImages={settings.imageStudioSettings.includeSourceImages}
    />
  );
}
