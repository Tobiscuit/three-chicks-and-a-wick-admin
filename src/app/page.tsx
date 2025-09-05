
"use client";

import { ImageStudio } from '@/components/image-studio';
import { AuthWrapper } from '@/components/auth/auth-wrapper';

export default function Home() {
  return (
    <AuthWrapper>
      <ImageStudio />
    </AuthWrapper>
  );
}
