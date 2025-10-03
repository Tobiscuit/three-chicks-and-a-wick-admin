'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { AIContentDisplay } from '@/components/ai-content-display';
import { isHtmlContent, getAIContentClassName, formatHtmlForEditing } from '@/lib/ai-content-utils';
import { 
  rewriteDescriptionAction, 
  loadDescriptionHistoryAction, 
  saveDescriptionHistoryAction,
  addDescriptionVersionAction 
} from '@/app/products/actions';
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

interface SynchronizedEditorProps {
  initialContent: string;
  onContentChange: (content: string) => void;
  productId?: string;
  productName?: string;
  imageAnalysis?: string;
  placeholder?: string;
}

export function SynchronizedEditor({ 
  initialContent, 
  onContentChange, 
  productId, 
  productName, 
  imageAnalysis,
  placeholder = "Start typing your product description..."
}: SynchronizedEditorProps) {
  // Single source of truth for content
  const [content, setContent] = useState(initialContent);
  const [descriptionVersions, setDescriptionVersions] = useState<DescriptionVersion[]>([
    {
      id: 'initial',
      description: initialContent,
      userPrompt: 'Initial content',
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
  const { toast } = useToast();
  const isInitialized = useRef(false);

  // === DEBUGGING LOGS ===
  console.log('[SynchronizedEditor] Render:', {
    initialContent: initialContent?.substring(0, 100) + '...',
    content: content?.substring(0, 100) + '...',
    contentLength: content?.length || 0,
    isInitialized: isInitialized.current,
    hasUnsavedChanges,
    productId,
    productName
  });

  // Sync content changes to parent component
  const stableOnContentChange = useCallback(onContentChange, []);
  useEffect(() => {
    stableOnContentChange(content);
  }, [content, stableOnContentChange]);

  // Initialize content on first load only
  useEffect(() => {
    console.log('[SynchronizedEditor] Mount effect:', {
      isInitialized: isInitialized.current,
      initialContent: initialContent?.substring(0, 100) + '...',
      initialContentLength: initialContent?.length || 0
    });
    
    if (!isInitialized.current) {
      isInitialized.current = true;
      console.log('[SynchronizedEditor] Setting initial content:', initialContent?.substring(0, 100) + '...');
      setContent(initialContent);
      // Update the initial version
      setDescriptionVersions(prev => [{
        id: 'initial',
        description: initialContent,
        userPrompt: 'Initial content',
        reasoning: 'Initial product description',
        changes: [],
        timestamp: new Date()
      }, ...prev.slice(1)]);
      setCurrentVersionIndex(0);
    }
  }, []); // Empty dependency array - only run once on mount

  // Handle initialContent changes after mount (e.g., when AI data loads)
  useEffect(() => {
    console.log('[SynchronizedEditor] InitialContent change effect:', {
      isInitialized: isInitialized.current,
      initialContent: initialContent?.substring(0, 100) + '...',
      currentContent: content?.substring(0, 100) + '...',
      hasUnsavedChanges,
      willUpdate: isInitialized.current && initialContent && initialContent !== content && !hasUnsavedChanges
    });
    
    if (isInitialized.current && initialContent && initialContent !== content && !hasUnsavedChanges) {
      console.log('[SynchronizedEditor] Updating content from initialContent change:', initialContent?.substring(0, 100) + '...');
      setContent(initialContent);
      // Update the initial version
      setDescriptionVersions(prev => [{
        id: 'initial',
        description: initialContent,
        userPrompt: 'Initial content',
        reasoning: 'Initial product description',
        changes: [],
        timestamp: new Date()
      }, ...prev.slice(1)]);
      setCurrentVersionIndex(0);
    }
  }, [initialContent, content, hasUnsavedChanges]);

  // Load description history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!productId) {
        console.log('[SynchronizedEditor] No productId, skipping history load (new product)');
        return;
      }

      console.log('[SynchronizedEditor] Loading history for productId:', productId);
      setIsLoadingHistory(true);
      try {
        const result = await loadDescriptionHistoryAction(productId);
        console.log('[SynchronizedEditor] History load result:', {
          success: result.success,
          versionsCount: result.versions?.length || 0
        });
        
        if (result.success && result.versions && result.versions.length > 0) {
          const versions = result.versions.map((version: any) => ({
            ...version,
            timestamp: new Date(version.timestamp)
          }));
          console.log('[SynchronizedEditor] Loaded', versions.length, 'versions from history');
          setDescriptionVersions(versions);
        } else {
          console.log('[SynchronizedEditor] No history found, using initial version');
        }
      } catch (error) {
        console.error('[SynchronizedEditor] Failed to load description history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [productId]);

  // Handle content changes from rich text editor
  const handleContentChange = (newContent: string) => {
    console.log('[SynchronizedEditor] Manual editor content change:', {
      oldContent: content?.substring(0, 100) + '...',
      newContent: newContent?.substring(0, 100) + '...',
      oldLength: content?.length || 0,
      newLength: newContent?.length || 0
    });
    setContent(newContent);
    setHasUnsavedChanges(true);
  };

  // Handle AI rewriting
  const handleRewrite = async () => {
    if (!userPrompt.trim()) {
      toast({
        variant: "destructive",
        title: "Prompt Required",
        description: "Please enter a prompt for the AI rewriter."
      });
      return;
    }

    setIsRewriting(true);
    try {
      const result = await rewriteDescriptionAction({
        originalDescription: content,
        userPrompt,
        productContext: {
          name: productName || 'Product',
          imageAnalysis: imageAnalysis || '',
          brandGuidelines: undefined
        }
      });

      if (result.success && result.result) {
        // Extract title and description from AI response
        const { title, description } = extractTitleAndDescription(result.result.reengineeredDescription);
        
        const newVersion: DescriptionVersion = {
          id: Date.now().toString(),
          description: description, // Use only the description part, without title
          userPrompt,
          reasoning: result.result.reasoning,
          changes: result.result.changes,
          timestamp: new Date()
        };

        // Add new version and update content
        setDescriptionVersions(prev => [newVersion, ...prev]);
        setCurrentVersionIndex(0);
        setContent(description); // Use only the description part
        setUserPrompt('');
        setHasUnsavedChanges(false);

        // Save to history
        if (productId) {
          await addDescriptionVersionAction(productId, newVersion);
        }

        const toastMessage = title 
          ? `✨ Description Enhanced (Title: "${title}")`
          : "✨ Description Enhanced";

        toast({
          title: toastMessage,
          description: "AI has successfully re-engineered your description."
        });
      } else {
        throw new Error(result.error || 'Failed to rewrite description');
      }
    } catch (error: any) {
      console.error('Rewrite failed:', error);
      toast({
        variant: "destructive",
        title: "Rewrite Failed",
        description: error.message || 'Failed to rewrite description. Please try again.'
      });
    } finally {
      setIsRewriting(false);
    }
  };

  const switchVersion = (versionIndex: number) => {
    setCurrentVersionIndex(versionIndex);
    setContent(descriptionVersions[versionIndex].description);
    // Don't close history panel - let user browse versions
    setHasUnsavedChanges(false);
  };

  const resetToOriginal = () => {
    setCurrentVersionIndex(0);
    setContent(descriptionVersions[0].description);
    setShowHistory(false);
    setHasUnsavedChanges(false);
    toast({
      title: "🔄 Reset to Original",
      description: "Restored the original description."
    });
  };

  // Extract title from AI response if it exists
  const extractTitleAndDescription = useCallback((aiResponse: string) => {
    // Check if the response contains an h1 or h2 tag
    const titleMatch = aiResponse.match(/<h[12][^>]*>(.*?)<\/h[12]>\s*/i);
    if (titleMatch) {
      const title = titleMatch[1];
      const description = aiResponse.replace(/<h[12][^>]*>.*?<\/h[12]>\s*/i, '');
      return { title, description };
    }
    return { title: null, description: aiResponse };
  }, []);

  return (
    <div className="space-y-6">
      {/* Rich Text Editor (Top) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Manual Editor</CardTitle>
          <CardDescription>
            Type and format your product description using the rich text editor below.
          </CardDescription>
        </CardHeader>
        <CardContent>
                   <RichTextEditor
                     content={content}
                     onChange={handleContentChange}
                     placeholder={placeholder}
                   />
                   {/* Debug info */}
                   <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                     <strong>Debug:</strong> Content length: {content?.length || 0} chars
                     {content && <div className="mt-1">Content preview: {content.substring(0, 50)}...</div>}
                   </div>
          {hasUnsavedChanges && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>You have unsaved changes</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Rewriter (Bottom) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Rewriter
              </CardTitle>
              <CardDescription>
                Enhanced view of your content with AI rewriting capabilities.
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
                <p className="text-sm text-muted-foreground">Loading history...</p>
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
              {/* Enhanced Content Display */}
              {isHtmlContent(content) ? (
                <AIContentDisplay 
                  content={content} 
                  className={getAIContentClassName('details')}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{content}</p>
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

              {/* AI Rewrite Input */}
              <div className="border-t pt-4 space-y-3">
                <div>
                  <label className="text-sm font-medium">How would you like to enhance this description?</label>
                  <textarea
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    placeholder="e.g., Make it more luxurious, add sensory details, focus on the scent..."
                    className="mt-1 w-full px-3 py-2 border border-input bg-background text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleRewrite}
                  disabled={isRewriting || !userPrompt.trim()}
                  className="w-full"
                >
                  {isRewriting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Rewriting...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Rewrite with AI
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Version History */}
          {showHistory && (
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium mb-3">Version History</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {descriptionVersions.map((version, index) => (
                  <div
                    key={version.id}
                    onClick={() => switchVersion(index)}
                    className={`p-3 rounded-md border cursor-pointer transition-colors ${
                      index === currentVersionIndex
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {index === currentVersionIndex && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                        <span className="text-sm font-medium">
                          Version {descriptionVersions.length - index}
                        </span>
                        {index === 0 && hasUnsavedChanges && (
                          <Badge variant="outline" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {version.timestamp.toLocaleDateString()}
                      </span>
                    </div>
                    {version.userPrompt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        "{version.userPrompt}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
