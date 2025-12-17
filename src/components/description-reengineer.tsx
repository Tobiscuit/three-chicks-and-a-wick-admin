'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  rewriteDescriptionAction, 
  loadDescriptionHistoryAction, 
  saveDescriptionHistoryAction,
  addDescriptionVersionAction 
} from '@/app/products/actions';
import { AIContentDisplay } from '@/components/ai-content-display';
import { isHtmlContent, getAIContentClassName } from '@/lib/ai-content-utils';
import { 
  Sparkles, 
  Loader2, 
  History, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  Wand2,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DescriptionVersion {
  id: string;
  description: string;
  userPrompt?: string;
  reasoning?: string;
  changes: string[];
  timestamp: Date;
}

interface DescriptionRewriterProps {
  productId?: string; // Add productId for persistence
  initialDescription: string;
  productName: string;
  imageAnalysis?: string;
  onDescriptionChange: (newDescription: string) => void;
}

export function DescriptionRewriter({
  productId,
  initialDescription,
  productName,
  imageAnalysis,
  onDescriptionChange
}: DescriptionRewriterProps) {
  const [descriptionVersions, setDescriptionVersions] = useState<DescriptionVersion[]>([
    {
      id: 'original',
      description: initialDescription,
      userPrompt: 'Original description',
      reasoning: 'Initial product description',
      changes: [],
      timestamp: new Date()
    }
  ]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [isRewriting, setIsRewriting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const currentDescription = descriptionVersions[currentVersionIndex]?.description || initialDescription;

  // Load description history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!productId) return;
      
      setIsLoadingHistory(true);
      try {
        const result = await loadDescriptionHistoryAction(productId);
        if (result.success && result.versions && result.versions.length > 0) {
          // Merge with current versions, avoiding duplicates
          setDescriptionVersions(prev => {
            const existingIds = new Set(prev.map(v => v.id));
            const newVersions = result.versions!.filter(v => !existingIds.has(v.id));
            return [...prev, ...newVersions];
          });
          console.log('[Description Rewriter] Loaded history:', result.versions.length, 'versions');
        }
      } catch (error) {
        console.error('[Description Rewriter] Error loading history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [productId]);

  // Update parent when description changes
  useEffect(() => {
    onDescriptionChange(currentDescription);
    setHasUnsavedChanges(currentVersionIndex > 0);
  }, [currentDescription, currentVersionIndex, onDescriptionChange]);

  const handleRewrite = async () => {
    if (!userPrompt.trim() || isRewriting) return;

    setIsRewriting(true);
    try {
      const result = await rewriteDescriptionAction({
        originalDescription: currentDescription,
        userPrompt: userPrompt.trim(),
        productContext: {
          name: productName,
          imageAnalysis: imageAnalysis,
          brandGuidelines: 'Premium, artisanal, luxurious candles with personality and charm'
        }
      });

      if (result.success && result.result) {
        const newVersion: DescriptionVersion = {
          id: `version-${Date.now()}`,
          description: result.result.rewrittenDescription,
          userPrompt: userPrompt.trim(),
          reasoning: result.result.reasoning,
          changes: result.result.changes || [],
          timestamp: new Date()
        };

        setDescriptionVersions(prev => [...prev, newVersion]);
        setCurrentVersionIndex(prev => prev + 1);
        setUserPrompt('');
        
        // Save to Firestore if productId exists
        if (productId) {
          try {
            await addDescriptionVersionAction(productId, newVersion);
            console.log('[Description Rewriter] Version saved to Firestore');
          } catch (error) {
            console.error('[Description Rewriter] Error saving version:', error);
            // Don't show error to user, just log it
          }
        }
        
        toast({
          title: "✨ Description Rewritten!",
          description: `Created version ${descriptionVersions.length + 1} with ${result.result.changes?.length || 0} changes.`
        });
      } else {
        throw new Error(result.error || 'Failed to rewrite description');
      }
    } catch (error) {
      console.error('Rewriting error:', error);
      toast({
        title: "❌ Rewriting Failed",
        description: error instanceof Error ? error.message : 'Failed to rewrite description',
        variant: "destructive"
      });
    } finally {
      setIsRewriting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleRewrite();
    }
  };

  const navigateVersion = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentVersionIndex > 0) {
      setCurrentVersionIndex(prev => prev - 1);
    } else if (direction === 'next' && currentVersionIndex < descriptionVersions.length - 1) {
      setCurrentVersionIndex(prev => prev + 1);
    }
  };

  const restoreVersion = (versionIndex: number) => {
    setCurrentVersionIndex(versionIndex);
    setShowHistory(false);
  };

  const resetToOriginal = () => {
    setCurrentVersionIndex(0);
    setShowHistory(false);
    toast({
      title: "🔄 Reset to Original",
      description: "Restored the original description."
    });
  };

  return (
    <div className="space-y-4">
      {/* Current Description Display */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Product Description</CardTitle>
              <CardDescription>
                Version {currentVersionIndex + 1} of {descriptionVersions.length}
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="ml-2">
                    <Clock className="mr-1 h-3 w-3" />
                    Unsaved Changes
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="mr-2 h-4 w-4" />
                History
              </Button>
              {currentVersionIndex > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetToOriginal}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-4">
              <div className="text-center space-y-2">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Loading description history...
                </p>
              </div>
            </div>
          ) : isRewriting ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Rewriting description...
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isHtmlContent(currentDescription) ? (
                <AIContentDisplay 
                  content={currentDescription} 
                  className={getAIContentClassName('details')}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{currentDescription}</p>
              )}
              
              {descriptionVersions[currentVersionIndex]?.changes.length > 0 && (
                <div className="border-t pt-3">
                  <h4 className="text-sm font-medium mb-2">Changes Made:</h4>
                  <div className="flex flex-wrap gap-1">
                    {descriptionVersions[currentVersionIndex].changes.map((change, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {change}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rewriting Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Rewrite Description
          </CardTitle>
          <CardDescription>
            Describe how you'd like to change the description. Be creative!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="userPrompt">
                ✨ Add some magic to this description...
              </Label>
              <Input
                ref={inputRef}
                id="userPrompt"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., Make it more romantic and cozy, Add more sensory details, Focus on the luxury materials..."
                disabled={isRewriting}
                className="w-full"
              />
            </div>
            <Button 
              onClick={handleRewrite}
              disabled={!userPrompt.trim() || isRewriting}
              className="w-full"
            >
              {isRewriting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rewriting...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Rewrite Description
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Version History Modal */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Version History</CardTitle>
            <CardDescription>
              Browse and restore previous versions of your description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateVersion('prev')}
                  disabled={currentVersionIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentVersionIndex + 1} of {descriptionVersions.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateVersion('next')}
                  disabled={currentVersionIndex === descriptionVersions.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(false)}
              >
                Close
              </Button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {descriptionVersions.map((version, index) => (
                <div
                  key={version.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    index === currentVersionIndex
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => restoreVersion(index)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-sm">
                          Version {index + 1}
                          {index === 0 && ' (Original)'}
                        </h4>
                        {index === currentVersionIndex && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {version.timestamp.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        <strong>Prompt:</strong> {version.userPrompt}
                      </p>
                      {version.changes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {version.changes.map((change, changeIndex) => (
                            <Badge key={changeIndex} variant="outline" className="text-xs">
                              {change}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {version.description.replace(/<[^>]*>/g, '').substring(0, 100)}...
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
