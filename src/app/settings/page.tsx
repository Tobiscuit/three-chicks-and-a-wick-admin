
'use client';

import { useState, useEffect } from 'react';
import { AuthWrapper } from '@/components/auth/auth-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/components/auth/auth-provider';
import { auth } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Palette, Store, Settings as SettingsIcon, Package, Check, Lightbulb } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserSettings, updateImageStudioSetting, updateProductsSetting } from '@/services/user-settings';
import { useToast } from '@/hooks/use-toast';
import { useFeatureDiscovery } from '@/context/feature-discovery-context';
import { cn } from '@/lib/utils';

// --- INLINE SAVED INDICATOR COMPONENT ---
function SavedIndicator({ show }: { show: boolean }) {
    if (!show) return null;
    return (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 motion-safe:animate-in fade-in slide-in-from-right-2 duration-200">
            <Check className="h-3 w-3" />
            Saved
        </span>
    );
}

// --- SECTION HEADER COMPONENT ---
function SectionHeader({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            {children}
        </h2>
    );
}

export default function SettingsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { areTutorialsEnabled, toggleTutorials, resetAll } = useFeatureDiscovery();
    const shopifyStoreUrl = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL || 'Not configured';

    const [includeSourceImages, setIncludeSourceImages] = useState<boolean | null>(null);
    const [enableBulkSelection, setEnableBulkSelection] = useState<boolean | null>(null);
    const [settingsLoading, setSettingsLoading] = useState(true);
    
    // Inline save indicators
    const [savedSourceImages, setSavedSourceImages] = useState(false);
    const [savedBulkSelection, setSavedBulkSelection] = useState(false);
    const [savedTutorials, setSavedTutorials] = useState(false);

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
                setEnableBulkSelection(settings.productsSettings.enableBulkSelection);
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

    // Handle setting change with inline indicator
    const handleSourceImagesToggle = async (checked: boolean) => {
        if (!user?.uid) return;

        try {
            setIncludeSourceImages(checked);
            await updateImageStudioSetting(user.uid, checked);
            // Show inline saved indicator
            setSavedSourceImages(true);
            setTimeout(() => setSavedSourceImages(false), 2000);
        } catch (error) {
            console.error('Error updating setting:', error);
            setIncludeSourceImages(!checked);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update setting. Please try again.",
            });
        }
    };

    // Handle bulk selection toggle with inline indicator
    const handleBulkSelectionToggle = async (checked: boolean) => {
        if (!user?.uid) return;

        try {
            setEnableBulkSelection(checked);
            await updateProductsSetting(user.uid, checked);
            // Show inline saved indicator
            setSavedBulkSelection(true);
            setTimeout(() => setSavedBulkSelection(false), 2000);
        } catch (error) {
            console.error('Error updating setting:', error);
            setEnableBulkSelection(!checked);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update setting. Please try again.",
            });
        }
    };

    // Handle tutorials toggle with inline indicator
    const handleTutorialsToggle = (checked: boolean) => {
        toggleTutorials(checked);
        setSavedTutorials(true);
        setTimeout(() => setSavedTutorials(false), 2000);
    };

    return (
        <AuthWrapper>
            <div className="space-y-8">
                {/* ═══════════════════════════════════════════════════════════════
                    SECTION: ACCOUNT
                ═══════════════════════════════════════════════════════════════ */}
                <section className="space-y-3">
                    <SectionHeader>Account</SectionHeader>
                    
                    <Card className={cn(
                        "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300",
                        "hover:shadow-md hover:border-primary/20 transition-all"
                    )}>
                        <CardHeader>
                            <CardTitle className="font-semibold tracking-tight">User Profile</CardTitle>
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
                </section>

                {/* ═══════════════════════════════════════════════════════════════
                    SECTION: PREFERENCES
                ═══════════════════════════════════════════════════════════════ */}
                <section className="space-y-3">
                    <SectionHeader>Preferences</SectionHeader>

                    {/* Image Studio Settings */}
                    <Card className={cn(
                        "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-75",
                        "hover:shadow-md hover:border-primary/20 transition-all"
                    )}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 font-semibold tracking-tight">
                                <SettingsIcon className="h-5 w-5" /> Image Studio Settings
                            </CardTitle>
                            <CardDescription>Configure how Image Studio behaves when creating products.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium">Include source images when saving new products</p>
                                    <SavedIndicator show={savedSourceImages} />
                                </div>
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

                    {/* Products Settings */}
                    <Card className={cn(
                        "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-150",
                        "hover:shadow-md hover:border-primary/20 transition-all"
                    )}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 font-semibold tracking-tight">
                                <Package className="h-5 w-5" /> Products Settings
                            </CardTitle>
                            <CardDescription>Configure how the products list behaves.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium">Enable Bulk Selection</p>
                                    <SavedIndicator show={savedBulkSelection} />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Show checkboxes to select multiple products for bulk actions like delete or status change.
                                </p>
                            </div>
                            {settingsLoading || enableBulkSelection === null ? (
                                <Skeleton className="h-6 w-11 rounded-full" />
                            ) : (
                                <Switch
                                    checked={enableBulkSelection}
                                    onCheckedChange={handleBulkSelectionToggle}
                                    disabled={settingsLoading}
                                />
                            )}
                        </CardContent>
                    </Card>

                    {/* Appearance */}
                    <Card className={cn(
                        "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-200",
                        "hover:shadow-md hover:border-primary/20 transition-all"
                    )}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 font-semibold tracking-tight">
                                <Palette className="h-5 w-5" /> Appearance
                            </CardTitle>
                            <CardDescription>Customize the look and feel of the application.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between">
                            <p className="text-sm font-medium">Theme</p>
                            <ThemeToggle />
                        </CardContent>
                    </Card>

                    {/* Feature Discovery */}
                    <Card className={cn(
                        "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-300",
                        "hover:shadow-md hover:border-primary/20 transition-all"
                    )}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 font-semibold tracking-tight">
                                <Lightbulb className="h-5 w-5" /> Feature Discovery
                            </CardTitle>
                            <CardDescription>Manage in-app tutorials and feature highlights.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium">Show Feature Tips</p>
                                        <SavedIndicator show={savedTutorials} />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Enable helpful tooltips that explain new features.
                                    </p>
                                </div>
                                <Switch
                                    checked={areTutorialsEnabled}
                                    onCheckedChange={handleTutorialsToggle}
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
                </section>

                {/* ═══════════════════════════════════════════════════════════════
                    SECTION: INTEGRATIONS
                ═══════════════════════════════════════════════════════════════ */}
                <section className="space-y-3">
                    <SectionHeader>Integrations</SectionHeader>

                    <Card className={cn(
                        "motion-safe:animate-in fade-in slide-in-from-bottom-4 duration-300 delay-[400ms]",
                        "hover:shadow-md hover:border-primary/20 transition-all"
                    )}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 font-semibold tracking-tight">
                                <Store className="h-5 w-5" /> Shopify Connection
                            </CardTitle>
                            <CardDescription>Your connected Shopify store.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border p-3">
                                <p className="text-sm font-medium shrink-0">Store URL</p>
                                <p className="text-sm text-muted-foreground break-all sm:text-right">{shopifyStoreUrl.replace('/api/2025-07/graphql.json', '')}</p>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </AuthWrapper>
    );
}
