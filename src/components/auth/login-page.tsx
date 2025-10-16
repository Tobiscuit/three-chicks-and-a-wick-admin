
"use client";

import { GoogleAuthProvider, signInWithRedirect } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// SVG for Google Icon
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.16c1.56 0 2.95.54 4.04 1.58l3.15-3.15C17.45 1.8 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        <path d="M1 1h22v22H1z" fill="none"/>
    </svg>
);


export const LoginPage = () => {
    const { toast } = useToast();

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // Use redirect instead of popup for better Safari/iOS compatibility
      await signInWithRedirect(auth, provider);
      // Note: Toast won't show because page redirects, but auth-wrapper will handle success
    } catch (error: any) {
      // Redirect errors are rare, but handle them gracefully
      if (error.code === 'auth/cancelled-popup-request') {
        console.log("Sign-in cancelled by user.");
        return;
      }
      
      console.error("Sign in error", error);
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: "Could not sign in with Google. Please try again.",
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
                 <div className="flex justify-center items-center gap-2 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Flame className="h-6 w-6" />
                    </div>
                    <span className="text-xl font-semibold text-foreground">Three Chicks & a Wick</span>
                </div>
                <CardTitle>Admin Access</CardTitle>
                <CardDescription>
                    Please sign in with your authorized Google account to continue.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button variant="outline" className="w-full" onClick={handleSignIn}>
                    <GoogleIcon className="mr-2 h-5 w-5" />
                    Sign in with Google
                </Button>
            </CardContent>
        </Card>
    </div>
  );
};
