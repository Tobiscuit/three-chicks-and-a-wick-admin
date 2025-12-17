
'use client';

import { useState, useEffect } from 'react';
import { AuthWrapper } from '@/components/auth/auth-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/components/auth/auth-provider';
import { auth } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Palette, Store, Settings as SettingsIcon } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserSettings, updateImageStudioSetting } from '@/services/user-settings';
import { useToast } from '@/hooks/use-toast';
import { useFeatureDiscovery } from '@/context/feature-discovery-context';
import { Lightbulb } from 'lucide-react';

export default function SettingsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { areTutorialsEnabled, toggleTutorials, resetAll } = useFeatureDiscovery();
    const shopifyStoreUrl = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL || 'Not configured';

    const [includeSourceImages, setIncludeSourceImages] = useState<boolean | null>(null);
    const [settingsLoading, setSettingsLoading] = useState(true);


    const handleSignOut = () => {
        auth.signOut();
    };

    // Determine the first letter for the Avatar fallback
    const fallbackLetter = user?.displayName ? user.displayName.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : "A");

    // Load user settings on mount
    useEffect(() => {
        const loadUserSettings = async () => {
            if (!user?.uid) return;

            try {
                setSettingsLoading(true);
                const settings = await getUserSettings(user.uid);
                setIncludeSourceImages(settings.imageStudioSettings.includeSourceImages);
            } catch (error) {
                console.error('Error loading user settings:', error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to load settings. Using defaults.",
                });
            } finally {
                setSettingsLoading(false);
            }
        };

        loadUserSettings();
    }, [user?.uid, toast]);

    // Handle setting change
    const handleSourceImagesToggle = async (checked: boolean) => {
        if (!user?.uid) return;

        try {
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
        }
    };



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
                        <CardTitle className="flex items-center gap-2"><SettingsIcon /> Image Studio Settings</CardTitle>
                        <CardDescription>Configure how Image Studio behaves when creating products.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Include source images when saving new products</p>
                            <p className="text-xs text-muted-foreground">
                                When enabled, the original images used for composition will be saved to the product's media gallery along with the final shot.
                            </p>
                        </div>
                        {settingsLoading || includeSourceImages === null ? (
                            <Skeleton className="h-6 w-11 rounded-full" />
                        ) : (
                            <Switch
                                checked={includeSourceImages}
                                onCheckedChange={handleSourceImagesToggle}
                                disabled={settingsLoading}
                            />
                        )}
                    </CardContent>
                </Card>


                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Palette /> Appearance</CardTitle>
                        <CardDescription>Customize the look and feel of the application.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                        <p className="text-sm font-medium">Theme</p>
                        <ThemeToggle />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Lightbulb /> Feature Discovery</CardTitle>
                        <CardDescription>Manage in-app tutorials and feature highlights.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Show Feature Tips</p>
                                <p className="text-xs text-muted-foreground">
                                    Enable helpful tooltips that explain new features.
                                </p>
                            </div>
                            <Switch
                                checked={areTutorialsEnabled}
                                onCheckedChange={toggleTutorials}
                            />
                        </div>
                        <div className="flex items-center justify-between border-t pt-4">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Reset All Tutorials</p>
                                <p className="text-xs text-muted-foreground">
                                    Seen all the tips? Click here to see them again.
                                </p>
                            </div>
                            <Button variant="outline" onClick={() => {
                                resetAll();
                                toast({ title: "Tutorials Reset", description: "All feature tips will be shown again." });
                            }}>
                                Reset Tutorials
                            </Button>
                        </div>
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
