
"use client";

import { useAuth } from './auth-provider';
import { LoginPage } from './login-page';
import { LoadingPage } from './loading-page';
import { useEffect, useState } from 'react';
import { checkAuthorization } from '@/app/actions';
import { Button } from '../ui/button';
import { auth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ShieldAlert } from 'lucide-react';
import { AppSidebar } from '../layout/app-sidebar';
import { SidebarProvider, SidebarInset } from '../ui/sidebar';
import { Header } from '../layout/header';
import { startBackgroundStrategyGeneration } from '@/lib/background-strategy';

const AccessDeniedPage = () => {
    const { user } = useAuth();
    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
             <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="flex justify-center">
                        <ShieldAlert className="w-12 h-12 text-destructive" />
                    </div>
                    <CardTitle className="mt-4 text-2xl">Access Denied</CardTitle>
                </CardHeader>
                <CardContent>
                    <CardDescription className="mb-6">
                        Your account ({user?.email}) is not authorized to access this administrative panel. Access is restricted to authorized personnel only.
                    </CardDescription>
                    <Button variant="outline" className="w-full" onClick={() => auth.signOut()}>
                      Sign Out
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};


export const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user, idToken, loading, isAuthorized, setIsAuthorized } = useAuth();
  const [authCheckInProgress, setAuthCheckInProgress] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      if (loading) {
        setAuthCheckInProgress(true);
        return;
      }
      
      if (user && idToken) {
        setAuthCheckInProgress(true);
        try {
          const result = await checkAuthorization(idToken);
          if (!result.isAuthorized) {
            console.warn("[Client] Authorization denied:", result.error);
          } else {
            // User is authorized - start background strategy generation with user ID for per-user caching
            startBackgroundStrategyGeneration(user.uid).catch(error => {
              console.error('Background strategy generation failed:', error);
            });
          }
          setIsAuthorized(result.isAuthorized);
        } catch (error: any) {
          console.error("[Client] Authorization check failed:", error?.message || error);
          setIsAuthorized(false);
        } finally {
            setAuthCheckInProgress(false);
        }
      } else {
        setIsAuthorized(false);
        setAuthCheckInProgress(false);
      }
    };

    verifyUser();
  }, [user, idToken, loading, setIsAuthorized]);

  if (loading || authCheckInProgress) {
    return <LoadingPage />;
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!isAuthorized) {
    return <AccessDeniedPage />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col min-h-dvh">
            <Header />
            <main className="flex-1 flex flex-col p-2 md:p-6 lg:p-8">
                {children}
            </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
