
'use client';

import { AuthWrapper } from '@/components/auth/auth-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/components/auth/auth-provider';
import { auth } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Palette, Store } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { SHOPIFY_CONFIG } from '@/lib/env-config';

export default function SettingsPage() {
    const { user } = useAuth();
    const shopifyStoreUrl = SHOPIFY_CONFIG.STORE_URL || 'Not configured';

    const handleSignOut = () => {
        auth.signOut();
    };

    // Determine the first letter for the Avatar fallback
    const fallbackLetter = user?.displayName ? user.displayName.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : "A");

    return (
        <AuthWrapper>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>User Profile</CardTitle>
                        <CardDescription>This is your currently logged-in account.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || "User"} />
                                <AvatarFallback>{fallbackLetter}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-lg font-semibold">{user?.displayName || 'N/A'}</p>
                                <p className="text-sm text-muted-foreground">{user?.email || 'N/A'}</p>
                            </div>
                        </div>
                        <Button variant="outline" onClick={handleSignOut}>
                           <LogOut className="mr-2 h-4 w-4" />
                           Sign Out
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Palette/> Appearance</CardTitle>
                        <CardDescription>Customize the look and feel of the application.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                        <p className="text-sm font-medium">Theme</p>
                        <ThemeToggle />
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Store /> Integrations</CardTitle>
                        <CardDescription>Information about connected services.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="flex items-center justify-between rounded-lg border p-3">
                            <p className="text-sm font-medium">Shopify Store URL</p>
                            <p className="text-sm text-muted-foreground truncate">{shopifyStoreUrl.replace('/api/2025-07/graphql.json', '')}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AuthWrapper>
    );
}
